import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDb } from './db.js';
import { seedDatabase } from './seed.js';
import {
  sendTelegramMessage,
  sendOrderAccepted,
  sendOrderCompleted
} from './telegram.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

const rawOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || rawOrigins.includes('*') || rawOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS blocked'));
  },
  credentials: true
}));

app.use(express.json());

const db = await initDb();
await seedDatabase(db);

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

function productToJson(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    old_price: p.old_price,
    sizes: parseCsv(p.sizes),
    colors: parseCsv(p.colors),
    image: p.image,
    description: p.description,
    stock: p.stock
  };
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Token талап кылынат' });
  }

  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ detail: 'Token жараксыз' });
  }
}

function adminRequired(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ detail: 'Админ гана кире алат' });
  }
  next();
}

app.get('/', (req, res) => {
  res.json({ message: 'Node backend + Telegram иштеп жатат' });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/auth/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body ?? {};

    if (!full_name || !email || !password) {
      return res.status(400).json({ detail: 'Бардык талааларды толтуруңуз' });
    }

    const exists = await db.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (exists) {
      return res.status(400).json({ detail: 'Бул email мурунтан бар' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await db.run(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [full_name, email, password_hash, 'user']
    );

    res.json({ message: 'Катталдыңыз' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Каттоо учурунда ката кетти' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    const user = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({ detail: 'Email же пароль туура эмес' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ detail: 'Email же пароль туура эмес' });
    }

    const token = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      },
      JWT_SECRET,
      { expiresIn: '72h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Кирүүдө ката кетти' });
  }
});

app.get('/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND LOWER(category) = LOWER(?)';
      params.push(category);
    }

    if (search) {
      sql += ' AND (LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY id DESC';

    const rows = await db.all(sql, params);
    res.json(rows.map(productToJson));
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Товарларды алуу мүмкүн болбоду' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const row = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!row) {
      return res.status(404).json({ detail: 'Товар табылган жок' });
    }

    res.json(productToJson(row));
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Товарды алуу мүмкүн болбоду' });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT DISTINCT category FROM products ORDER BY category ASC'
    );
    res.json(rows.map(r => r.category));
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Категорияларды алуу мүмкүн болбоду' });
  }
});

app.get('/payment-methods', (req, res) => {
  res.json(['Накталай', 'Мбанк', 'О!Деньги', 'Элкарт/Карта']);
});

app.post('/orders', async (req, res) => {
  try {
    const { customer_name, phone, address, payment_method, items } = req.body ?? {};

    if (!customer_name || !phone || !address || !payment_method) {
      return res.status(400).json({ detail: 'Бардык талааларды толтуруңуз' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ detail: 'Корзина бош' });
    }

    let total = 0;
    const prepared = [];

    for (const item of items) {
      const p = await db.get(
        'SELECT * FROM products WHERE id = ?',
        [item.product_id]
      );

      if (!p) {
        return res.status(404).json({ detail: `Товар жок: ${item.product_id}` });
      }

      if (!parseCsv(p.sizes).includes(item.size)) {
        return res.status(400).json({ detail: `Өлчөм туура эмес: ${item.size}` });
      }

      if (!parseCsv(p.colors).includes(item.color)) {
        return res.status(400).json({ detail: `Түс туура эмес: ${item.color}` });
      }

      if (Number(item.qty) < 1) {
        return res.status(400).json({ detail: 'Саны 1ден аз болбошу керек' });
      }

      if (Number(item.qty) > Number(p.stock)) {
        return res.status(400).json({ detail: `Складда жетишсиз: ${p.name}` });
      }

      const subtotal = Number(p.price) * Number(item.qty);
      total += subtotal;
      prepared.push({ p, item, subtotal });
    }

    const result = await db.run(
      'INSERT INTO orders (customer_name, phone, address, payment_method, total, status) VALUES (?, ?, ?, ?, ?, ?)',
      [customer_name, phone, address, payment_method, total, 'new']
    );

    const orderId = result.lastID;

    for (const row of prepared) {
      await db.run(
        'INSERT INTO order_items (order_id, product_id, product_name, qty, size, color, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          orderId,
          row.p.id,
          row.p.name,
          row.item.qty,
          row.item.size,
          row.item.color,
          row.p.price,
          row.subtotal
        ]
      );

      await db.run(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [row.item.qty, row.p.id]
      );
    }

    try {
      await sendOrderAccepted({
        orderId,
        customerName: customer_name,
        phone,
        address,
        payment_method,
        items: prepared.map(row => ({
          name: row.p.name,
          qty: row.item.qty,
          size: row.item.size,
          color: row.item.color,
          price: row.p.price,
          subtotal: row.subtotal
        })),
        total
      });
    } catch (e) {
      console.error('Telegram send error:', e.message);
    }

    res.json({
      message: 'Заказ кабыл алынды',
      order_id: orderId,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Сервер катасы' });
  }
});

app.get('/orders/by-phone/:phone', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM orders WHERE phone = ? ORDER BY id DESC',
      [req.params.phone]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Заказдарды алуу мүмкүн болбоду' });
  }
});

