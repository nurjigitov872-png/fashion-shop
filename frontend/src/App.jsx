import React, { useEffect, useMemo, useState } from 'react'
import { API } from './config'

function ProductCard({ product, onAdd }) {
  const [size, setSize] = useState(product.sizes[0] || '')
  const [color, setColor] = useState(product.colors[0] || '')
  const [qty, setQty] = useState(1)

  return (
    <div className="card">
      <img src={product.image} alt={product.name} />
      <div className="card-body">
        <div className="category">{product.category}</div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div><span className="price">{Math.round(product.price)} сом</span> <span className="old">{Math.round(product.old_price)} сом</span></div>
        <div className="meta">Размер: {product.sizes.join(', ')}</div>
        <div className="meta">Түс: {product.colors.join(', ')}</div>
        <div className="meta">Склад: {product.stock}</div>
        <select className="selector" value={size} onChange={(e) => setSize(e.target.value)}>
          {product.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="selector" value={color} onChange={(e) => setColor(e.target.value)}>
          {product.colors.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="buy-row">
          <input className="qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          <button onClick={() => onAdd(product, size, color, qty)}>Корзинага</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [view, setView] = useState('catalog')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('fashion_cart_full_tg') || '[]'))
  const [token, setToken] = useState(localStorage.getItem('fashion_token_full_tg') || '')
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('fashion_user_full_tg') || 'null'))
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [regMsg, setRegMsg] = useState('')
  const [loginMsg, setLoginMsg] = useState('')
  const [adminMsg, setAdminMsg] = useState('')
  const [checkoutMsg, setCheckoutMsg] = useState('')
  const [registerForm, setRegisterForm] = useState({ full_name:'', email:'', password:'' })
  const [loginForm, setLoginForm] = useState({ email:'', password:'' })
  const [checkoutForm, setCheckoutForm] = useState({ customer_name:'', phone:'', address:'', payment_method:'' })
  const [productForm, setProductForm] = useState({ name:'', category:'', price:'', old_price:'', sizes:'', colors:'', image:'', description:'', stock:'' })

  useEffect(() => { loadInitial() }, [])
  useEffect(() => localStorage.setItem('fashion_cart_full_tg', JSON.stringify(cart)), [cart])
  useEffect(() => localStorage.setItem('fashion_token_full_tg', token), [token])
  useEffect(() => localStorage.setItem('fashion_user_full_tg', JSON.stringify(user)), [user])

  async function request(path, options = {}) {
    const res = await fetch(`${API}${path}`, options)
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Сурам ишке ашкан жок')
    return data
  }

  async function loadInitial() {
    const [p, c, pay] = await Promise.all([request('/products'), request('/categories'), request('/payment-methods')])
    setProducts(p)
    setCategories(c)
    setPaymentMethods(pay)
    setCheckoutForm((prev) => ({ ...prev, payment_method: pay[0] || '' }))
    if (user?.role === 'admin' && token) loadAdmin(token)
  }

  async function loadAdmin(currentToken = token) {
    try {
      const headers = { Authorization: `Bearer ${currentToken}` }
      const [s, o] = await Promise.all([request('/admin/stats', { headers }), request('/admin/orders', { headers })])
      setStats(s)
      setOrders(o)
    } catch {
      setStats(null)
      setOrders([])
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const a = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
      const b = category ? p.category === category : true
      return a && b
    })
  }, [products, search, category])

  function addToCart(product, size, color, qty) {
    const count = Number(qty) || 1
    setCart((prev) => {
      const found = prev.find((i) => i.product_id === product.id && i.size === size && i.color === color)
      if (found) return prev.map((i) => i === found ? { ...i, qty: i.qty + count } : i)
      return [...prev, { product_id: product.id, name: product.name, price: product.price, size, color, qty: count }]
    })
    setCartOpen(true)
  }

  function removeCartItem(index) {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  async function registerUser(e) {
    e.preventDefault()
    try {
      const data = await request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      })
      setRegMsg(data.message)
    } catch (err) {
      setRegMsg(err.message)
    }
  }

  async function loginUser(e) {
    e.preventDefault()
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      setToken(data.token)
      setUser(data.user)
      setLoginMsg(`Кирдиңиз: ${data.user.full_name} (${data.user.role})`)
      if (data.user.role === 'admin') loadAdmin(data.token)
    } catch (err) {
      setLoginMsg(err.message)
    }
  }

  async function submitOrder(e) {
    e.preventDefault()
    if (!cart.length) return setCheckoutMsg('Корзина бош.')
    try {
      const data = await request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...checkoutForm,
          items: cart.map((i) => ({ product_id: i.product_id, qty: i.qty, size: i.size, color: i.color }))
        })
      })
      setCheckoutMsg(`Заказ кабыл алынды. №${data.order_id} | ${Math.round(data.total)} сом`)
      setCart([])
      setProducts(await request('/products'))
      if (user?.role === 'admin' && token) loadAdmin()
    } catch (err) {
      setCheckoutMsg(err.message)
    }
  }

  async function createProduct(e) {
    e.preventDefault()
    try {
      await request('/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: productForm.name,
          category: productForm.category,
          price: Number(productForm.price),
          old_price: Number(productForm.old_price),
          sizes: productForm.sizes.split(',').map((s) => s.trim()).filter(Boolean),
          colors: productForm.colors.split(',').map((s) => s.trim()).filter(Boolean),
          image: productForm.image,
          description: productForm.description,
          stock: Number(productForm.stock)
        })
      })
      setAdminMsg('Товар кошулду')
      setProductForm({ name:'', category:'', price:'', old_price:'', sizes:'', colors:'', image:'', description:'', stock:'' })
      setProducts(await request('/products'))
      loadAdmin()
    } catch (err) {
      setAdminMsg(err.message)
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  return (
    <div>
      <header className="hero">
        <nav className="nav">
          <div className="logo">Fashion Shop Telegram</div>
          <div className="nav-actions">
            <button className="ghost" onClick={() => setView('catalog')}>Каталог</button>
            <button className="ghost" onClick={() => setView('auth')}>Login/Register</button>
            <button className="ghost" onClick={() => { setView('admin'); loadAdmin() }}>Admin</button>
            <button onClick={() => setCartOpen(true)}>🛒 Корзина <span>{cartCount}</span></button>
          </div>
        </nav>
        <div className="hero-content">
          <span className="badge">full + telegram</span>
          <h1>Дерзкий магазин + Telegram бот</h1>
          <p>Магазин, админка, корзина, заказ жана Telegram’га автомат билдирүү кошулду.</p>
        </div>
      </header>

      <main className="container">
        {view === 'catalog' && <>
          <div className="toolbar">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Издөө..." />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Бардык категория</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}</div>
        </>}

        {view === 'auth' && <section className="two-col">
          <div className="panel">
            <h2>Register</h2>
            <form onSubmit={registerUser}>
              <input placeholder="Атыңыз" value={registerForm.full_name} onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })} required />
              <input type="email" placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} required />
              <input type="password" placeholder="Пароль" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} required />
              <button type="submit">Катталуу</button>
            </form>
            <div className="msg">{regMsg}</div>
          </div>

          <div className="panel">
            <h2>Login</h2>
            <form onSubmit={loginUser}>
              <input type="email" placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
              <input type="password" placeholder="Пароль" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              <button type="submit">Кирүү</button>
            </form>
            <p className="small">Admin login: admin@shop.local / admin123</p>
            <div className="msg">{loginMsg}</div>
          </div>
        </section>}

        {view === 'admin' && <section>
          <div className="two-col">
            <div className="panel">
              <h2>Admin Stats</h2>
              <div className="stats">
                {stats ? <>
                  <div className="stat">Товарлар<b>{stats.products_count}</b></div>
                  <div className="stat">Заказдар<b>{stats.orders_count}</b></div>
                  <div className="stat">Колдонуучулар<b>{stats.users_count}</b></div>
                  <div className="stat">Киреше<b>{Math.round(stats.revenue)} сом</b></div>
                </> : <div className="msg">Admin кирүүсү керек.</div>}
              </div>
            </div>

            <div className="panel">
              <h2>Жаңы товар кошуу</h2>
              <form onSubmit={createProduct}>
                <input placeholder="Аты" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
                <input placeholder="Категория" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} required />
                <input type="number" placeholder="Баа" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                <input type="number" placeholder="Эски баа" value={productForm.old_price} onChange={(e) => setProductForm({ ...productForm, old_price: e.target.value })} required />
                <input placeholder="Размерлер: S,M,L" value={productForm.sizes} onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })} required />
                <input placeholder="Түстөр: Ак,Кара" value={productForm.colors} onChange={(e) => setProductForm({ ...productForm, colors: e.target.value })} required />
                <input placeholder="Сүрөт URL" value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} required />
                <textarea placeholder="Сүрөттөмө" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} required />
                <input type="number" placeholder="Саны" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} required />
                <button type="submit">Кошуу</button>
              </form>
              <div className="msg">{adminMsg}</div>
            </div>
          </div>

          <div className="panel">
            <h2>Заказдар</h2>
            {orders.length ? orders.map((order) => <div className="order-card" key={order.id}>
              <b>Заказ №{order.id}</b><br />
              Кардар: {order.customer_name}<br />
              Телефон: {order.phone}<br />
              Дарек: {order.address}<br />
              Төлөм: {order.payment_method}<br />
              Жалпы: {Math.round(order.total)} сом<br /><br />
              {order.items.map((item, idx) => <div key={idx}>• {item.product_name} | {item.qty} даана | {item.size} | {item.color} | {Math.round(item.subtotal)} сом</div>)}
            </div>) : <div className="msg">Азырынча заказ жок.</div>}
          </div>
        </section>}
      </main>

      <aside className={`drawer ${cartOpen ? 'open' : ''}`}>
        <div className="drawer-head"><h3>Корзина</h3><button onClick={() => setCartOpen(false)}>✕</button></div>
        <div className="cart-body">
          {cart.map((item, index) => <div className="cart-item" key={index}>
            <b>{item.name}</b><br />Өлчөм: {item.size} | Түс: {item.color}<br />Саны: {item.qty} | Баа: {Math.round(item.price)} сом<br /><br />
            <button onClick={() => removeCartItem(index)}>Өчүрүү</button>
          </div>)}
        </div>
        <div className="drawer-footer">
          <strong>Жалпы: {Math.round(cartTotal)} сом</strong>
          <button onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Заказ берүү</button>
        </div>
      </aside>

      <div className={`modal ${checkoutOpen ? '' : 'hidden'}`}>
        <div className="modal-box">
          <div className="drawer-head"><h3>Checkout</h3><button onClick={() => setCheckoutOpen(false)}>✕</button></div>
          <form onSubmit={submitOrder}>
            <input placeholder="Аты" value={checkoutForm.customer_name} onChange={(e) => setCheckoutForm({ ...checkoutForm, customer_name: e.target.value })} required />
            <input placeholder="Телефон" value={checkoutForm.phone} onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })} required />
            <input placeholder="Дарек" value={checkoutForm.address} onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })} required />
            <select value={checkoutForm.payment_method} onChange={(e) => setCheckoutForm({ ...checkoutForm, payment_method: e.target.value })}>
              {paymentMethods.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button type="submit">Подтвердить заказ</button>
          </form>
          <div className="msg">{checkoutMsg}</div>
        </div>
      </div>
    </div>
  )
}
