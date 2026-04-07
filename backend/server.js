import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { initDb } from "./db.js";
import { seedDatabase } from "./seed.js";
import { sendTelegramMessage } from "./telegram.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

const rawOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (rawOrigins.includes("*") || rawOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked"));
    },
    credentials: true
  })
);

app.use(express.json());

const db = await initDb();
await seedDatabase(db);

await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

await db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const adminEmail = "admin@shop.local";
const adminPassword = "admin123";

const existingAdmin = await db.get(
  `SELECT * FROM users WHERE email = ?`,
  [adminEmail]
);

if (!existingAdmin) {
  const hashed = await bcrypt.hash(adminPassword, 10);
  await db.run(
    `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    ["Admin", adminEmail, hashed, "admin"]
  );
  console.log("Default admin created: admin@shop.local / admin123");
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Токен жок" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Токен жараксыз" });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Уруксат жок" });
  }
  next();
}

app.get("/", (req, res) => {
  res.json({ message: "Node backend + Telegram иштеп жатат" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/categories", async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT DISTINCT category FROM products ORDER BY category ASC`
    );
    res.json(rows.map((r) => r.category));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Категорияларды алуу мүмкүн болбоду" });
  }
});

app.get("/payment-methods", (req, res) => {
  res.json([
    { id: "cash", name: "Накталай" },
    { id: "mbank", name: "MBank" },
    { id: "optima", name: "Optima Bank" },
    { id: "elsom", name: "Элсом" }
  ]);
});

app.get("/products", async (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = `SELECT * FROM products WHERE 1=1`;
    const params = [];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    if (search) {
      sql += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY id DESC`;

    const rows = await db.all(sql, params);

    const products = rows.map((row) => ({
      ...row,
      sizes: JSON.parse(row.sizes || "[]"),
      colors: JSON.parse(row.colors || "[]")
    }));

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Товарларды алуу мүмкүн болбоду" });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const row = await db.get(
      `SELECT * FROM products WHERE id = ?`,
      [req.params.id]
    );

    if (!row) {
      return res.status(404).json({ message: "Товар табылган жок" });
    }

    const product = {
      ...row,
      sizes: JSON.parse(row.sizes || "[]"),
      colors: JSON.parse(row.colors || "[]")
    };

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Товарды алуу мүмкүн болбоду" });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Бардык талааларды толтур" });
    }

    const existing = await db.get(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );

    if (existing) {
      return res.status(400).json({ message: "Бул email буга чейин катталган" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.run(
      `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, "user"]
    );

    const user = {
      id: result.lastID,
      name,
      email,
      role: "user"
    };

    const token = createToken(user);

    res.json({
      message: "Каттоо ийгиликтүү болду",
      token,
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Каттоо учурунда ката кетти" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.get(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );

    if (!user) {
      return res.status(400).json({ message: "Колдонуучу табылган жок" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Сырсөз туура эмес" });
    }

    const token = createToken(user);

    res.json({
      message: "Кирүү ийгиликтүү",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Кирүүдө ката кетти" });
  }
});

app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await db.get(
      `SELECT id, name, email, role, created_at FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ message: "Колдонуучу табылган жок" });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Колдонуучуну алуу мүмкүн болбоду" });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const { customerName, phone, address, items, total } = req.body;

    if (!customerName || !phone || !address || !items || !items.length) {
      return res.status(400).json({ message: "Маалымат толук эмес" });
    }

    const result = await db.run(
      `INSERT INTO orders (customer_name, phone, address, items, total)
       VALUES (?, ?, ?, ?, ?)`,
      [customerName, phone, address, JSON.stringify(items), total]
    );

    const orderId = result.lastID;

    const itemsText = items
      .map((item, index) => {
        return `${index + 1}) ${item.name} x${item.qty} - ${item.price} сом`;
      })
      .join("\n");

    const text = `
🛒 Жаңы заказ!
Заказ №: ${orderId}

👤 Аты: ${customerName}
📞 Тел: ${phone}
📍 Дарек: ${address}

📦 Товарлар:
${itemsText}

💰 Жалпы сумма: ${total} сом
    `.trim();

    try {
      await sendTelegramMessage(text);
    } catch (e) {
      console.error("Telegram send error:", e.message);
    }

    res.json({
      message: "Заказ ийгиликтүү кабыл алынды",
      orderId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Сервер катасы" });
  }
});

app.get("/orders", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT * FROM orders ORDER BY created_at DESC`
    );

    const orders = rows.map((row) => ({
      ...row,
      items: JSON.parse(row.items || "[]")
    }));

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Заказдарды алуу мүмкүн болбоду" });
  }
});

app.patch("/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Статус жок" });
    }

    await db.run(
      `UPDATE orders SET status = ? WHERE id = ?`,
      [status, req.params.id]
    );

    res.json({ message: "Статус жаңыртылды" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Статусту жаңыртуу мүмкүн болбоду" });
  }
});

app.get("/admin/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const productsCount = await db.get(`SELECT COUNT(*) as count FROM products`);
    const ordersCount = await db.get(`SELECT COUNT(*) as count FROM orders`);
    const usersCount = await db.get(`SELECT COUNT(*) as count FROM users`);
    const revenue = await db.get(`SELECT COALESCE(SUM(total), 0) as total FROM orders`);

    res.json({
      products: productsCount.count,
      orders: ordersCount.count,
      users: usersCount.count,
      revenue: revenue.total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Статистиканы алуу мүмкүн болбоду" });
  }
});

app.use((err, req, res, next) => {
  if (err.message === "CORS blocked") {
    return res.status(403).json({ message: "CORS blocked" });
  }
  console.error(err);
  res.status(500).json({ message: "Ички сервер катасы" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});