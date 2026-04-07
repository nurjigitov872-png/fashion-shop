export const products = [
  {
    id: 1,
    name: "Nike футболка",
    category: "Футболка",
    price: 1500,
    oldPrice: 1800,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    description: "Жеңил, сапаттуу күнүмдүк футболка",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Ак", "Кара", "Боз"],
    stock: 20
  },
  {
    id: 2,
    name: "Oversize футболка",
    category: "Футболка",
    price: 1700,
    oldPrice: 2100,
    image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=800&q=80",
    description: "Стильдүү oversize модель",
    sizes: ["M", "L", "XL"],
    colors: ["Кара", "Ак"],
    stock: 15
  },
  {
    id: 3,
    name: "Classic джинсы",
    category: "Шым",
    price: 2800,
    oldPrice: 3200,
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80",
    description: "Күнүмдүк кийүүгө ыңгайлуу джинсы",
    sizes: ["30", "32", "34", "36"],
    colors: ["Көк", "Кара"],
    stock: 12
  },
  {
    id: 4,
    name: "Спорт шым",
    category: "Шым",
    price: 2200,
    oldPrice: 2500,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
    description: "Жумшак жана ыңгайлуу спорт шым",
    sizes: ["M", "L", "XL"],
    colors: ["Боз", "Кара"],
    stock: 18
  },
  {
    id: 5,
    name: "Nike Air кроссовка",
    category: "Обувь",
    price: 4500,
    oldPrice: 5200,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    description: "Стильдүү жана жеңил кроссовка",
    sizes: ["40", "41", "42", "43", "44"],
    colors: ["Ак", "Кара"],
    stock: 10
  },
  {
    id: 6,
    name: "Urban кеды",
    category: "Обувь",
    price: 3900,
    oldPrice: 4300,
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80",
    description: "Шаар стилин сүйгөндөр үчүн",
    sizes: ["39", "40", "41", "42", "43"],
    colors: ["Ак", "Беж"],
    stock: 14
  },
  {
    id: 7,
    name: "Кепка",
    category: "Аксессуар",
    price: 900,
    oldPrice: 1200,
    image: "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=800&q=80",
    description: "Жайкы стиль үчүн кепка",
    sizes: ["Universal"],
    colors: ["Кара", "Ак", "Көк"],
    stock: 25
  },
  {
    id: 8,
    name: "Сумка",
    category: "Аксессуар",
    price: 1900,
    oldPrice: 2300,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
    description: "Күнүмдүк колдонууга ыңгайлуу сумка",
    sizes: ["Universal"],
    colors: ["Кара", "Күрөң"],
    stock: 9
  },
  {
    id: 9,
    name: "Adidas футболка",
    category: "Футболка",
    price: 1600,
    oldPrice: 1900,
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
    description: "Спорттук жана күнүмдүк стилге ылайыктуу",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Ак", "Кара"],
    stock: 17
  },
  {
    id: 10,
    name: "Cargo шым",
    category: "Шым",
    price: 3000,
    oldPrice: 3500,
    image: "https://images.unsplash.com/photo-1506629905607-d9d6b5d0f53a?auto=format&fit=crop&w=800&q=80",
    description: "Көп чөнтөктүү заманбап cargo шым",
    sizes: ["30", "32", "34", "36"],
    colors: ["Хаки", "Кара"],
    stock: 11
  },
  {
    id: 11,
    name: "Running кроссовка",
    category: "Обувь",
    price: 4800,
    oldPrice: 5400,
    image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80",
    description: "Жүгүрүүгө жана күнүмдүк кийүүгө жакшы",
    sizes: ["40", "41", "42", "43", "44"],
    colors: ["Көк", "Ак"],
    stock: 8
  },
  {
    id: 12,
    name: "Саат",
    category: "Аксессуар",
    price: 2500,
    oldPrice: 2900,
    image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80",
    description: "Стильдүү аксессуар, белекке да ылайыктуу",
    sizes: ["Universal"],
    colors: ["Кара", "Күмүш"],
    stock: 13
  }
];

export async function seedDatabase(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      oldPrice REAL,
      image TEXT,
      description TEXT,
      sizes TEXT,
      colors TEXT,
      stock INTEGER DEFAULT 0
    );
  `);

  await db.exec(`DELETE FROM products`);

  for (const p of products) {
    await db.run(
      `
      INSERT INTO products (
        id,
        name,
        category,
        price,
        oldPrice,
        image,
        description,
        sizes,
        colors,
        stock
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        p.id,
        p.name,
        p.category,
        p.price,
        p.oldPrice,
        p.image,
        p.description,
        JSON.stringify(p.sizes || []),
        JSON.stringify(p.colors || []),
        p.stock || 0
      ]
    );
  }

  console.log("Products seeded successfully");
}