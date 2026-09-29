import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const api = axios.create({ baseURL: API });

function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  return <div className="login">
    <form onSubmit={submit} className="card login-card">
      <h1>Asset Management</h1>
      <p>Secure inventory dashboard</p>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" />
      <button>Sign in</button>
      {error && <div className="error">{error}</div>}
    </form>
  </div>;
}

function App() {
  const [user, setUser] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [bases, setBases] = useState([]);
  const [types, setTypes] = useState([]);
  const [baseId, setBaseId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [popup, setPopup] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ id: payload.id, role: payload.role, baseId: payload.baseId });
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.get("/bases"), api.get("/equipment-types")]).then(([b, t]) => {
      setBases(b.data); setTypes(t.data);
    });
    loadDashboard();
  }, [user, baseId, typeId]);

  async function loadDashboard() {
    if (!user) return;
    const { data } = await api.get("/dashboard", {
      params: { baseId: baseId || undefined, equipmentTypeId: typeId || undefined }
    });
    setMetrics(data);
  }

  function loginDone(u) {
    api.defaults.headers.common.Authorization = `Bearer ${localStorage.getItem("token")}`;
    setUser(u);
  }

  if (!user) return <Login onLogin={loginDone} />;

  return <div className="app">
    <aside>
      <h2>AssetOps</h2>
      <small>{user.role}</small>
      {["dashboard","purchases","transfers","assignments","expenditures"].map(x =>
        <button className={tab === x ? "active" : ""} onClick={() => setTab(x)} key={x}>
          {x[0].toUpperCase()+x.slice(1)}
        </button>
      )}
      <button className="logout" onClick={() => {localStorage.removeItem("token"); location.reload();}}>Logout</button>
    </aside>

    <main>
      <header>
        <div><h1>{tab[0].toUpperCase()+tab.slice(1)}</h1><p>Fictional demo environment</p></div>
        {tab === "dashboard" && <div className="filters">
          <select value={baseId} onChange={e=>setBaseId(e.target.value)}>
            <option value="">All bases</option>
            {bases.map(b => <option value={b.id} key={b.id}>{b.name}</option>)}
          </select>
          <select value={typeId} onChange={e=>setTypeId(e.target.value)}>
            <option value="">All equipment</option>
            {types.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}
          </select>
        </div>}
      </header>

      {tab === "dashboard" && metrics && <>
        <section className="grid">
          <Metric title="Opening Balance" value={metrics.openingBalance} />
          <Metric title="Closing Balance" value={metrics.closingBalance} />
          <Metric title="Net Movement" value={metrics.netMovement} clickable onClick={()=>setPopup(true)} />
          <Metric title="Assigned" value={metrics.assigned} />
          <Metric title="Expended" value={metrics.expended} />
        </section>
        <div className="card">
          <h3>Movement Summary</h3>
          <p>Purchases: <b>{metrics.purchases}</b></p>
          <p>Transfer In: <b>{metrics.transferIn}</b></p>
          <p>Transfer Out: <b>{metrics.transferOut}</b></p>
        </div>
      </>}

      {tab !== "dashboard" && <div className="card">
        <h3>{tab[0].toUpperCase()+tab.slice(1)}</h3>
        <p>This module is wired to the backend APIs. Use the documented REST endpoints to create and view records.</p>
        <p className="muted">API: {API}/{tab === "purchases" ? "purchases" : tab}</p>
      </div>}
    </main>

    {popup && <div className="overlay" onClick={()=>setPopup(false)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h2>Net Movement Details</h2>
        <p>Purchases <b>+{metrics.purchases}</b></p>
        <p>Transfer In <b>+{metrics.transferIn}</b></p>
        <p>Transfer Out <b>-{metrics.transferOut}</b></p>
        <hr />
        <p>Total <b>{metrics.netMovement}</b></p>
        <button onClick={()=>setPopup(false)}>Close</button>
      </div>
    </div>}
  </div>;
}

function Metric({ title, value, clickable, onClick }) {
  return <div className={"metric card " + (clickable ? "clickable" : "")} onClick={onClick}>
    <span>{title}</span><strong>{value}</strong>{clickable && <small>View details</small>}
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