app.patch('/orders/:id/cancel', async (req, res) => {
  try {
    const order = await db.get(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );

    if (!order) {
      return res.status(404).json({ detail: 'Заказ табылган жок' });
    }

    if (!['new', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ detail: 'Бул заказды отмена кылууга болбойт' });
    }

    await db.run(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['cancelled', req.params.id]
    );

    const items = await db.all(
      'SELECT * FROM order_items WHERE order_id = ?',
      [req.params.id]
    );

    for (const item of items) {
      await db.run(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.qty, item.product_id]
      );
    }

    try {
      await sendTelegramMessage(`❌ Заказ №${req.params.id} клиент тарабынан отмена болду`);
    } catch (e) {
      console.error('Telegram cancel send error:', e.message);
    }

    res.json({ message: 'Заказ отмена болду' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Отмена учурунда ката кетти' });
  }
});

app.get('/admin/stats', authRequired, adminRequired, async (req, res) => {
  try {
    const products = await db.get('SELECT COUNT(*) as count FROM products');
    const orders = await db.get('SELECT COUNT(*) as count FROM orders');
    const users = await db.get('SELECT COUNT(*) as count FROM users');
    const revenue = await db.get('SELECT COALESCE(SUM(total), 0) as total FROM orders');

    res.json({
      products_count: products.count,
      orders_count: orders.count,
      users_count: users.count,
      revenue: revenue.total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Статистиканы алуу мүмкүн болбоду' });
  }
});

app.get('/admin/orders', authRequired, adminRequired, async (req, res) => {
  try {
    const orders = await db.all('SELECT * FROM orders ORDER BY id DESC');
    const result = [];

    for (const order of orders) {
      const items = await db.all(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );

      result.push({
        id: order.id,
        customer_name: order.customer_name,
        phone: order.phone,
        address: order.address,
        payment_method: order.payment_method,
        status: order.status,
        total: order.total,
        items: items.map(i => ({
          product_name: i.product_name,
          qty: i.qty,
          size: i.size,
          color: i.color,
          subtotal: i.subtotal
        }))
      });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Заказдарды алуу мүмкүн болбоду' });
  }
});

app.patch('/admin/orders/:id/status', authRequired, adminRequired, async (req, res) => {
  try {
    const { status } = req.body ?? {};

    if (!status) {
      return res.status(400).json({ detail: 'Статус жок' });
    }

    await db.run(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    if (status === 'completed') {
      try {
        await sendOrderCompleted(req.params.id);
      } catch (e) {
        console.error('Telegram complete send error:', e.message);
      }
    }

    res.json({ message: 'Статус жаңыртылды' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Статусту жаңыртуу мүмкүн болбоду' });
  }
});

app.post('/admin/products', authRequired, adminRequired, async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      old_price = 0,
      sizes = [],
      colors = [],
      image = '',
      description = '',
      stock = 0
    } = req.body ?? {};

    if (!name || !category) {
      return res.status(400).json({ detail: 'Товар маалыматын толук жазыңыз' });
    }

    const result = await db.run(
      'INSERT INTO products (name, category, price, old_price, sizes, colors, image, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        category,
        price,
        old_price,
        sizes.join(','),
        colors.join(','),
        image,
        description,
        stock
      ]
    );

    const p = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [result.lastID]
    );

    res.json(productToJson(p));
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Товар кошуу мүмкүн болбоду' });
  }
});

app.use((err, req, res, next) => {
  if (err.message === 'CORS blocked') {
    return res.status(403).json({ detail: 'CORS blocked' });
  }
  console.error(err);
  res.status(500).json({ detail: 'Ички сервер катасы' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));