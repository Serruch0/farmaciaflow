import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, addDoc, serverTimestamp
} from "firebase/firestore";


const EQUIPO = ["Elisa", "Laura", "Irene", "Gonzalo", "Andrea", "Rocío", "Victoria", "Esther", "Antonio"];
const ZONAS_LIMPIEZA = ["Mostrador", "Almacén", "Sala trasera", "Baño", "Zona fría", "Escaparate", "Suelo general"];
const ESTADOS_PEDIDO = ["Recibido", "Gestionado", "Metido"];
const colorEstado = { "Recibido": "#f59e0b", "Gestionado": "#3b82f6", "Metido": "#10b981" };
const PIN_CORRECTO = "1234"; // ← CAMBIA ESTE PIN POR EL QUE QUIERAS
const todayKey = () => new Date().toISOString().slice(0, 10);
const todayLabel = () => new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const emptyDay = () => ({
  pedidos: [], incidencias: [], encargos: [], vacunas: [], formulasMagistrales: [],
  limpieza: { zonas: [], hecho: false, notas: "" },
  stocks: false, caducidades: false, almacenArreglado: false,
  repuestoFuera: false, repuestoDentro: false, ordenadoAlmacen: false, bajadoCajas: false,
  turno: "mañana", responsable: "", equipoPresente: [], notaTraspaso: "",
  fecha: todayLabel(), fechaKey: todayKey(),
});

