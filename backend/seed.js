import bcrypt from 'bcryptjs';

export async function seedDatabase(db) {
  const productCount = await db.get('SELECT COUNT(*) as count FROM products');

  if (productCount.count === 0) {
    const items = [
      { name:'Urban футболка', category:'Футболка', price:1200, old_price:1500, sizes:'S,M,L,XL', colors:'Ак,Кара,Көк', image:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80', description:'Күндөлүк стилдеги сапаттуу футболка.', stock:25 },
      { name:'Classic шым', category:'Шым', price:2400, old_price:2800, sizes:'30,32,34,36', colors:'Кара,Боз', image:'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80', description:'Классика жана ыңгайлуулук.', stock:18 },
      { name:'Street обувь', category:'Обувь', price:3900, old_price:4500, sizes:'40,41,42,43', colors:'Ак,Кара', image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', description:'Заманбап спорттук обувь.', stock:12 },
      { name:'Premium саат', category:'Аксессуар', price:2100, old_price:2500, sizes:'One Size', colors:'Күмүш,Кара', image:'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80', description:'Стильдүү аксессуар.', stock:14 },
      { name:'Oversize футболка', category:'Футболка', price:1450, old_price:1750, sizes:'M,L,XL', colors:'Кара,Кызыл,Жашыл', image:'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80', description:'Жаштар стилиндеги oversize модель.', stock:22 },
      { name:'Cargo шым', category:'Шым', price:2850, old_price:3300, sizes:'30,32,34,36', colors:'Хаки,Кара', image:'https://images.unsplash.com/photo-1506629905607-c60c2fb1b9b7?auto=format&fit=crop&w=900&q=80', description:'Көп чөнтөктүү модалуу cargo шым.', stock:16 },
      { name:'Runner обувь', category:'Обувь', price:4200, old_price:4900, sizes:'40,41,42,43,44', colors:'Ак,Көк,Кара', image:'https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=900&q=80', description:'Жеңил жана ыңгайлуу runner обувь.', stock:15 },
      { name:'Backpack Pro', category:'Аксессуар', price:2600, old_price:3100, sizes:'One Size', colors:'Кара,Көк', image:'https://images.unsplash.com/photo-1542291026-153c426f1f54?auto=format&fit=crop&w=900&q=80', description:'Окууга жана жолго ыңгайлуу рюкзак.', stock:10 },
      { name:'Cap Street', category:'Аксессуар', price:950, old_price:1200, sizes:'One Size', colors:'Кара,Ак,Боз', image:'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80', description:'Күнүмдүк стиль үчүн кепка.', stock:30 },
      { name:'Leather Belt', category:'Аксессуар', price:1100, old_price:1400, sizes:'M,L,XL', colors:'Кара,Күрөң', image:'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80', description:'Сапаттуу булгаары кур.', stock:18 }
    ];

    for (const item of items) {
      await db.run(
        `INSERT INTO products (name, category, price, old_price, sizes, colors, image, description, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.name, item.category, item.price, item.old_price, item.sizes, item.colors, item.image, item.description, item.stock]
      );
    }
  }

  const admin = await db.get('SELECT * FROM users WHERE email = ?', ['admin@shop.local']);
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.run(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Admin', 'admin@shop.local', hash, 'admin']
    );
  }
}
