import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc
} from "firebase/firestore";

// ── CONSTANTES ──────────────────────────────────────────────
const EQUIPO = ["Elisa", "Laura", "Irene", "Gonzalo", "Andrea", "Rocío", "Victoria", "Esther"];
const ZONAS_LIMPIEZA = ["Mostrador", "Almacén", "Sala trasera", "Baño", "Zona fría", "Escaparate", "Suelo general"];
const ESTADOS_PEDIDO = ["Recibido", "Gestionado", "Metido"];
const colorEstado = { "Recibido": "#f59e0b", "Gestionado": "#3b82f6", "Metido": "#10b981" };

const todayKey = () => new Date().toISOString().slice(0, 10); // "2025-04-16"
const todayLabel = () => new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const emptyDay = () => ({
  pedidos: [], incidencias: [], encargos: [], vacunas: [], formulasMagistrales: [],
  limpieza: { zonas: [], hecho: false, notas: "" },
  stocks: false, caducidades: false, almacenArreglado: false,
  repuestoFuera: false, repuestoDentro: false, ordenadoAlmacen: false, bajadoCajas: false,
  turno: "mañana", responsable: "", equipoPresente: [],
  fecha: todayLabel(), fechaKey: todayKey(),
});

// ── ESTILOS BASE ─────────────────────────────────────────────
const inputStyle = {
  padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10,
  fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none",
};
const addBtnStyle = {
  padding: "8px 16px", background: "linear-gradient(135deg, #6366f1, #818cf8)",
  color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
};
const deleteBtnStyle = {
  width: 28, height: 28, borderRadius: 8, border: "none", background: "#fee2e2",
  color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};

// ── COMPONENTES PEQUEÑOS ─────────────────────────────────────
const EmptyState = ({ text }) => (
  <div style={{ textAlign: "center", padding: "32px 20px", color: "#94a3b8", fontSize: 14 }}>
    <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>{text}
  </div>
);

const Badge = ({ text, color }) => (
  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: color + "22", color, border: `1px solid ${color}44` }}>{text}</span>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px #0001", border: "1px solid #f1f5f9", ...style }}>{children}</div>
);

const SectionTitle = ({ children, icon }) => (
  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
    <span>{icon}</span>{children}
  </h3>
);

const Pill = ({ label, onClick, active }) => (
  <button onClick={onClick} style={{
    padding: "5px 13px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: active ? "#6366f1" : "#f1f5f9", color: active ? "#fff" : "#64748b",
    border: "none", transition: "all 0.2s", fontFamily: "inherit"
  }}>{label}</button>
);