const inputStyle = { padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none" };
const addBtnStyle = { padding: "8px 16px", background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const deleteBtnStyle = { width: 28, height: 28, borderRadius: 8, border: "none", background: "#fee2e2", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const EmptyState = ({ text }) => (<div style={{ textAlign: "center", padding: "32px 20px", color: "#94a3b8", fontSize: 14 }}><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>{text}</div>);
const Badge = ({ text, color }) => (<span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: color + "22", color, border: `1px solid ${color}44` }}>{text}</span>);
const Card = ({ children, style = {} }) => (<div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px #0001", border: "1px solid #f1f5f9", ...style }}>{children}</div>);
const SectionTitle = ({ children, icon }) => (<h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><span>{icon}</span>{children}</h3>);
const Pill = ({ label, onClick, active }) => (<button onClick={onClick} style={{ padding: "5px 13px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: active ? "#6366f1" : "#f1f5f9", color: active ? "#fff" : "#64748b", border: "none", transition: "all 0.2s", fontFamily: "inherit" }}>{label}</button>);

// ── PANTALLA DE PIN ──────────────────────────────────────────
function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const handleKey = (k) => {
    if (k === "del") { setPin(p => p.slice(0, -1)); setError(""); return; }
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      if (next === PIN_CORRECTO) { onUnlock(); }
      else { setError("PIN incorrecto"); setTimeout(() => { setPin(""); setError(""); }, 800); }
    }
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 40, width: 300, textAlign: "center", boxShadow: "0 20px 60px #0003" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💊</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginBottom: 4 }}>FarmaciaFlow</div>
        <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 28 }}>Introduce el PIN de acceso</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
          {[0,1,2,3].map(i => (<div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: pin.length > i ? "#6366f1" : "#e2e8f0", transition: "background 0.2s" }} />))}
        </div>
        {error && <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {["1","2","3","4","5","6","7","8","9","","0","del"].map((k, i) => (
            k === "" ? <div key={i} /> :
            <button key={i} onClick={() => handleKey(k)} style={{ padding: "16px 0", borderRadius: 12, border: "none", background: k === "del" ? "#fee2e2" : "#f8fafc", color: k === "del" ? "#ef4444" : "#1e293b", fontSize: k === "del" ? 18 : 20, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}>
              {k === "del" ? "⌫" : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTE SUBIDA DE FOTO (base64) ──────────────────────
function FotoUploader({ fotos = [], onChange }) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("La foto es demasiado grande. Máximo 2MB."); return; }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange([...fotos, ev.target.result]);
      setLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: fotos.length > 0 ? 10 : 0 }}>
        {fotos.map((url, i) => (
          <div key={i} style={{ position: "relative" }}>
            <img src={url} alt="foto" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: "2px solid #e2e8f0" }} onClick={() => window.open(url)} />
            <button onClick={() => onChange(fotos.filter((_, j) => j !== i))} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✕</button>
          </div>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      <button onClick={() => fileRef.current.click()} disabled={loading} style={{ padding: "8px 14px", background: loading ? "#e2e8f0" : "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", color: "#16a34a", fontFamily: "inherit" }}>
        {loading ? "⏳ Procesando..." : "📸 Añadir foto"}
      </button>
    </div>
  );
}

// ── APP PRINCIPAL ────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("ff_unlocked") === "1");
  const [activeTab, setActiveTab] = useState("resumen");
  const [dayData, setDayData] = useState(emptyDay());
  const [showModal, setShowModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingHistorialDay, setEditingHistorialDay] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatUser, setChatUser] = useState("");
  const chatEndRef = useRef(null);

  const handleUnlock = () => { sessionStorage.setItem("ff_unlocked", "1"); setUnlocked(true); };

  useEffect(() => {
    if (!unlocked) return;
    const unsub = onSnapshot(doc(db, "jornadas", todayKey()), (snap) => {
      if (snap.exists()) setDayData({ ...emptyDay(), ...snap.data() });
    });
    return () => unsub();
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    const q = query(collection(db, "jornadas"), orderBy("fechaKey", "desc"));
    const unsub = onSnapshot(q, (snap) => { setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    const q = query(collection(db, "chat"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsub();
  }, [unlocked]);

  if (!unlocked) return <PinScreen onUnlock={handleUnlock} />;

  const saveDay = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "jornadas", todayKey()), { ...dayData, fechaKey: todayKey(), fecha: todayLabel() });
      setSavedMsg("✓ Guardado correctamente");
    } catch (e) { setSavedMsg("❌ Error al guardar."); }
    setSaving(false);
    setTimeout(() => setSavedMsg(""), 3000);
  };

  const saveHistorialDay = async (dayId, updatedData) => {
    try {
      await setDoc(doc(db, "jornadas", dayId), updatedData);
      setEditingHistorialDay(null);
      setSelectedDay({ ...updatedData, id: dayId });
      setSavedMsg("✓ Jornada actualizada");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (e) { alert("Error al guardar."); }
  };

  const deleteDay = async (id) => {
    if (!window.confirm("¿Seguro que quieres borrar esta jornada?")) return;
    try { await deleteDoc(doc(db, "jornadas", id)); setSelectedDay(null); } catch (e) { alert("Error al borrar."); }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !chatUser) return;
    await addDoc(collection(db, "chat"), { texto: chatInput.trim(), autor: chatUser, timestamp: serverTimestamp(), fecha: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }), dia: todayKey() });
    setChatInput("");
  };

  const updateDay = (key, value) => setDayData(prev => ({ ...prev, [key]: value }));
  const openModal = (type, item = null) => { setShowModal(type); setFormData(item ? { ...item } : {}); setEditingItem(item ? { key: type, id: item.id } : null); };
  const closeModal = () => { setShowModal(null); setFormData({}); setEditingItem(null); };
  const addItem = (key) => {
    if (editingItem) { setDayData(prev => ({ ...prev, [key]: prev[key].map(i => i.id === editingItem.id ? { ...formData, id: editingItem.id } : i) })); }
    else { setDayData(prev => ({ ...prev, [key]: [...prev[key], { ...formData, id: Date.now() }] })); }
    closeModal();
  };
  const removeItem = (key, id) => setDayData(prev => ({ ...prev, [key]: prev[key].filter(i => i.id !== id) }));
  const toggleLimpiezaZona = (zona) => {
    setDayData(prev => { const zonas = prev.limpieza.zonas.includes(zona) ? prev.limpieza.zonas.filter(z => z !== zona) : [...prev.limpieza.zonas, zona]; return { ...prev, limpieza: { ...prev.limpieza, zonas } }; });
  };

  const pendientes = historial.filter(d => d.fechaKey !== todayKey()).flatMap(d => [
    ...(d.encargos || []).filter(e => e.estado !== "Entregado").map(e => ({ ...e, tipo: "encargo", fecha: d.fecha })),
    ...(d.vacunas || []).filter(v => v.estado !== "Dispensada").map(v => ({ ...v, tipo: "vacuna", fecha: d.fecha })),
    ...(d.formulasMagistrales || []).filter(f => f.estado !== "Recogida").map(f => ({ ...f, tipo: "formula", fecha: d.fecha })),
  ]);

  const CheckBox = ({ label, checked, onChange }) => (
    <button onClick={() => onChange(!checked)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: checked ? "#d1fae5" : "#fff", border: `2px solid ${checked ? "#10b981" : "#e2e8f0"}`, borderRadius: 10, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit", fontSize: 14, color: checked ? "#065f46" : "#475569", fontWeight: checked ? 600 : 400, width: "100%", textAlign: "left" }}>
      <span style={{ fontSize: 18 }}>{checked ? "✅" : "⬜"}</span>{label}
    </button>
  );

  const tabs = [
    { id: "resumen", label: "🏠 Inicio" }, { id: "pedidos", label: "📦 Pedidos" },
    { id: "incidencias", label: "⚠️ Incid." }, { id: "encargos", label: "💊 Encargos" },
    { id: "tareas", label: "✅ Tareas" }, { id: "semana", label: "📅 Semana" },
    { id: "chat", label: "💬 Chat" }, { id: "historial", label: "📋 Historial" },
  ];

  const renderResumen = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div><div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Hoy</div><div style={{ fontSize: 15, color: "#334155", fontWeight: 700 }}>{todayLabel()}</div></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={dayData.turno} onChange={e => updateDay("turno", e.target.value)} style={inputStyle}><option value="mañana">☀️ Turno mañana</option><option value="tarde">🌙 Turno tarde</option></select>
            <select value={dayData.responsable} onChange={e => updateDay("responsable", e.target.value)} style={inputStyle}><option value="">👤 Responsable</option>{EQUIPO.map(n => <option key={n} value={n}>{n}</option>)}</select>
          </div>
        </div>
      </Card>
      {historial.find(d => d.fechaKey !== todayKey() && d.notaTraspaso) && (() => { const ayer = historial.find(d => d.fechaKey !== todayKey() && d.notaTraspaso); return (<Card style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb" }}><SectionTitle icon="📝">Nota de traspaso anterior</SectionTitle><div style={{ fontSize: 14, color: "#92400e" }}>{ayer.notaTraspaso}</div><div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>De: {ayer.fecha}</div></Card>); })()}
      {pendientes.length > 0 && (
        <Card style={{ borderLeft: "4px solid #ef4444", background: "#fef2f2" }}>
          <SectionTitle icon="🔔">Pendientes de días anteriores</SectionTitle>
          {pendientes.map((p, i) => (<div key={i} style={{ padding: "8px 12px", background: "#fff", borderRadius: 10, marginBottom: 8, fontSize: 13 }}><div style={{ fontWeight: 700, color: "#1e293b" }}>{p.tipo === "encargo" ? "🧪 " : p.tipo === "vacuna" ? "💉 " : "⚗️ "}{p.descripcion || p.vacuna || p.formula}</div><div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>{p.cliente && <Badge text={`👤 ${p.cliente}`} color="#6366f1" />}{p.estado && <Badge text={p.estado} color="#f59e0b" />}<Badge text={p.fecha} color="#94a3b8" /></div></div>))}
        </Card>
      )}
      <Card>
        <SectionTitle icon="👥">Equipo presente</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EQUIPO.map(nombre => { const active = (dayData.equipoPresente || []).includes(nombre); return (<button key={nombre} onClick={() => { const p = dayData.equipoPresente || []; updateDay("equipoPresente", active ? p.filter(n => n !== nombre) : [...p, nombre]); }} style={{ padding: "8px 16px", borderRadius: 30, fontSize: 14, fontWeight: 600, cursor: "pointer", background: active ? "#6366f1" : "#f8fafc", color: active ? "#fff" : "#64748b", border: `2px solid ${active ? "#6366f1" : "#e2e8f0"}`, transition: "all 0.2s", fontFamily: "inherit" }}>{nombre}</button>); })}
        </div>
      </Card>
      <Card>
        <SectionTitle icon="📝">Nota de traspaso de turno</SectionTitle>
        <textarea value={dayData.notaTraspaso || ""} onChange={e => updateDay("notaTraspaso", e.target.value)} placeholder="Escribe aquí lo que debe saber el turno siguiente..." rows={3} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }} />
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[{ label: "Pedidos", count: dayData.pedidos.length, icon: "📦", color: "#6366f1", tab: "pedidos" }, { label: "Incidencias", count: dayData.incidencias.length, icon: "⚠️", color: "#f59e0b", tab: "incidencias" }, { label: "Encargos", count: dayData.encargos.length + dayData.vacunas.length + dayData.formulasMagistrales.length, icon: "💊", color: "#10b981", tab: "encargos" }, { label: "Tareas", count: `${[dayData.stocks, dayData.caducidades, dayData.almacenArreglado, dayData.repuestoFuera, dayData.repuestoDentro, dayData.ordenadoAlmacen, dayData.bajadoCajas, dayData.limpieza.hecho].filter(Boolean).length}/8`, icon: "✅", color: "#3b82f6", tab: "tareas" }].map(({ label, count, icon, color, tab }) => (
          <button key={label} onClick={() => setActiveTab(tab)} style={{ background: "#fff", border: `2px solid ${color}33`, borderRadius: 14, padding: "16px 12px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", fontFamily: "inherit", boxShadow: "0 2px 8px #0001" }}>
            <div style={{ fontSize: 26 }}>{icon}</div><div style={{ fontSize: 24, fontWeight: 800, color }}>{count}</div><div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{label}</div>
          </button>
        ))}
      </div>
      <button onClick={saveDay} disabled={saving} style={{ background: saving ? "#a5b4fc" : "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px #6366f144" }}>{saving ? "⏳ Guardando..." : "💾 Guardar jornada"}</button>
      {savedMsg && <div style={{ textAlign: "center", color: savedMsg.startsWith("✓") ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: 15 }}>{savedMsg}</div>}
      <button onClick={() => { sessionStorage.removeItem("ff_unlocked"); setUnlocked(false); }} style={{ background: "none", border: "none", color: "#cbd5e1", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>🔒 Bloquear app</button>
    </div>
  );

  const renderPedidos = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>📦 Pedidos</h2><button onClick={() => openModal("pedido")} style={addBtnStyle}>+ Añadir</button></div>
      {dayData.pedidos.length === 0 && <EmptyState text="No hay pedidos registrados" />}
      {dayData.pedidos.map(p => (
        <Card key={p.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>{p.proveedor}</div>
              {p.descripcion && <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{p.descripcion}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}><Badge text={p.estado} color={colorEstado[p.estado] || "#6366f1"} />{p.responsable && <Badge text={p.responsable} color="#8b5cf6" />}{p.incidencia && <Badge text="⚠️ Con incidencia" color="#ef4444" />}</div>
              {p.incidencia && p.notaIncidencia && <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>🔴 {p.notaIncidencia}</div>}
              {(p.fotos || []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{p.fotos.map((url, i) => <img key={i} src={url} alt="foto" onClick={() => window.open(url)} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "2px solid #e2e8f0" }} />)}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => openModal("pedido", p)} style={{ ...deleteBtnStyle, background: "#eff6ff", color: "#3b82f6" }}>✏️</button>
              <button onClick={() => removeItem("pedidos", p.id)} style={deleteBtnStyle}>✕</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderIncidencias = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>⚠️ Incidencias</h2><button onClick={() => openModal("incidencia")} style={addBtnStyle}>+ Añadir</button></div>
      {dayData.incidencias.length === 0 && <EmptyState text="Sin incidencias hoy 🎉" />}
      {dayData.incidencias.map(inc => (
        <Card key={inc.id} style={{ borderLeft: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#92400e", fontSize: 15 }}>{inc.tipo}</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{inc.descripcion}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{inc.turno && <Badge text={inc.turno === "mañana" ? "☀️ Mañana" : "🌙 Tarde"} color="#6366f1" />}{inc.responsable && <Badge text={inc.responsable} color="#8b5cf6" />}{inc.resuelta && <Badge text="✓ Resuelta" color="#10b981" />}</div>
              {(inc.fotos || []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{inc.fotos.map((url, i) => <img key={i} src={url} alt="foto" onClick={() => window.open(url)} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "2px solid #e2e8f0" }} />)}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => openModal("incidencia", inc)} style={{ ...deleteBtnStyle, background: "#eff6ff", color: "#3b82f6" }}>✏️</button>
              <button onClick={() => removeItem("incidencias", inc.id)} style={deleteBtnStyle}>✕</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderEncargos = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>💊 Encargos</h2>
      <Card><SectionTitle icon="🧪">Encargos especiales</SectionTitle><button onClick={() => openModal("encargo")} style={{ ...addBtnStyle, marginBottom: 12 }}>+ Añadir</button>{dayData.encargos.length === 0 && <EmptyState text="Sin encargos especiales" />}{dayData.encargos.map(e => (<div key={e.id} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{e.descripcion}</div><div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>{e.cliente && <Badge text={`👤 ${e.cliente}`} color="#6366f1" />}{e.responsable && <Badge text={e.responsable} color="#8b5cf6" />}{e.estado && <Badge text={e.estado} color={e.estado === "Entregado" ? "#10b981" : "#f59e0b"} />}</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => openModal("encargo", e)} style={{ ...deleteBtnStyle, background: "#eff6ff", color: "#3b82f6" }}>✏️</button><button onClick={() => removeItem("encargos", e.id)} style={deleteBtnStyle}>✕</button></div></div>))}</Card>
      <Card><SectionTitle icon="💉">Vacunas</SectionTitle><button onClick={() => openModal("vacuna")} style={{ ...addBtnStyle, marginBottom: 12 }}>+ Añadir</button>{dayData.vacunas.length === 0 && <EmptyState text="Sin vacunas" />}{dayData.vacunas.map(v => (<div key={v.id} style={{ padding: "10px 14px", background: "#eff6ff", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{v.vacuna}</div><div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>{v.cliente && <Badge text={`👤 ${v.cliente}`} color="#3b82f6" />}{v.dosis && <Badge text={`Dosis: ${v.dosis}`} color="#6366f1" />}{v.estado && <Badge text={v.estado} color={v.estado === "Dispensada" ? "#10b981" : "#f59e0b"} />}</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => openModal("vacuna", v)} style={{ ...deleteBtnStyle, background: "#eff6ff", color: "#3b82f6" }}>✏️</button><button onClick={() => removeItem("vacunas", v.id)} style={deleteBtnStyle}>✕</button></div></div>))}</Card>
      <Card><SectionTitle icon="⚗️">Fórmulas magistrales</SectionTitle><button onClick={() => openModal("formula")} style={{ ...addBtnStyle, marginBottom: 12 }}>+ Añadir</button>{dayData.formulasMagistrales.length === 0 && <EmptyState text="Sin fórmulas" />}{dayData.formulasMagistrales.map(f => (<div key={f.id} style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{f.formula}</div><div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>{f.cliente && <Badge text={`👤 ${f.cliente}`} color="#10b981" />}{f.laboratorio && <Badge text={`🏥 ${f.laboratorio}`} color="#6366f1" />}{f.estado && <Badge text={f.estado} color={f.estado === "Recogida" ? "#10b981" : "#f59e0b"} />}</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => openModal("formula", f)} style={{ ...deleteBtnStyle, background: "#eff6ff", color: "#3b82f6" }}>✏️</button><button onClick={() => removeItem("formulasMagistrales", f.id)} style={deleteBtnStyle}>✕</button></div></div>))}</Card>
    </div>
  );

  const renderTareas = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>✅ Tareas del día</h2>
      <Card><SectionTitle icon="🧹">Limpieza</SectionTitle><CheckBox label="Se ha limpiado" checked={dayData.limpieza.hecho} onChange={v => updateDay("limpieza", { ...dayData.limpieza, hecho: v })} />{dayData.limpieza.hecho && (<div style={{ marginTop: 12 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Zonas:</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{ZONAS_LIMPIEZA.map(zona => (<Pill key={zona} label={zona} active={dayData.limpieza.zonas.includes(zona)} onClick={() => toggleLimpiezaZona(zona)} />))}</div><textarea value={dayData.limpieza.notas || ""} onChange={e => updateDay("limpieza", { ...dayData.limpieza, notas: e.target.value })} placeholder="Notas de limpieza..." rows={3} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }} /></div>)}</Card>
      <Card><SectionTitle icon="📦">Almacén y stock</SectionTitle><div style={{ display: "flex", flexDirection: "column", gap: 8 }}><CheckBox label="Repuesto desde fuera" checked={dayData.repuestoFuera} onChange={v => updateDay("repuestoFuera", v)} /><CheckBox label="Repuesto desde dentro" checked={dayData.repuestoDentro} onChange={v => updateDay("repuestoDentro", v)} /><CheckBox label="Almacén arreglado" checked={dayData.almacenArreglado} onChange={v => updateDay("almacenArreglado", v)} /><CheckBox label="Ordenado el almacén" checked={dayData.ordenadoAlmacen} onChange={v => updateDay("ordenadoAlmacen", v)} /><CheckBox label="Bajado cajas" checked={dayData.bajadoCajas} onChange={v => updateDay("bajadoCajas", v)} /></div></Card>
      <Card><SectionTitle icon="📋">Control y revisión</SectionTitle><div style={{ display: "flex", flexDirection: "column", gap: 8 }}><CheckBox label="Control de stocks" checked={dayData.stocks} onChange={v => updateDay("stocks", v)} /><CheckBox label="Revisión de caducidades" checked={dayData.caducidades} onChange={v => updateDay("caducidades", v)} /></div></Card>
      <Card><SectionTitle icon="📊">Progreso</SectionTitle>{(() => { const done = [dayData.stocks, dayData.caducidades, dayData.almacenArreglado, dayData.repuestoFuera, dayData.repuestoDentro, dayData.ordenadoAlmacen, dayData.bajadoCajas, dayData.limpieza.hecho].filter(Boolean).length; const pct = Math.round((done / 8) * 100); return (<><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: "#64748b", fontSize: 14 }}>{done} de 8 completadas</span><span style={{ color: "#6366f1", fontWeight: 700, fontSize: 14 }}>{pct}%</span></div><div style={{ background: "#e2e8f0", borderRadius: 20, height: 12, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #10b981)", borderRadius: 20, transition: "width 0.4s" }} /></div></>); })()}</Card>
    </div>
  );

  const renderSemana = () => {
    const last7 = historial.slice(0, 7);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>📅 Vista semanal</h2>
        {last7.length === 0 && <EmptyState text="No hay datos todavía" />}
        {last7.map(day => {
          const tareas = [day.stocks, day.caducidades, day.almacenArreglado, day.repuestoFuera, day.repuestoDentro, day.ordenadoAlmacen, day.bajadoCajas, day.limpieza?.hecho].filter(Boolean).length;
          const pct = Math.round((tareas / 8) * 100);
          const isToday = day.fechaKey === todayKey();
          return (
            <Card key={day.id} style={{ borderLeft: `4px solid ${isToday ? "#6366f1" : "#e2e8f0"}`, cursor: "pointer" }}>
              <div onClick={() => { setSelectedDay(day); setActiveTab("historial"); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontWeight: 700, color: isToday ? "#6366f1" : "#1e293b", fontSize: 14 }}>{isToday ? "🔵 Hoy — " : ""}{day.fecha || day.fechaKey}</div><div style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? "#10b981" : "#f59e0b" }}>{pct}% tareas</div></div>
                <div style={{ background: "#e2e8f0", borderRadius: 20, height: 6, overflow: "hidden", marginTop: 8 }}><div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#10b981" : "linear-gradient(90deg, #6366f1, #818cf8)", borderRadius: 20 }} /></div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>{day.turno && <Badge text={day.turno === "mañana" ? "☀️ Mañana" : "🌙 Tarde"} color="#6366f1" />}{day.responsable && <Badge text={`👤 ${day.responsable}`} color="#8b5cf6" />}<Badge text={`📦 ${(day.pedidos || []).length}`} color="#6366f1" /><Badge text={`⚠️ ${(day.incidencias || []).length}`} color="#f59e0b" /><Badge text={`💊 ${(day.encargos || []).length + (day.vacunas || []).length + (day.formulasMagistrales || []).length}`} color="#10b981" /></div>
                {day.notaTraspaso && <div style={{ marginTop: 8, padding: "6px 10px", background: "#fffbeb", borderRadius: 8, fontSize: 12, color: "#92400e" }}>📝 {day.notaTraspaso}</div>}
                <div style={{ marginTop: 8, fontSize: 12, color: "#a5b4fc", fontWeight: 600 }}>Toca para ver el detalle →</div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderChat = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "70vh" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>💬 Chat del equipo</h2>
      {!chatUser ? (
        <Card><SectionTitle icon="👤">¿Quién eres?</SectionTitle><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{EQUIPO.map(n => (<button key={n} onClick={() => setChatUser(n)} style={{ padding: "10px 18px", borderRadius: 30, fontSize: 14, fontWeight: 600, cursor: "pointer", background: "#f8fafc", color: "#64748b", border: "2px solid #e2e8f0", transition: "all 0.2s", fontFamily: "inherit" }}>{n}</button>))}</div></Card>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 12 }}>
            {chatMessages.length === 0 && <EmptyState text="Sin mensajes todavía. ¡Sé la primera!" />}
            {chatMessages.map(msg => { const isMe = msg.autor === chatUser; return (<div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}><div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isMe ? "linear-gradient(135deg, #6366f1, #818cf8)" : "#fff", color: isMe ? "#fff" : "#1e293b", boxShadow: "0 2px 8px #0001", border: isMe ? "none" : "1px solid #f1f5f9" }}>{!isMe && <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", marginBottom: 4 }}>{msg.autor}</div>}<div style={{ fontSize: 14 }}>{msg.texto}</div><div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, textAlign: "right" }}>{msg.fecha}</div></div></div>); })}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 600, alignSelf: "center", minWidth: 50 }}>{chatUser}</div>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Escribe un mensaje..." style={{ ...inputStyle, flex: 1 }} />
            <button onClick={sendMessage} style={{ ...addBtnStyle, padding: "10px 16px" }}>Enviar</button>
          </div>
          <button onClick={() => setChatUser("")} style={{ marginTop: 8, background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cambiar de usuario</button>
        </>
      )}
    </div>
  );

  const renderHistorial = () => {
    if (editingHistorialDay) {
      const d = editingHistorialDay;
      const updateH = (key, value) => setEditingHistorialDay(prev => ({ ...prev, [key]: value }));
      const updateHL = (key, value) => setEditingHistorialDay(prev => ({ ...prev, limpieza: { ...prev.limpieza, [key]: value } }));
      const toggleHL = (zona) => { const zonas = (d.limpieza?.zonas || []).includes(zona) ? d.limpieza.zonas.filter(z => z !== zona) : [...(d.limpieza?.zonas || []), zona]; updateHL("zonas", zonas); };
      const HCheckBox = ({ label, checked, onChange }) => (<button onClick={() => onChange(!checked)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: checked ? "#d1fae5" : "#fff", border: `2px solid ${checked ? "#10b981" : "#e2e8f0"}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: checked ? "#065f46" : "#475569", fontWeight: checked ? 600 : 400, width: "100%", textAlign: "left" }}><span style={{ fontSize: 18 }}>{checked ? "✅" : "⬜"}</span>{label}</button>);
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><button onClick={() => setEditingHistorialDay(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#64748b" }}>← Cancelar</button><h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", flex: 1 }}>✏️ Editar jornada</h2></div>
          <Card><SectionTitle icon="📋">Datos del turno</SectionTitle><div style={{ display: "flex", flexDirection: "column", gap: 10 }}><select value={d.turno || "mañana"} onChange={e => updateH("turno", e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}><option value="mañana">☀️ Turno mañana</option><option value="tarde">🌙 Turno tarde</option></select><select value={d.responsable || ""} onChange={e => updateH("responsable", e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}><option value="">👤 Responsable</option>{EQUIPO.map(n => <option key={n} value={n}>{n}</option>)}</select><div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Equipo presente:</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{EQUIPO.map(nombre => { const active = (d.equipoPresente || []).includes(nombre); return (<button key={nombre} onClick={() => { const p = d.equipoPresente || []; updateH("equipoPresente", active ? p.filter(n => n !== nombre) : [...p, nombre]); }} style={{ padding: "6px 14px", borderRadius: 30, fontSize: 13, fontWeight: 600, cursor: "pointer", background: active ? "#6366f1" : "#f8fafc", color: active ? "#fff" : "#64748b", border: `2px solid ${active ? "#6366f1" : "#e2e8f0"}`, fontFamily: "inherit" }}>{nombre}</button>); })}</div><textarea value={d.notaTraspaso || ""} onChange={e => updateH("notaTraspaso", e.target.value)} placeholder="Nota de traspaso..." rows={2} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }} /></div></Card>
          <Card><SectionTitle icon="📦">Pedidos</SectionTitle>{(d.pedidos || []).map((p, i) => (<div key={i} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 10 }}><div style={{ display: "flex", flexDirection: "column", gap: 6 }}><input value={p.proveedor || ""} onChange={e => { const arr = [...d.pedidos]; arr[i] = { ...arr[i], proveedor: e.target.value }; updateH("pedidos", arr); }} placeholder="Proveedor" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} /><input value={p.descripcion || ""} onChange={e => { const arr = [...d.pedidos]; arr[i] = { ...arr[i], descripcion: e.target.value }; updateH("pedidos", arr); }} placeholder="Descripción" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} /><select value={p.estado || "Recibido"} onChange={e => { const arr = [...d.pedidos]; arr[i] = { ...arr[i], estado: e.target.value }; updateH("pedidos", arr); }} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}>{ESTADOS_PEDIDO.map(o => <option key={o} value={o}>{o}</option>)}</select><button onClick={() => updateH("pedidos", d.pedidos.filter((_, j) => j !== i))} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#ef4444", alignSelf: "flex-start" }}>🗑 Eliminar</button></div></div>))}<button onClick={() => updateH("pedidos", [...(d.pedidos || []), { id: Date.now(), proveedor: "", descripcion: "", estado: "Recibido" }])} style={addBtnStyle}>+ Añadir pedido</button></Card>
          <Card><SectionTitle icon="⚠️">Incidencias</SectionTitle>{(d.incidencias || []).map((inc, i) => (<div key={i} style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: 10, marginBottom: 10 }}><div style={{ display: "flex", flexDirection: "column", gap: 6 }}><select value={inc.tipo || ""} onChange={e => { const arr = [...d.incidencias]; arr[i] = { ...arr[i], tipo: e.target.value }; updateH("incidencias", arr); }} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}><option value="">Tipo...</option>{["Cliente","Stock","Proveedor","Técnica","Personal","Otro"].map(o => <option key={o} value={o}>{o}</option>)}</select><textarea value={inc.descripcion || ""} onChange={e => { const arr = [...d.incidencias]; arr[i] = { ...arr[i], descripcion: e.target.value }; updateH("incidencias", arr); }} placeholder="Descripción" rows={2} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }} /><button onClick={() => updateH("incidencias", d.incidencias.filter((_, j) => j !== i))} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#ef4444", alignSelf: "flex-start" }}>🗑 Eliminar</button></div></div>))}<button onClick={() => updateH("incidencias", [...(d.incidencias || []), { id: Date.now(), tipo: "", descripcion: "" }])} style={addBtnStyle}>+ Añadir incidencia</button></Card>
          <Card><SectionTitle icon="💊">Encargos</SectionTitle>{(d.encargos || []).map((e, i) => (<div key={i} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 10 }}><div style={{ display: "flex", flexDirection: "column", gap: 6 }}><input value={e.descripcion || ""} onChange={ev => { const arr = [...d.encargos]; arr[i] = { ...arr[i], descripcion: ev.target.value }; updateH("encargos", arr); }} placeholder="Descripción" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} /><input value={e.cliente || ""} onChange={ev => { const arr = [...d.encargos]; arr[i] = { ...arr[i], cliente: ev.target.value }; updateH("encargos", arr); }} placeholder="Cliente" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} /><select value={e.estado || ""} onChange={ev => { const arr = [...d.encargos]; arr[i] = { ...arr[i], estado: ev.target.value }; updateH("encargos", arr); }} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}><option value="">Estado...</option>{["Pendiente","En gestión","Listo","Entregado"].map(o => <option key={o} value={o}>{o}</option>)}</select><button onClick={() => updateH("encargos", d.encargos.filter((_, j) => j !== i))} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#ef4444", alignSelf: "flex-start" }}>🗑 Eliminar</button></div></div>))}<button onClick={() => updateH("encargos", [...(d.encargos || []), { id: Date.now(), descripcion: "", cliente: "", estado: "Pendiente" }])} style={addBtnStyle}>+ Añadir encargo</button></Card>
          <Card><SectionTitle icon="✅">Tareas</SectionTitle><div style={{ display: "flex", flexDirection: "column", gap: 8 }}><HCheckBox label="Limpieza realizada" checked={d.limpieza?.hecho || false} onChange={v => updateHL("hecho", v)} />{d.limpieza?.hecho && (<div style={{ paddingLeft: 8 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Zonas:</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>{ZONAS_LIMPIEZA.map(zona => (<Pill key={zona} label={zona} active={(d.limpieza?.zonas || []).includes(zona)} onClick={() => toggleHL(zona)} />))}</div><textarea value={d.limpieza?.notas || ""} onChange={e => updateHL("notas", e.target.value)} placeholder="Notas..." rows={2} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }} /></div>)}<HCheckBox label="Repuesto desde fuera" checked={d.repuestoFuera || false} onChange={v => updateH("repuestoFuera", v)} /><HCheckBox label="Repuesto desde dentro" checked={d.repuestoDentro || false} onChange={v => updateH("repuestoDentro", v)} /><HCheckBox label="Almacén arreglado" checked={d.almacenArreglado || false} onChange={v => updateH("almacenArreglado", v)} /><HCheckBox label="Ordenado el almacén" checked={d.ordenadoAlmacen || false} onChange={v => updateH("ordenadoAlmacen", v)} /><HCheckBox label="Bajado cajas" checked={d.bajadoCajas || false} onChange={v => updateH("bajadoCajas", v)} /><HCheckBox label="Control de stocks" checked={d.stocks || false} onChange={v => updateH("stocks", v)} /><HCheckBox label="Revisión de caducidades" checked={d.caducidades || false} onChange={v => updateH("caducidades", v)} /></div></Card>
          <div style={{ display: "flex", gap: 10 }}><button onClick={() => setEditingHistorialDay(null)} style={{ flex: 1, padding: 12, border: "2px solid #e2e8f0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancelar</button><button onClick={() => saveHistorialDay(d.id, d)} style={{ flex: 2, padding: 12, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>💾 Guardar cambios</button></div>
        </div>
      );
    }

    if (selectedDay) {
      const d = selectedDay;
      const tareasDone = [d.stocks, d.caducidades, d.almacenArreglado, d.repuestoFuera, d.repuestoDentro, d.ordenadoAlmacen, d.bajadoCajas, d.limpieza?.hecho].filter(Boolean).length;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><button onClick={() => setSelectedDay(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#64748b" }}>← Volver</button><h2 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", flex: 1 }}>{d.fecha || d.fechaKey}</h2><button onClick={() => setEditingHistorialDay({ ...d })} style={{ background: "#eff6ff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#3b82f6" }}>✏️ Editar</button><button onClick={() => deleteDay(d.id)} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#ef4444" }}>🗑 Borrar</button></div>
          <Card><SectionTitle icon="📋">Resumen</SectionTitle><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{d.turno && <Badge text={d.turno === "mañana" ? "☀️ Mañana" : "🌙 Tarde"} color="#6366f1" />}{d.responsable && <Badge text={`👤 ${d.responsable}`} color="#8b5cf6" />}<Badge text={`✅ ${tareasDone}/8`} color="#10b981" /></div>{d.equipoPresente?.length > 0 && <div style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}>👥 {d.equipoPresente.join(", ")}</div>}{d.notaTraspaso && <div style={{ marginTop: 10, padding: "8px 12px", background: "#fffbeb", borderRadius: 8, fontSize: 13, color: "#92400e" }}>📝 {d.notaTraspaso}</div>}</Card>
          {(d.pedidos || []).length > 0 && <Card><SectionTitle icon="📦">Pedidos ({d.pedidos.length})</SectionTitle>{d.pedidos.map((p, i) => (<div key={i} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{p.proveedor}</div>{p.descripcion && <div style={{ fontSize: 13, color: "#64748b" }}>{p.descripcion}</div>}<div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}><Badge text={p.estado} color={colorEstado[p.estado] || "#6366f1"} />{p.responsable && <Badge text={p.responsable} color="#8b5cf6" />}{p.incidencia && <Badge text="⚠️" color="#ef4444" />}</div>{(p.fotos || []).length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{p.fotos.map((url, fi) => <img key={fi} src={url} alt="foto" onClick={() => window.open(url)} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "2px solid #e2e8f0" }} />)}</div>}</div>))}</Card>}
          {(d.incidencias || []).length > 0 && <Card><SectionTitle icon="⚠️">Incidencias</SectionTitle>{d.incidencias.map((inc, i) => (<div key={i} style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: 10, marginBottom: 8, borderLeft: "3px solid #f59e0b" }}><div style={{ fontWeight: 700, color: "#92400e", fontSize: 14 }}>{inc.tipo}</div><div style={{ fontSize: 13, color: "#64748b" }}>{inc.descripcion}</div><div style={{ display: "flex", gap: 6, marginTop: 6 }}>{inc.responsable && <Badge text={inc.responsable} color="#8b5cf6" />}{inc.resuelta && <Badge text="✓ Resuelta" color="#10b981" />}</div>{(inc.fotos || []).length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{inc.fotos.map((url, fi) => <img key={fi} src={url} alt="foto" onClick={() => window.open(url)} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "2px solid #e2e8f0" }} />)}</div>}</div>))}</Card>}
          {((d.encargos || []).length + (d.vacunas || []).length + (d.formulasMagistrales || []).length) > 0 && <Card><SectionTitle icon="💊">Encargos</SectionTitle>{(d.encargos || []).map((e, i) => <div key={i} style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 13 }}>🧪 {e.descripcion}</div><div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>{e.cliente && <Badge text={`👤 ${e.cliente}`} color="#6366f1" />}{e.estado && <Badge text={e.estado} color="#f59e0b" />}</div></div>)}{(d.vacunas || []).map((v, i) => <div key={i} style={{ padding: "8px 12px", background: "#eff6ff", borderRadius: 10, marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 13 }}>💉 {v.vacuna}</div><div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>{v.cliente && <Badge text={`👤 ${v.cliente}`} color="#3b82f6" />}{v.estado && <Badge text={v.estado} color="#f59e0b" />}</div></div>)}{(d.formulasMagistrales || []).map((f, i) => <div key={i} style={{ padding: "8px 12px", background: "#f0fdf4", borderRadius: 10, marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 13 }}>⚗️ {f.formula}</div><div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>{f.cliente && <Badge text={`👤 ${f.cliente}`} color="#10b981" />}{f.estado && <Badge text={f.estado} color="#f59e0b" />}</div></div>)}</Card>}
          <Card><SectionTitle icon="✅">Tareas</SectionTitle><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[{ label: "Limpieza", done: d.limpieza?.hecho }, { label: "Repuesto desde fuera", done: d.repuestoFuera }, { label: "Repuesto desde dentro", done: d.repuestoDentro }, { label: "Almacén arreglado", done: d.almacenArreglado }, { label: "Ordenado almacén", done: d.ordenadoAlmacen }, { label: "Bajado cajas", done: d.bajadoCajas }, { label: "Control de stocks", done: d.stocks }, { label: "Revisión caducidades", done: d.caducidades }].map(({ label, done }) => (<div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: done ? "#065f46" : "#94a3b8" }}><span>{done ? "✅" : "⬜"}</span>{label}</div>))}{d.limpieza?.zonas?.length > 0 && <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>🧹 {d.limpieza.zonas.join(", ")}</div>}{d.limpieza?.notas && <div style={{ fontSize: 13, color: "#64748b" }}>📝 {d.limpieza.notas}</div>}</div></Card>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>📋 Historial de jornadas</h2>
        {historial.length === 0 && <EmptyState text="Aún no hay jornadas guardadas" />}
        {historial.map((day) => (
          <Card key={day.id} style={{ borderLeft: "4px solid #6366f1", cursor: "pointer" }}>
            <div onClick={() => setSelectedDay(day)}>
              <div style={{ fontWeight: 700, color: "#6366f1", fontSize: 14 }}>{day.fecha || day.fechaKey}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{day.turno && <Badge text={day.turno === "mañana" ? "☀️ Mañana" : "🌙 Tarde"} color="#6366f1" />}{day.responsable && <Badge text={`👤 ${day.responsable}`} color="#8b5cf6" />}<Badge text={`📦 ${(day.pedidos || []).length}`} color="#6366f1" /><Badge text={`⚠️ ${(day.incidencias || []).length}`} color="#f59e0b" /><Badge text={`💊 ${(day.encargos || []).length + (day.vacunas || []).length + (day.formulasMagistrales || []).length}`} color="#10b981" /></div>
              {day.equipoPresente?.length > 0 && <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>👥 {day.equipoPresente.join(", ")}</div>}
              <div style={{ marginTop: 8, fontSize: 12, color: "#a5b4fc", fontWeight: 600 }}>Toca para ver el detalle →</div>
            </div>
            <button onClick={() => deleteDay(day.id)} style={{ marginTop: 10, background: "#fee2e2", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#ef4444" }}>🗑 Borrar jornada</button>
          </Card>
        ))}
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;
    const configs = {
      pedido: { title: editingItem ? "✏️ Editar pedido" : "📦 Nuevo pedido", fields: [{ key: "proveedor", label: "Proveedor *", type: "text", placeholder: "Ej: Cofares, Hefame..." }, { key: "descripcion", label: "Descripción", type: "text", placeholder: "Artículos o notas" }, { key: "estado", label: "Estado *", type: "select", options: ESTADOS_PEDIDO }, { key: "responsable", label: "Responsable", type: "select", options: EQUIPO }, { key: "incidencia", label: "¿Tiene incidencia?", type: "checkbox" }, { key: "notaIncidencia", label: "Nota de incidencia", type: "text", placeholder: "Describe la incidencia", hidden: !formData.incidencia }, { key: "fotos", label: "📸 Fotos del pedido", type: "fotos", carpeta: "pedidos" }], onSave: () => addItem("pedidos") },
      incidencia: { title: editingItem ? "✏️ Editar incidencia" : "⚠️ Nueva incidencia", fields: [{ key: "tipo", label: "Tipo *", type: "select", options: ["Cliente", "Stock", "Proveedor", "Técnica", "Personal", "Otro"] }, { key: "descripcion", label: "Descripción *", type: "textarea", placeholder: "Describe la incidencia..." }, { key: "turno", label: "Turno", type: "select", options: ["mañana", "tarde"] }, { key: "responsable", label: "Responsable", type: "select", options: EQUIPO }, { key: "resuelta", label: "¿Resuelta?", type: "checkbox" }, { key: "fotos", label: "📸 Fotos de la incidencia", type: "fotos", carpeta: "incidencias" }], onSave: () => addItem("incidencias") },
      encargo: { title: editingItem ? "✏️ Editar encargo" : "🧪 Encargo especial", fields: [{ key: "descripcion", label: "Descripción *", type: "text", placeholder: "Qué se encarga..." }, { key: "cliente", label: "Cliente", type: "text", placeholder: "Nombre del cliente" }, { key: "responsable", label: "Responsable", type: "select", options: EQUIPO }, { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "En gestión", "Listo", "Entregado"] }], onSave: () => addItem("encargos") },
      vacuna: { title: editingItem ? "✏️ Editar vacuna" : "💉 Encargo de vacuna", fields: [{ key: "vacuna", label: "Vacuna *", type: "text", placeholder: "Nombre de la vacuna" }, { key: "cliente", label: "Cliente", type: "text", placeholder: "Nombre del cliente" }, { key: "dosis", label: "Dosis", type: "text", placeholder: "Ej: 1ª dosis" }, { key: "responsable", label: "Responsable", type: "select", options: EQUIPO }, { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "En camino", "Recibida", "Dispensada"] }], onSave: () => addItem("vacunas") },
      formula: { title: editingItem ? "✏️ Editar fórmula" : "⚗️ Fórmula magistral", fields: [{ key: "formula", label: "Fórmula *", type: "text", placeholder: "Nombre/descripción" }, { key: "cliente", label: "Cliente", type: "text", placeholder: "Nombre del cliente" }, { key: "laboratorio", label: "Laboratorio", type: "text", placeholder: "Laboratorio preparador" }, { key: "responsable", label: "Responsable", type: "select", options: EQUIPO }, { key: "estado", label: "Estado", type: "select", options: ["Encargada", "En preparación", "Lista", "Recogida"] }], onSave: () => addItem("formulasMagistrales") },
    };
    const cfg = configs[showModal];
    if (!cfg) return null;
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && closeModal()}>
        <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
          <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{cfg.title}</h3><button onClick={closeModal} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button></div>
          {cfg.fields.filter(f => !f.hidden).map(field => (
            <div key={field.key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{field.label}</label>
              {field.type === "text" && <input value={formData[field.key] || ""} onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />}
              {field.type === "textarea" && <textarea value={formData[field.key] || ""} onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} rows={3} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }} />}
              {field.type === "select" && <select value={formData[field.key] || ""} onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}><option value="">Seleccionar...</option>{field.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}
              {field.type === "checkbox" && <CheckBox label={field.label} checked={!!formData[field.key]} onChange={v => setFormData(p => ({ ...p, [field.key]: v }))} />}
              {field.type === "fotos" && <FotoUploader fotos={formData[field.key] || []} onChange={urls => setFormData(p => ({ ...p, [field.key]: urls }))} carpeta={field.carpeta} />}
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={closeModal} style={{ flex: 1, padding: 12, border: "2px solid #e2e8f0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancelar</button>
            <button onClick={cfg.onSave} style={{ flex: 2, padding: 12, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{editingItem ? "Guardar cambios" : "Guardar"}</button>
          </div>
        </div>
      </div>
    );
  };

  const tabContent = { resumen: renderResumen, pedidos: renderPedidos, incidencias: renderIncidencias, encargos: renderEncargos, tareas: renderTareas, semana: renderSemana, chat: renderChat, historial: renderHistorial };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh", maxWidth: 520, margin: "0 auto", position: "relative" }}>
      <div style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", padding: "20px 20px 16px", color: "#fff", boxShadow: "0 4px 24px #6366f155" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>💊</div>
          <div><div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>FarmaciaFlow</div><div style={{ fontSize: 12, opacity: 0.85 }}>Gestión diaria del equipo</div></div>
          {pendientes.length > 0 && <div style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>🔔 {pendientes.length} pendiente{pendientes.length > 1 ? "s" : ""}</div>}
        </div>
      </div>
      <div style={{ background: "#fff", padding: "0 4px", borderBottom: "1px solid #f1f5f9", display: "flex", overflowX: "auto", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px #0001" }}>
        {tabs.map(tab => (<button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== "historial") { setSelectedDay(null); setEditingHistorialDay(null); } }} style={{ padding: "12px 8px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", color: activeTab === tab.id ? "#6366f1" : "#94a3b8", borderBottom: `2px solid ${activeTab === tab.id ? "#6366f1" : "transparent"}`, transition: "all 0.2s" }}>{tab.label}</button>))}
      </div>
      <div style={{ padding: 16, paddingBottom: 40 }}>{tabContent[activeTab]?.()}</div>
      {renderModal()}
    </div>
  );
}
