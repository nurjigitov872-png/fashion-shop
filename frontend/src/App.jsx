import React, { useEffect, useMemo, useState } from "react";
import { API } from "./config";

export default function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [checkoutForm, setCheckoutForm] = useState({
    customerName: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);

      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${API}/products`),
        fetch(`${API}/categories`)
      ]);

      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
      setMessage("Маалыматтарды жүктөөдө ката кетти");
    } finally {
      setLoading(false);
    }
  }

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          qty: 1
        }
      ];
    });

    setMessage(`${product.name} корзинага кошулду`);
  }

  function increaseQty(id) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: item.qty + 1 } : item
      )
    );
  }

  function decreaseQty(id) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty - 1 } : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchCategory = category ? product.category === category : true;
      const matchSearch =
        product.name?.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase());

      return matchCategory && matchSearch;
    });
  }, [products, category, search]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  async function submitOrder(orderData) {
    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderData)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Заказ жөнөтүлбөдү");
    }

    return data;
  }

  async function handleCheckout(e) {
    e.preventDefault();

    if (!cart.length) {
      setMessage("Корзина бош");
      return;
    }

    if (
      !checkoutForm.customerName.trim() ||
      !checkoutForm.phone.trim() ||
      !checkoutForm.address.trim()
    ) {
      setMessage("Бардык талааларды толтуруңуз");
      return;
    }

    try {
      setOrderLoading(true);
      setMessage("");

      const order = {
        customerName: checkoutForm.customerName,
        phone: checkoutForm.phone,
        address: checkoutForm.address,
        items: cart,
        total: cartTotal
      };

      const result = await submitOrder(order);

      setMessage(`Заказ кабыл алынды! №${result.orderId}`);
      setCart([]);
      setCheckoutForm({
        customerName: "",
        phone: "",
        address: ""
      });
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setOrderLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Fashion Shop</h1>
          <p style={styles.subtitle}>Футболка, шым, обувь, аксессуар</p>
        </div>
        <div style={styles.cartBadge}>
          🛒 Корзина: {cart.reduce((sum, item) => sum + item.qty, 0)}
        </div>
      </header>

      <section style={styles.filters}>
        <input
          style={styles.input}
          type="text"
          placeholder="Издөө..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          style={styles.input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Бардык категория</option>
          {categories.map((cat, index) => (
            <option key={index} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </section>

      {message ? <div style={styles.message}>{message}</div> : null}

      <main style={styles.layout}>
        <section style={styles.productsSection}>
          <h2>Товарлар</h2>

          {loading ? (
            <p>Жүктөлүүдө...</p>
          ) : (
            <div style={styles.grid}>
              {filteredProducts.map((product) => (
                <div key={product.id} style={styles.card}>
                  <img
                    src={product.image}
                    alt={product.name}
                    style={styles.image}
                  />
                  <div style={styles.cardBody}>
                    <h3 style={styles.productName}>{product.name}</h3>
                    <p style={styles.category}>{product.category}</p>
                    <p style={styles.description}>{product.description}</p>
                    <div style={styles.priceRow}>
                      <span style={styles.price}>{product.price} сом</span>
                      {product.oldPrice ? (
                        <span style={styles.oldPrice}>
                          {product.oldPrice} сом
                        </span>
                      ) : null}
                    </div>
                    <button
                      style={styles.button}
                      onClick={() => addToCart(product)}
                    >
                      Корзинага кошуу
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside style={styles.sidebar}>
          <div style={styles.cartBox}>
            <h2>Корзина</h2>

            {cart.length === 0 ? (
              <p>Корзина бош</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.id} style={styles.cartItem}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.price} сом</p>
                    </div>

                    <div style={styles.qtyBox}>
                      <button
                        style={styles.qtyBtn}
                        onClick={() => decreaseQty(item.id)}
                      >
                        -
                      </button>
                      <span>{item.qty}</span>
                      <button
                        style={styles.qtyBtn}
                        onClick={() => increaseQty(item.id)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      style={styles.removeBtn}
                      onClick={() => removeFromCart(item.id)}
                    >
                      Өчүрүү
                    </button>
                  </div>
                ))}

                <div style={styles.total}>Жалпы: {cartTotal} сом</div>
              </>
            )}
          </div>

          <div style={styles.checkoutBox}>
            <h2>Заказ берүү</h2>

            <form onSubmit={handleCheckout} style={styles.form}>
              <input
                style={styles.input}
                type="text"
                placeholder="Атыңыз"
                value={checkoutForm.customerName}
                onChange={(e) =>
                  setCheckoutForm((prev) => ({
                    ...prev,
                    customerName: e.target.value
                  }))
                }
              />

              <input
                style={styles.input}
                type="text"
                placeholder="Телефон"
                value={checkoutForm.phone}
                onChange={(e) =>
                  setCheckoutForm((prev) => ({
                    ...prev,
                    phone: e.target.value
                  }))
                }
              />

              <textarea
                style={styles.textarea}
                placeholder="Дарек"
                value={checkoutForm.address}
                onChange={(e) =>
                  setCheckoutForm((prev) => ({
                    ...prev,
                    address: e.target.value
                  }))
                }
              />

              <button
                type="submit"
                style={styles.orderButton}
                disabled={orderLoading}
              >
                {orderLoading ? "Жөнөтүлүүдө..." : "Заказ берүү"}
              </button>
            </form>
          </div>
        </aside>
      </main>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Arial, sans-serif",
    background: "#f5f7fb",
    minHeight: "100vh",
    padding: "20px"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "20px"
  },
  title: {
    margin: 0,
    fontSize: "32px"
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#666"
  },
  cartBadge: {
    background: "#111827",
    color: "#fff",
    padding: "12px 18px",
    borderRadius: "12px",
    fontWeight: "bold"
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "1fr 240px",
    gap: "12px",
    marginBottom: "20px"
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "20px"
  },
  productsSection: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "16px"
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)"
  },
  image: {
    width: "100%",
    height: "220px",
    objectFit: "cover"
  },
  cardBody: {
    padding: "14px"
  },
  productName: {
    margin: "0 0 6px 0",
    fontSize: "18px"
  },
  category: {
    color: "#2563eb",
    fontWeight: "bold",
    margin: "0 0 8px 0"
  },
  description: {
    color: "#555",
    fontSize: "14px",
    minHeight: "40px"
  },
  priceRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "12px 0"
  },
  price: {
    fontWeight: "bold",
    fontSize: "18px"
  },
  oldPrice: {
    textDecoration: "line-through",
    color: "#999"
  },
  button: {
    width: "100%",
    padding: "10px 14px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer"
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  cartBox: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px"
  },
  checkoutBox: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px"
  },
  cartItem: {
    borderBottom: "1px solid #eee",
    padding: "12px 0",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  qtyBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  qtyBtn: {
    width: "30px",
    height: "30px",
    border: "none",
    borderRadius: "8px",
    background: "#e5e7eb",
    cursor: "pointer"
  },
  removeBtn: {
    padding: "8px 10px",
    border: "none",
    borderRadius: "8px",
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer"
  },
  total: {
    marginTop: "14px",
    fontSize: "18px",
    fontWeight: "bold"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "14px"
  },
  textarea: {
    width: "100%",
    minHeight: "100px",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    resize: "vertical"
  },
  orderButton: {
    padding: "12px 14px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  message: {
    marginBottom: "16px",
    padding: "12px 14px",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "10px"
  }
};