// ── APP PRINCIPAL ────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [dayData, setDayData] = useState(emptyDay());
  const [showModal, setShowModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [historial, setHistorial] = useState([]);
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // ── CARGAR DATOS DEL DÍA ACTUAL DESDE FIREBASE ──
  useEffect(() => {
    const docRef = doc(db, "jornadas", todayKey());
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setDayData({ ...emptyDay(), ...snap.data() });
      }
    });
    return () => unsub();
  }, []);

  // ── CARGAR HISTORIAL DESDE FIREBASE ──
  useEffect(() => {
    const q = query(collection(db, "jornadas"), orderBy("fechaKey", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const days = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistorial(days);
    });
    return () => unsub();
  }, []);

  // ── GUARDAR EN FIREBASE ──
  const saveDay = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "jornadas", todayKey()), { ...dayData, fechaKey: todayKey(), fecha: todayLabel() });
      setSavedMsg("✓ Guardado correctamente");
    } catch (e) {
      setSavedMsg("❌ Error al guardar. Revisa la conexión.");
    }
    setSaving(false);
    setTimeout(() => setSavedMsg(""), 3000);
  };

  const deleteDay = async (id) => {
    if (!window.confirm("¿Seguro que quieres borrar esta jornada?")) return;
    try {
      await deleteDoc(doc(db, "jornadas", id));
      setSelectedDay(null);
    } catch (e) {
      alert("Error al borrar. Inténtalo de nuevo.");
    }
  };

  const updateDay = (key, value) => setDayData(prev => ({ ...prev, [key]: value }));

  const openModal = (type) => { setShowModal(type); setFormData({}); };
  const closeModal = () => { setShowModal(null); setFormData({}); };

  const addItem = (key) => {
    setDayData(prev => ({ ...prev, [key]: [...prev[key], { ...formData, id: Date.now() }] }));
    closeModal();
  };

  const removeItem = (key, id) => {
    setDayData(prev => ({ ...prev, [key]: prev[key].filter(i => i.id !== id) }));
  };

  const toggleLimpiezaZona = (zona) => {
    setDayData(prev => {
      const zonas = prev.limpieza.zonas.includes(zona)
        ? prev.limpieza.zonas.filter(z => z !== zona)
        : [...prev.limpieza.zonas, zona];
      return { ...prev, limpieza: { ...prev.limpieza, zonas } };
    });
  };

  const CheckBox = ({ label, checked, onChange }) => (
    <button onClick={() => onChange(!checked)} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      background: checked ? "#d1fae5" : "#fff", border: `2px solid ${checked ? "#10b981" : "#e2e8f0"}`,
      borderRadius: 10, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
      fontSize: 14, color: checked ? "#065f46" : "#475569", fontWeight: checked ? 600 : 400,
      width: "100%", textAlign: "left",
    }}>
      <span style={{ fontSize: 18 }}>{checked ? "✅" : "⬜"}</span>{label}
    </button>
  );

  const tabs = [
    { id: "resumen", label: "🏠 Resumen" },
    { id: "pedidos", label: "📦 Pedidos" },
    { id: "incidencias", label: "⚠️ Incidencias" },
    { id: "encargos", label: "💊 Encargos" },
    { id: "tareas", label: "✅ Tareas" },
    { id: "historial", label: "📋 Historial" },
  ];

  // ── RESUMEN ──────────────────────────────────────────────
  const renderResumen = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Hoy</div>
            <div style={{ fontSize: 15, color: "#334155", fontWeight: 700 }}>{todayLabel()}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={dayData.turno} onChange={e => updateDay("turno", e.target.value)} style={inputStyle}>
              <option value="mañana">☀️ Turno mañana</option>
              <option value="tarde">🌙 Turno tarde</option>
            </select>
            <select value={dayData.responsable} onChange={e => updateDay("responsable", e.target.value)} style={inputStyle}>
              <option value="">👤 Responsable del turno</option>
              {EQUIPO.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle icon="👥">Equipo presente</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EQUIPO.map(nombre => {
            const active = (dayData.equipoPresente || []).includes(nombre);
            return (
              <button key={nombre} onClick={() => {
                const present = dayData.equipoPresente || [];
                updateDay("equipoPresente", active ? present.filter(n => n !== nombre) : [...present, nombre]);
              }} style={{
                padding: "8px 16px", borderRadius: 30, fontSize: 14, fontWeight: 600, cursor: "pointer",
                background: active ? "#6366f1" : "#f8fafc", color: active ? "#fff" : "#64748b",
                border: `2px solid ${active ? "#6366f1" : "#e2e8f0"}`, transition: "all 0.2s", fontFamily: "inherit"
              }}>{nombre}</button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>Toca para marcar quién está de turno hoy</div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { label: "Pedidos", count: dayData.pedidos.length, icon: "📦", color: "#6366f1", tab: "pedidos" },
          { label: "Incidencias", count: dayData.incidencias.length, icon: "⚠️", color: "#f59e0b", tab: "incidencias" },
          { label: "Encargos", count: dayData.encargos.length + dayData.vacunas.length + dayData.formulasMagistrales.length, icon: "💊", color: "#10b981", tab: "encargos" },
          { label: "Tareas", count: `${[dayData.stocks, dayData.caducidades, dayData.almacenArreglado, dayData.repuestoFuera, dayData.repuestoDentro, dayData.ordenadoAlmacen, dayData.bajadoCajas, dayData.limpieza.hecho].filter(Boolean).length}/8`, icon: "✅", color: "#3b82f6", tab: "tareas" },
        ].map(({ label, count, icon, color, tab }) => (
          <button key={label} onClick={() => setActiveTab(tab)} style={{
            background: "#fff", border: `2px solid ${color}33`, borderRadius: 14, padding: "16px 12px",
            cursor: "pointer", textAlign: "center", transition: "all 0.2s", fontFamily: "inherit", boxShadow: "0 2px 8px #0001"
          }}>
            <div style={{ fontSize: 26 }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{count}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{label}</div>
          </button>
        ))}
      </div>

      <button onClick={saveDay} disabled={saving} style={{
        background: saving ? "#a5b4fc" : "linear-gradient(135deg, #6366f1, #818cf8)",
        color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px",
        fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
        boxShadow: "0 4px 16px #6366f144"
      }}>
        {saving ? "⏳ Guardando..." : "💾 Guardar jornada"}
      </button>
      {savedMsg && <div style={{ textAlign: "center", color: savedMsg.startsWith("✓") ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: 15 }}>{savedMsg}</div>}
    </div>
  );

  // ── PEDIDOS ──────────────────────────────────────────────
  const renderPedidos = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>📦 Pedidos</h2>
        <button onClick={() => openModal("pedido")} style={addBtnStyle}>+ Añadir</button>
      </div>
      {dayData.pedidos.length === 0 && <EmptyState text="No hay pedidos registrados" />}
      {dayData.pedidos.map(p => (
        <Card key={p.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>{p.proveedor}</div>
              {p.descripcion && <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{p.descripcion}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <Badge text={p.estado} color={colorEstado[p.estado] || "#6366f1"} />
                {p.responsable && <Badge text={p.responsable} color="#8b5cf6" />}
                {p.incidencia && <Badge text="⚠️ Con incidencia" color="#ef4444" />}
              </div>
              {p.incidencia && p.notaIncidencia && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
                  🔴 {p.notaIncidencia}
                </div>
              )}
            </div>
            <button onClick={() => removeItem("pedidos", p.id)} style={deleteBtnStyle}>✕</button>
          </div>
        </Card>
      ))}
    </div>
  );

  // ── INCIDENCIAS ──────────────────────────────────────────
  const renderIncidencias = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>⚠️ Incidencias</h2>
        <button onClick={() => openModal("incidencia")} style={addBtnStyle}>+ Añadir</button>
      </div>
      {dayData.incidencias.length === 0 && <EmptyState text="Sin incidencias hoy 🎉" />}
      {dayData.incidencias.map(inc => (
        <Card key={inc.id} style={{ borderLeft: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#92400e", fontSize: 15 }}>{inc.tipo}</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{inc.descripcion}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {inc.turno && <Badge text={inc.turno === "mañana" ? "☀️ Mañana" : "🌙 Tarde"} color="#6366f1" />}
                {inc.responsable && <Badge text={inc.responsable} color="#8b5cf6" />}
                {inc.resuelta && <Badge text="✓ Resuelta" color="#10b981" />}
              </div>
            </div>
            <button onClick={() => removeItem("incidencias", inc.id)} style={deleteBtnStyle}>✕</button>
          </div>
        </Card>
      ))}
    </div>
  );

  // ── ENCARGOS ─────────────────────────────────────────────
  const renderEncargos = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>💊 Encargos</h2>

      <Card>
        <SectionTitle icon="🧪">Encargos especiales / complicados</SectionTitle>
        <button onClick={() => openModal("encargo")} style={{ ...addBtnStyle, marginBottom: 12 }}>+ Añadir encargo</button>
        {dayData.encargos.length === 0 && <EmptyState text="Sin encargos especiales" />}
        {dayData.encargos.map(e => (
          <div key={e.id} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{e.descripcion}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {e.cliente && <Badge text={`👤 ${e.cliente}`} color="#6366f1" />}
                {e.responsable && <Badge text={e.responsable} color="#8b5cf6" />}
                {e.estado && <Badge text={e.estado} color={e.estado === "Listo" ? "#10b981" : "#f59e0b"} />}
              </div>
            </div>
            <button onClick={() => removeItem("encargos", e.id)} style={deleteBtnStyle}>✕</button>
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle icon="💉">Vacunas</SectionTitle>
        <button onClick={() => openModal("vacuna")} style={{ ...addBtnStyle, marginBottom: 12 }}>+ Añadir vacuna</button>
        {dayData.vacunas.length === 0 && <EmptyState text="Sin encargos de vacunas" />}
        {dayData.vacunas.map(v => (
          <div key={v.id} style={{ padding: "10px 14px", background: "#eff6ff", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{v.vacuna}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {v.cliente && <Badge text={`👤 ${v.cliente}`} color="#3b82f6" />}
                {v.responsable && <Badge text={v.responsable} color="#8b5cf6" />}
                {v.dosis && <Badge text={`Dosis: ${v.dosis}`} color="#6366f1" />}
                {v.estado && <Badge text={v.estado} color={v.estado === "Dispensada" ? "#10b981" : "#f59e0b"} />}
              </div>
            </div>
            <button onClick={() => removeItem("vacunas", v.id)} style={deleteBtnStyle}>✕</button>
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle icon="⚗️">Fórmulas magistrales</SectionTitle>
        <button onClick={() => openModal("formula")} style={{ ...addBtnStyle, marginBottom: 12 }}>+ Añadir fórmula</button>
        {dayData.formulasMagistrales.length === 0 && <EmptyState text="Sin fórmulas magistrales" />}
        {dayData.formulasMagistrales.map(f => (
          <div key={f.id} style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{f.formula}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {f.cliente && <Badge text={`👤 ${f.cliente}`} color="#10b981" />}
                {f.responsable && <Badge text={f.responsable} color="#8b5cf6" />}
                {f.laboratorio && <Badge text={`🏥 ${f.laboratorio}`} color="#6366f1" />}
                {f.estado && <Badge text={f.estado} color={f.estado === "Recogida" ? "#10b981" : "#f59e0b"} />}
              </div>
            </div>
            <button onClick={() => removeItem("formulasMagistrales", f.id)} style={deleteBtnStyle}>✕</button>
          </div>
        ))}
      </Card>
    </div>
  );

  // ── TAREAS ───────────────────────────────────────────────
  const renderTareas = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>✅ Tareas del día</h2>

      <Card>
        <SectionTitle icon="🧹">Limpieza</SectionTitle>
        <CheckBox label="Se ha limpiado" checked={dayData.limpieza.hecho} onChange={v => updateDay("limpieza", { ...dayData.limpieza, hecho: v })} />
        {dayData.limpieza.hecho && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Zonas limpiadas:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {ZONAS_LIMPIEZA.map(zona => (
                <Pill key={zona} label={zona} active={dayData.limpieza.zonas.includes(zona)} onClick={() => toggleLimpiezaZona(zona)} />
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Notas de limpieza:</div>
            <textarea
              value={dayData.limpieza.notas || ""}
              onChange={e => updateDay("limpieza", { ...dayData.limpieza, notas: e.target.value })}
              placeholder="Describe qué se ha limpiado, cómo o cualquier detalle relevante..."
              rows={3}
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon="📦">Almacén y stock</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <CheckBox label="Repuesto desde fuera" checked={dayData.repuestoFuera} onChange={v => updateDay("repuestoFuera", v)} />
          <CheckBox label="Repuesto desde dentro" checked={dayData.repuestoDentro} onChange={v => updateDay("repuestoDentro", v)} />
          <CheckBox label="Almacén arreglado/organizado" checked={dayData.almacenArreglado} onChange={v => updateDay("almacenArreglado", v)} />
          <CheckBox label="Se ha ido a ordenar el almacén" checked={dayData.ordenadoAlmacen} onChange={v => updateDay("ordenadoAlmacen", v)} />
          <CheckBox label="Bajado cajas" checked={dayData.bajadoCajas} onChange={v => updateDay("bajadoCajas", v)} />
        </div>
      </Card>

      <Card>
        <SectionTitle icon="📋">Control y revisión</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <CheckBox label="Control de stocks" checked={dayData.stocks} onChange={v => updateDay("stocks", v)} />
          <CheckBox label="Revisión de caducidades" checked={dayData.caducidades} onChange={v => updateDay("caducidades", v)} />
        </div>
      </Card>

      <Card>
        <SectionTitle icon="📊">Progreso de tareas</SectionTitle>
        {(() => {
          const total = 8;
          const done = [dayData.stocks, dayData.caducidades, dayData.almacenArreglado, dayData.repuestoFuera, dayData.repuestoDentro, dayData.ordenadoAlmacen, dayData.bajadoCajas, dayData.limpieza.hecho].filter(Boolean).length;
          const pct = Math.round((done / total) * 100);
          return (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b", fontSize: 14 }}>{done} de {total} tareas completadas</span>
                <span style={{ color: "#6366f1", fontWeight: 700, fontSize: 14 }}>{pct}%</span>
              </div>
              <div style={{ background: "#e2e8f0", borderRadius: 20, height: 12, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #10b981)", borderRadius: 20, transition: "width 0.4s" }} />
              </div>
            </>
          );
        })()}
      </Card>
    </div>
  );

  // ── HISTORIAL ─────────────────────────────────────────────
  const renderHistorial = () => {
    if (selectedDay) {
      const d = selectedDay;
      const tareasDone = [d.stocks, d.caducidades, d.almacenArreglado, d.repuestoFuera, d.repuestoDentro, d.ordenadoAlmacen, d.bajadoCajas, d.limpieza?.hecho].filter(Boolean).length;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setSelectedDay(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#64748b" }}>← Volver</button>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", flex: 1 }}>{d.fecha || d.fechaKey}</h2>
            <button onClick={() => deleteDay(d.id)} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#ef4444" }}>🗑 Borrar</button>
          </div>

          <Card>
            <SectionTitle icon="📋">Resumen del turno</SectionTitle>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {d.turno && <Badge text={d.turno === "mañana" ? "☀️ Mañana" : "🌙 Tarde"} color="#6366f1" />}
              {d.responsable && <Badge text={`👤 ${d.responsable}`} color="#8b5cf6" />}
              <Badge text={`✅ ${tareasDone}/8 tareas`} color="#10b981" />
            </div>
            {d.equipoPresente?.length > 0 && <div style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}>👥 {d.equipoPresente.join(", ")}</div>}
          </Card>

          {(d.pedidos || []).length > 0 && (
            <Card>
              <SectionTitle icon="📦">Pedidos ({d.pedidos.length})</SectionTitle>
              {d.pedidos.map((p, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{p.proveedor}</div>
                  {p.descripcion && <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{p.descripcion}</div>}
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <Badge text={p.estado} color={colorEstado[p.estado] || "#6366f1"} />
                    {p.responsable && <Badge text={p.responsable} color="#8b5cf6" />}
                    {p.incidencia && <Badge text="⚠️ Incidencia" color="#ef4444" />}
                  </div>
                  {p.incidencia && p.notaIncidencia && <div style={{ marginTop: 6, fontSize: 13, color: "#dc2626" }}>🔴 {p.notaIncidencia}</div>}
                </div>
              ))}
            </Card>
          )}

          {(d.incidencias || []).length > 0 && (
            <Card>
              <SectionTitle icon="⚠️">Incidencias ({d.incidencias.length})</SectionTitle>
              {d.incidencias.map((inc, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: 10, marginBottom: 8, borderLeft: "3px solid #f59e0b" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#92400e" }}>{inc.tipo}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{inc.descripcion}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {inc.responsable && <Badge text={inc.responsable} color="#8b5cf6" />}
                    {inc.resuelta && <Badge text="✓ Resuelta" color="#10b981" />}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {((d.encargos || []).length > 0 || (d.vacunas || []).length > 0 || (d.formulasMagistrales || []).length > 0) && (
            <Card>
              <SectionTitle icon="💊">Encargos</SectionTitle>
              {(d.encargos || []).map((e, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>🧪 {e.descripcion}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {e.cliente && <Badge text={`👤 ${e.cliente}`} color="#6366f1" />}
                    {e.estado && <Badge text={e.estado} color="#f59e0b" />}
                  </div>
                </div>
              ))}
              {(d.vacunas || []).map((v, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#eff6ff", borderRadius: 10, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>💉 {v.vacuna}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {v.cliente && <Badge text={`👤 ${v.cliente}`} color="#3b82f6" />}
                    {v.dosis && <Badge text={v.dosis} color="#6366f1" />}
                    {v.estado && <Badge text={v.estado} color="#f59e0b" />}
                  </div>
                </div>
              ))}
              {(d.formulasMagistrales || []).map((f, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>⚗️ {f.formula}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {f.cliente && <Badge text={`👤 ${f.cliente}`} color="#10b981" />}
                    {f.laboratorio && <Badge text={f.laboratorio} color="#6366f1" />}
                    {f.estado && <Badge text={f.estado} color="#f59e0b" />}
                  </div>
                </div>
              ))}
            </Card>
          )}

          <Card>
            <SectionTitle icon="✅">Tareas realizadas</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Limpieza", done: d.limpieza?.hecho },
                { label: "Repuesto desde fuera", done: d.repuestoFuera },
                { label: "Repuesto desde dentro", done: d.repuestoDentro },
                { label: "Almacén arreglado", done: d.almacenArreglado },
                { label: "Ordenado almacén", done: d.ordenadoAlmacen },
                { label: "Bajado cajas", done: d.bajadoCajas },
                { label: "Control de stocks", done: d.stocks },
                { label: "Revisión caducidades", done: d.caducidades },
              ].map(({ label, done }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: done ? "#065f46" : "#94a3b8" }}>
                  <span>{done ? "✅" : "⬜"}</span>{label}
                </div>
              ))}
              {d.limpieza?.zonas?.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
                  🧹 Zonas: {d.limpieza.zonas.join(", ")}
                </div>
              )}
              {d.limpieza?.notas && (
                <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>
                  📝 {d.limpieza.notas}
                </div>
              )}
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>📋 Historial de jornadas</h2>
        {historial.length === 0 && <EmptyState text="Aún no hay jornadas guardadas" />}
        {historial.map((day) => (
          <Card key={day.id} style={{ borderLeft: "4px solid #6366f1", cursor: "pointer" }} >
            <div onClick={() => setSelectedDay(day)}>
              <div style={{ fontWeight: 700, color: "#6366f1", fontSize: 14 }}>{day.fecha || day.fechaKey}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {day.turno && <Badge text={day.turno === "mañana" ? "☀️ Mañana" : "🌙 Tarde"} color="#6366f1" />}
                {day.responsable && <Badge text={`👤 ${day.responsable}`} color="#8b5cf6" />}
                <Badge text={`📦 ${(day.pedidos || []).length} pedidos`} color="#6366f1" />
                <Badge text={`⚠️ ${(day.incidencias || []).length} incid.`} color="#f59e0b" />
                <Badge text={`💊 ${(day.encargos || []).length + (day.vacunas || []).length + (day.formulasMagistrales || []).length} encargos`} color="#10b981" />
              </div>
              {day.equipoPresente?.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>👥 {day.equipoPresente.join(", ")}</div>
              )}
              <div style={{ marginTop: 10, fontSize: 12, color: "#a5b4fc", fontWeight: 600 }}>Toca para ver el detalle →</div>
            </div>
            <button onClick={() => deleteDay(day.id)} style={{ marginTop: 10, background: "#fee2e2", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#ef4444" }}>🗑 Borrar jornada</button>
          </Card>
        ))}
      </div>
    );
  };

  // ── MODAL ─────────────────────────────────────────────────
  const renderModal = () => {
    if (!showModal) return null;
    const configs = {
      pedido: {
        title: "📦 Nuevo pedido",
        fields: [
          { key: "proveedor", label: "Proveedor *", type: "text", placeholder: "Ej: Cofares, Hefame..." },
          { key: "descripcion", label: "Descripción", type: "text", placeholder: "Artículos o notas" },
          { key: "estado", label: "Estado *", type: "select", options: ESTADOS_PEDIDO },
          { key: "responsable", label: "Responsable", type: "select", options: EQUIPO },
          { key: "incidencia", label: "¿Tiene incidencia?", type: "checkbox" },
          { key: "notaIncidencia", label: "Nota de incidencia", type: "text", placeholder: "Describe la incidencia", hidden: !formData.incidencia },
        ],
        onSave: () => addItem("pedidos"),
      },
      incidencia: {
        title: "⚠️ Nueva incidencia",
        fields: [
          { key: "tipo", label: "Tipo *", type: "select", options: ["Cliente", "Stock", "Proveedor", "Técnica", "Personal", "Otro"] },
          { key: "descripcion", label: "Descripción *", type: "textarea", placeholder: "Describe la incidencia..." },
          { key: "turno", label: "Turno", type: "select", options: ["mañana", "tarde"] },
          { key: "responsable", label: "Responsable", type: "select", options: EQUIPO },
          { key: "resuelta", label: "¿Resuelta?", type: "checkbox" },
        ],
        onSave: () => addItem("incidencias"),
      },
      encargo: {
        title: "🧪 Encargo especial",
        fields: [
          { key: "descripcion", label: "Descripción *", type: "text", placeholder: "Qué se encarga..." },
          { key: "cliente", label: "Cliente", type: "text", placeholder: "Nombre del cliente" },
          { key: "responsable", label: "Responsable", type: "select", options: EQUIPO },
          { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "En gestión", "Listo", "Entregado"] },
        ],
        onSave: () => addItem("encargos"),
      },
      vacuna: {
        title: "💉 Encargo de vacuna",
        fields: [
          { key: "vacuna", label: "Vacuna *", type: "text", placeholder: "Nombre de la vacuna" },
          { key: "cliente", label: "Cliente", type: "text", placeholder: "Nombre del cliente" },
          { key: "dosis", label: "Dosis", type: "text", placeholder: "Ej: 1ª dosis" },
          { key: "responsable", label: "Responsable", type: "select", options: EQUIPO },
          { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "En camino", "Recibida", "Dispensada"] },
        ],
        onSave: () => addItem("vacunas"),
      },
      formula: {
        title: "⚗️ Fórmula magistral",
        fields: [
          { key: "formula", label: "Fórmula *", type: "text", placeholder: "Nombre/descripción de la fórmula" },
          { key: "cliente", label: "Cliente", type: "text", placeholder: "Nombre del cliente" },
          { key: "laboratorio", label: "Laboratorio", type: "text", placeholder: "Laboratorio preparador" },
          { key: "responsable", label: "Responsable", type: "select", options: EQUIPO },
          { key: "estado", label: "Estado", type: "select", options: ["Encargada", "En preparación", "Lista", "Recogida"] },
        ],
        onSave: () => addItem("formulasMagistrales"),
      },
    };

    const cfg = configs[showModal];
    if (!cfg) return null;

    return (
      <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        onClick={e => e.target === e.currentTarget && closeModal()}>
        <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
          <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{cfg.title}</h3>
            <button onClick={closeModal} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          {cfg.fields.filter(f => !f.hidden).map(field => (
            <div key={field.key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{field.label}</label>
              {field.type === "text" && <input value={formData[field.key] || ""} onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />}
              {field.type === "textarea" && <textarea value={formData[field.key] || ""} onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} rows={3} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }} />}
              {field.type === "select" && (
                <select value={formData[field.key] || ""} onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}>
                  <option value="">Seleccionar...</option>
                  {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {field.type === "checkbox" && (
                <CheckBox label={field.label} checked={!!formData[field.key]} onChange={v => setFormData(p => ({ ...p, [field.key]: v }))} />
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={closeModal} style={{ flex: 1, padding: 12, border: "2px solid #e2e8f0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancelar</button>
            <button onClick={cfg.onSave} style={{ flex: 2, padding: 12, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
          </div>
        </div>
      </div>
    );
  };

  const tabContent = { resumen: renderResumen, pedidos: renderPedidos, incidencias: renderIncidencias, encargos: renderEncargos, tareas: renderTareas, historial: renderHistorial };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh", maxWidth: 520, margin: "0 auto", position: "relative" }}>
      <div style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", padding: "20px 20px 16px", color: "#fff", boxShadow: "0 4px 24px #6366f155" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>💊</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>FarmaciaFlow</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Gestión diaria del equipo</div>
          </div>
        </div>
      </div>
      <div style={{ background: "#fff", padding: "0 12px", borderBottom: "1px solid #f1f5f9", display: "flex", overflowX: "auto", gap: 2, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px #0001" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "12px 14px", border: "none", background: "transparent", cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
            color: activeTab === tab.id ? "#6366f1" : "#94a3b8",
            borderBottom: `2px solid ${activeTab === tab.id ? "#6366f1" : "transparent"}`, transition: "all 0.2s"
          }}>{tab.label}</button>
        ))}
      </div>
      <div style={{ padding: 16, paddingBottom: 40 }}>
        {tabContent[activeTab]?.()}
      </div>
      {renderModal()}
    </div>
  );
}