"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { db } from "./firebase"
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc } from "firebase/firestore"

const EQUIPO = ["Elisa", "Laura", "Irene", "Gonzalo", "Andrea", "Rocio", "Victoria", "Esther", "Antonio"]
const ZONAS_LIMPIEZA = ["Mostrador", "Almacen", "Sala trasera", "Bano", "Zona fria", "Escaparate", "Suelo general"]
const ESTADOS_PEDIDO = ["Recibido", "Gestionado", "Metido"]
const colorEstado = { Recibido: "#f59e0b", Gestionado: "#3b82f6", Metido: "#10b981" }
const PIN_CORRECTO = "1234"

const todayKey = () => new Date().toISOString().slice(0, 10)
const todayLabel = () => new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
const formatDateKey = (dateStr) => { const d = new Date(dateStr); return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }) }

const emptyTurno = () => ({
  pedidos: [], incidencias: [], encargos: [], vacunas: [], formulasMagistrales: [],
  limpieza: { zonas: [], hecho: false, notas: "" },
  stocks: false, caducidades: false, almacenArreglado: false,
  repuestoFuera: false, repuestoDentro: false, ordenadoAlmacen: false, bajadoCajas: false,
  responsable: "", equipoPresente: [], notaTraspaso: "",
})

const emptyDay = () => ({
  fecha: todayLabel(), fechaKey: todayKey(),
  turnos: { manana: emptyTurno(), tarde: emptyTurno() },
})

// PIN SCREEN
function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const handleKey = (k) => {
    if (k === "del") { setPin(p => p.slice(0, -1)); setError(""); return }
    const next = pin + k
    setPin(next)
    if (next.length === 4) {
      if (next === PIN_CORRECTO) { onUnlock() }
      else { setError("PIN incorrecto"); setTimeout(() => { setPin(""); setError("") }, 800) }
    }
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 40, width: "100%", maxWidth: 300, textAlign: "center", boxShadow: "0 20px 60px #0003" }}>
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
            <button key={i} onClick={() => handleKey(k)} style={{ padding: "16px 0", borderRadius: 12, border: "none", background: k === "del" ? "#fee2e2" : "#f8fafc", color: k === "del" ? "#ef4444" : "#1e293b", fontSize: k === "del" ? 18 : 20, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {k === "del" ? "⌫" : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// FOTO UPLOADER
function FotoUploader({ fotos = [], onChange }) {
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert("La foto es demasiado grande. Maximo 2MB."); return }
    setLoading(true)
    const reader = new FileReader()
    reader.onload = (ev) => { onChange([...fotos, ev.target.result]); setLoading(false) }
    reader.readAsDataURL(file)
    e.target.value = ""
  }
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: fotos.length > 0 ? 10 : 0 }}>
        {fotos.map((url, i) => (
          <div key={i} style={{ position: "relative" }}>
            <img src={url} alt="foto" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: "2px solid #e2e8f0", cursor: "pointer" }} onClick={() => window.open(url)} />
            <button onClick={() => onChange(fotos.filter((_, j) => j !== i))} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✕</button>
          </div>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      <button onClick={() => fileRef.current?.click()} disabled={loading} style={{ padding: "8px 14px", background: loading ? "#e2e8f0" : "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", color: "#16a34a", fontFamily: "inherit" }}>
        {loading ? "⏳ Procesando..." : "📸 Añadir foto"}
      </button>
    </div>
  )
}

// UI COMPONENTS
const Badge = ({ text, color }) => (<span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: color + "22", color, border: `1px solid ${color}44` }}>{text}</span>)
const Card = ({ children, style = {} }) => (<div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px #0001", border: "1px solid #f1f5f9", ...style }}>{children}</div>)
const SectionTitle = ({ children, icon }) => (<h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><span>{icon}</span>{children}</h3>)
const EmptyState = ({ text }) => (<div style={{ textAlign: "center", padding: "32px 20px", color: "#94a3b8", fontSize: 14 }}><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>{text}</div>)
const CheckBox = ({ label, checked, onChange }) => (
  <button onClick={() => onChange(!checked)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: checked ? "#d1fae5" : "#fff", border: `2px solid ${checked ? "#10b981" : "#e2e8f0"}`, borderRadius: 10, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit", fontSize: 14, color: checked ? "#065f46" : "#475569", fontWeight: checked ? 600 : 400, width: "100%", textAlign: "left" }}>
    <span style={{ fontSize: 18 }}>{checked ? "✅" : "⬜"}</span>{label}
  </button>
)
const Pill = ({ label, onClick, active }) => (<button onClick={onClick} style={{ padding: "5px 13px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: active ? "#6366f1" : "#f1f5f9", color: active ? "#fff" : "#64748b", border: "none", transition: "all 0.2s", fontFamily: "inherit" }}>{label}</button>)

const TurnoSelector = ({ turno, onChange }) => (
  <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", border: "2px solid #e0e7ff", background: "#eef2ff" }}>
    <button onClick={() => onChange("manana")} style={{ flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", background: turno === "manana" ? "#fbbf24" : "transparent", color: turno === "manana" ? "#92400e" : "#6366f1", transition: "all 0.2s" }}>☀️ Mañana</button>
    <button onClick={() => onChange("tarde")} style={{ flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", background: turno === "tarde" ? "#6366f1" : "transparent", color: turno === "tarde" ? "#fff" : "#6366f1", transition: "all 0.2s" }}>🌙 Tarde</button>
  </div>
)

const StatsBar = ({ value, max, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 20, overflow: "hidden" }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: 20, transition: "width 0.4s" }} />
    </div>
    <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 16 }}>{value}</span>
  </div>
)

const ResumenVisual = ({ turnoData }) => {
  const tareas = [turnoData.stocks, turnoData.caducidades, turnoData.almacenArreglado, turnoData.repuestoFuera, turnoData.repuestoDentro, turnoData.ordenadoAlmacen, turnoData.bajadoCajas, turnoData.limpieza.hecho].filter(Boolean).length
  const pedidosMetidos = (turnoData.pedidos || []).filter(p => p.estado === "Metido").length
  const incidenciasResueltas = (turnoData.incidencias || []).filter(i => i.resuelta).length
  const encargosEntregados = (turnoData.encargos || []).filter(e => e.estado === "Entregado").length
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {[
        { icon: "📦", count: (turnoData.pedidos || []).length, label: "Pedidos", sub: `${pedidosMetidos} metidos`, color: "#3b82f6", bg: "#eff6ff" },
        { icon: "⚠️", count: (turnoData.incidencias || []).length, label: "Incidencias", sub: `${incidenciasResueltas} resueltas`, color: "#f59e0b", bg: "#fffbeb" },
        { icon: "💊", count: (turnoData.encargos || []).length + (turnoData.vacunas || []).length + (turnoData.formulasMagistrales || []).length, label: "Encargos", sub: `${encargosEntregados} entregados`, color: "#10b981", bg: "#f0fdf4" },
        { icon: "✅", count: `${tareas}/8`, label: "Tareas", sub: null, color: "#8b5cf6", bg: "#f5f3ff", pct: tareas / 8 },
      ].map(({ icon, count, label, sub, color, bg, pct }) => (
        <div key={label} style={{ background: bg, borderRadius: 14, padding: 16, border: `1px solid ${color}33` }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color }}>{count}</div>
          <div style={{ fontSize: 12, color: color + "99", fontWeight: 600 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 4 }}>{sub}</div>}
          {pct !== undefined && <div style={{ marginTop: 6, height: 6, background: color + "33", borderRadius: 20, overflow: "hidden" }}><div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 20 }} /></div>}
        </div>
      ))}
    </div>
  )
}

const DayResumenCard = ({ day, onClick, isToday }) => {
  const getStats = (td) => ({
    pedidos: (td.pedidos || []).length,
    incidencias: (td.incidencias || []).length,
    encargos: (td.encargos || []).length + (td.vacunas || []).length + (td.formulasMagistrales || []).length,
    tareas: [td.stocks, td.caducidades, td.almacenArreglado, td.repuestoFuera, td.repuestoDentro, td.ordenadoAlmacen, td.bajadoCajas, td.limpieza?.hecho].filter(Boolean).length,
    responsable: td.responsable,
  })
  const m = getStats(day.turnos?.manana || emptyTurno())
  const t = getStats(day.turnos?.tarde || emptyTurno())
  return (
    <Card style={{ cursor: "pointer", borderLeft: isToday ? "4px solid #6366f1" : "4px solid #f1f5f9" }}>
      <div onClick={onClick}>
        <div style={{ fontWeight: 700, color: isToday ? "#6366f1" : "#1e293b", fontSize: 14, marginBottom: 12 }}>
          {isToday ? "🔵 Hoy — " : ""}{day.fecha || day.fechaKey}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div style={{ background: "#fffbeb", borderRadius: 10, padding: "10px 12px", border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>☀️ Mañana</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Badge text={`📦${m.pedidos}`} color="#3b82f6" />
              <Badge text={`⚠️${m.incidencias}`} color="#f59e0b" />
              <Badge text={`✅${m.tareas}/8`} color="#10b981" />
            </div>
            {m.responsable && <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>{m.responsable}</div>}
          </div>
          <div style={{ background: "#eef2ff", borderRadius: 10, padding: "10px 12px", border: "1px solid #c7d2fe" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", marginBottom: 6 }}>🌙 Tarde</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Badge text={`📦${t.pedidos}`} color="#3b82f6" />
              <Badge text={`⚠️${t.incidencias}`} color="#f59e0b" />
              <Badge text={`✅${t.tareas}/8`} color="#10b981" />
            </div>
            {t.responsable && <div style={{ fontSize: 11, color: "#4338ca", marginTop: 4 }}>{t.responsable}</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Total:</span>
          <Badge text={`📦${m.pedidos + t.pedidos}`} color="#3b82f6" />
          <Badge text={`⚠️${m.incidencias + t.incidencias}`} color="#f59e0b" />
          <Badge text={`✅${m.tareas + t.tareas}/16`} color="#10b981" />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#a5b4fc", fontWeight: 600 }}>Toca para ver el detalle →</div>
      </div>
    </Card>
  )
}

const EstadisticasSemana = ({ historial }) => {
  const last7 = historial.slice(0, 7).reverse()
  const stats = last7.map(d => {
    const m = d.turnos?.manana || emptyTurno()
    const t = d.turnos?.tarde || emptyTurno()
    return {
      fecha: formatDateKey(d.fechaKey),
      pedidos: (m.pedidos || []).length + (t.pedidos || []).length,
      incidencias: (m.incidencias || []).length + (t.incidencias || []).length,
      tareas: [m.stocks, m.caducidades, m.almacenArreglado, m.repuestoFuera, m.repuestoDentro, m.ordenadoAlmacen, m.bajadoCajas, m.limpieza?.hecho, t.stocks, t.caducidades, t.almacenArreglado, t.repuestoFuera, t.repuestoDentro, t.ordenadoAlmacen, t.bajadoCajas, t.limpieza?.hecho].filter(Boolean).length,
    }
  })
  const maxPedidos = Math.max(...stats.map(s => s.pedidos), 1)
  const maxIncidencias = Math.max(...stats.map(s => s.incidencias), 1)
  const totalPedidos = stats.reduce((a, s) => a + s.pedidos, 0)
  const totalIncidencias = stats.reduce((a, s) => a + s.incidencias, 0)
  const avgTareas = stats.length > 0 ? Math.round(stats.reduce((a, s) => a + s.tareas, 0) / stats.length) : 0
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div style={{ background: "#eff6ff", borderRadius: 14, padding: 14, textAlign: "center", border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#3b82f6" }}>{totalPedidos}</div>
          <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 600 }}>Pedidos</div>
        </div>
        <div style={{ background: "#fffbeb", borderRadius: 14, padding: 14, textAlign: "center", border: "1px solid #fde68a" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#f59e0b" }}>{totalIncidencias}</div>
          <div style={{ fontSize: 11, color: "#fcd34d", fontWeight: 600 }}>Incidencias</div>
        </div>
        <div style={{ background: "#f0fdf4", borderRadius: 14, padding: 14, textAlign: "center", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#10b981" }}>{avgTareas}/16</div>
          <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 600 }}>Tareas/día</div>
        </div>
      </div>
      <Card>
        <SectionTitle icon="📊">Actividad semanal</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 60, fontSize: 12, fontWeight: 600, color: "#64748b" }}>{s.fecha}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <StatsBar value={s.pedidos} max={maxPedidos} color="#3b82f6" />
                <StatsBar value={s.incidencias} max={maxIncidencias} color="#f59e0b" />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}><div style={{ width: 12, height: 12, borderRadius: 4, background: "#3b82f6" }} />Pedidos</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}><div style={{ width: 12, height: 12, borderRadius: 4, background: "#f59e0b" }} />Incidencias</div>
        </div>
      </Card>
    </div>
  )
}

// MAIN APP
export default function App() {
  const [unlocked, setUnlocked] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("ff_unlocked") === "1")
  const [activeTab, setActiveTab] = useState("resumen")
  const [dayData, setDayData] = useState(emptyDay())
  const [activeTurno, setActiveTurno] = useState("manana")
  const [showModal, setShowModal] = useState(null)
  const [formData, setFormData] = useState({})
  const [editingItem, setEditingItem] = useState(null)
  const [historial, setHistorial] = useState([])
  const [savedMsg, setSavedMsg] = useState("")
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedDayTurno, setSelectedDayTurno] = useState("manana")
  const [editingHistorialDay, setEditingHistorialDay] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  const handleUnlock = () => { sessionStorage.setItem("ff_unlocked", "1"); setUnlocked(true) }

  // Cargar jornada de hoy desde Firebase
  useEffect(() => {
    if (!unlocked) return
    const unsub = onSnapshot(doc(db, "jornadas", todayKey()), (snap) => {
      if (snap.exists()) setDayData({ ...emptyDay(), ...snap.data() })
    })
    return () => unsub()
  }, [unlocked])

  // Cargar historial desde Firebase
  useEffect(() => {
    if (!unlocked) return
    const q = query(collection(db, "jornadas"), orderBy("fechaKey", "desc"))
    const unsub = onSnapshot(q, (snap) => { setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() }))) })
    return () => unsub()
  }, [unlocked])

  if (!unlocked) return <PinScreen onUnlock={handleUnlock} />

  const turnoData = dayData.turnos?.[activeTurno] || emptyTurno()

  const saveDay = async () => {
    setSaving(true)
    try {
      const updated = { ...dayData, fechaKey: todayKey(), fecha: todayLabel() }
      await setDoc(doc(db, "jornadas", todayKey()), updated)
      setSavedMsg("✓ Guardado correctamente")
    } catch { setSavedMsg("❌ Error al guardar.") }
    setSaving(false)
    setTimeout(() => setSavedMsg(""), 3000)
  }

  const saveHistorialDay = async (updatedData) => {
    try {
      await setDoc(doc(db, "jornadas", updatedData.fechaKey), updatedData)
      setEditingHistorialDay(null)
      setSelectedDay(updatedData)
      setSavedMsg("✓ Jornada actualizada")
      setTimeout(() => setSavedMsg(""), 3000)
    } catch { alert("Error al guardar.") }
  }

  const deleteDay = async (fechaKey) => {
    if (!window.confirm("¿Seguro que quieres borrar esta jornada?")) return
    try { await deleteDoc(doc(db, "jornadas", fechaKey)); setSelectedDay(null) } catch { alert("Error al borrar.") }
  }

  const updateTurno = (key, value) => {
    setDayData(prev => ({ ...prev, turnos: { ...prev.turnos, [activeTurno]: { ...(prev.turnos?.[activeTurno] || emptyTurno()), [key]: value } } }))
  }

  const openModal = (type, item = null) => { setShowModal(type); setFormData(item ? { ...item } : {}); setEditingItem(item ? { key: type, id: item.id } : null) }
  const closeModal = () => { setShowModal(null); setFormData({}); setEditingItem(null) }

  const addItem = (key) => {
    const currentItems = turnoData[key] || []
    if (editingItem) { updateTurno(key, currentItems.map(i => i.id === editingItem.id ? { ...formData, id: editingItem.id } : i)) }
    else { updateTurno(key, [...currentItems, { ...formData, id: Date.now(), turno: activeTurno }]) }
    closeModal()
  }

  const removeItem = (key, id) => updateTurno(key, (turnoData[key] || []).filter(i => i.id !== id))

  const toggleLimpiezaZona = (zona) => {
    const zonas = turnoData.limpieza.zonas.includes(zona) ? turnoData.limpieza.zonas.filter(z => z !== zona) : [...turnoData.limpieza.zonas, zona]
    updateTurno("limpieza", { ...turnoData.limpieza, zonas })
  }

  const pendientes = historial.filter(d => d.fechaKey !== todayKey()).flatMap(d => {
    const items = []
    ;["manana", "tarde"].forEach(t => {
      const td = d.turnos?.[t] || emptyTurno()
      items.push(
        ...(td.encargos || []).filter(e => e.estado !== "Entregado").map(e => ({ ...e, tipo: "encargo", fecha: d.fecha, fechaKey: d.fechaKey })),
        ...(td.vacunas || []).filter(v => v.estado !== "Dispensada").map(v => ({ ...v, tipo: "vacuna", fecha: d.fecha, fechaKey: d.fechaKey })),
        ...(td.formulasMagistrales || []).filter(f => f.estado !== "Recogida").map(f => ({ ...f, tipo: "formula", fecha: d.fecha, fechaKey: d.fechaKey })),
      )
    })
    return items
  })

  const filteredHistorial = useMemo(() => historial.filter(d => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return d.fecha?.toLowerCase().includes(q) ||
      d.turnos?.manana?.responsable?.toLowerCase().includes(q) ||
      d.turnos?.tarde?.responsable?.toLowerCase().includes(q) ||
      (d.turnos?.manana?.pedidos || []).some(p => p.proveedor?.toLowerCase().includes(q)) ||
      (d.turnos?.tarde?.pedidos || []).some(p => p.proveedor?.toLowerCase().includes(q))
  }), [historial, searchQuery])

  const inputStyle = { padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none" }
  const addBtnStyle = { padding: "8px 16px", background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
  const deleteBtnStyle = { width: 28, height: 28, borderRadius: 8, border: "none", background: "#fee2e2", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
  const editBtnStyle = { width: 28, height: 28, borderRadius: 8, border: "none", background: "#eff6ff", color: "#3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }

  const tabs = [
    { id: "resumen", label: "🏠 Inicio" }, { id: "pedidos", label: "📦 Pedidos" },
    { id: "incidencias", label: "⚠️ Incid." }, { id: "encargos", label: "💊 Encargos" },
    { id: "tareas", label: "✅ Tareas" }, { id: "semana", label: "📅 Semana" },
    { id: "historial", label: "📋 Historial" },
  ]

  const renderResumen = () => {
    const notaAnterior = activeTurno === "tarde" && dayData.turnos?.manana?.notaTraspaso
      ? dayData.turnos.manana.notaTraspaso
      : historial.find(d => d.fechaKey !== todayKey())?.turnos?.tarde?.notaTraspaso
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Hoy</div>
          <div style={{ fontSize: 15, color: "#334155", fontWeight: 700, marginBottom: 14 }}>{todayLabel()}</div>
          <TurnoSelector turno={activeTurno} onChange={setActiveTurno} />
        </Card>
        {notaAnterior && (<Card style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb" }}><SectionTitle icon="📝">Nota del turno anterior</SectionTitle><div style={{ fontSize: 14, color: "#92400e" }}>{notaAnterior}</div></Card>)}
        {pendientes.length > 0 && (
          <Card style={{ borderLeft: "4px solid #ef4444", background: "#fef2f2" }}>
            <SectionTitle icon="🔔">Pendientes de días anteriores ({pendientes.length})</SectionTitle>
            {pendientes.slice(0, 5).map((p, i) => (<div key={i} style={{ padding: "8px 12px", background: "#fff", borderRadius: 10, marginBottom: 8, fontSize: 13 }}><div style={{ fontWeight: 700, color: "#1e293b" }}>{p.tipo === "encargo" ? "🧪 " : p.tipo === "vacuna" ? "💉 " : "⚗️ "}{p.descripcion || p.vacuna || p.formula}</div><div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>{p.cliente && <Badge text={p.cliente} color="#6366f1" />}{p.estado && <Badge text={p.estado} color="#f59e0b" />}<Badge text={formatDateKey(p.fechaKey)} color="#94a3b8" /></div></div>))}
            {pendientes.length > 5 && <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>+{pendientes.length - 5} más...</div>}
          </Card>
        )}
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Responsable del turno</label>
              <select value={turnoData.responsable} onChange={e => updateTurno("responsable", e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}>
                <option value="">Seleccionar...</option>
                {EQUIPO.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Equipo presente</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EQUIPO.map(nombre => { const active = (turnoData.equipoPresente || []).includes(nombre); return (<button key={nombre} onClick={() => { const p = turnoData.equipoPresente || []; updateTurno("equipoPresente", active ? p.filter(n => n !== nombre) : [...p, nombre]) }} style={{ padding: "8px 16px", borderRadius: 30, fontSize: 14, fontWeight: 600, cursor: "pointer", background: active ? "#6366f1" : "#f8fafc", color: active ? "#fff" : "#64748b", border: `2px solid ${active ? "#6366f1" : "#e2e8f0"}`, fontFamily: "inherit" }}>{nombre}</button>) })}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <SectionTitle icon={activeTurno === "manana" ? "☀️" : "🌙"}>Resumen del turno de {activeTurno === "manana" ? "mañana" : "tarde"}</SectionTitle>
          <ResumenVisual turnoData={turnoData} />
        </Card>
        <Card>
          <SectionTitle icon="📝">Nota de traspaso</SectionTitle>
          <textarea value={turnoData.notaTraspaso || ""} onChange={e => updateTurno("notaTraspaso", e.target.value)} placeholder="Escribe aquí lo que debe saber el siguiente turno..." rows={3} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }} />
        </Card>
        <button onClick={saveDay} disabled={saving} style={{ background: saving ? "#a5b4fc" : "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px #6366f144" }}>{saving ? "⏳ Guardando..." : "💾 Guardar jornada"}</button>
        {savedMsg && <div style={{ textAlign: "center", color: savedMsg.startsWith("✓") ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: 15 }}>{savedMsg}</div>}
        <button onClick={() => { sessionStorage.removeItem("ff_unlocked"); setUnlocked(false) }} style={{ background: "none", border: "none", color: "#cbd5e1", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>🔒 Bloquear app</button>
      </div>
    )
  }

  const renderPedidos = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>📦 Pedidos</h2><button onClick={() => openModal("pedido")} style={addBtnStyle}>+ Añadir</button></div>
      <TurnoSelector turno={activeTurno} onChange={setActiveTurno} />
      {(turnoData.pedidos || []).length === 0 && <EmptyState text="No hay pedidos en este turno" />}
      {(turnoData.pedidos || []).map(p => (
        <Card key={p.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>{p.proveedor}</div>
              {p.descripcion && <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{p.descripcion}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}><Badge text={p.estado} color={colorEstado[p.estado] || "#6366f1"} />{p.responsable && <Badge text={p.responsable} color="#8b5cf6" />}{p.incidencia && <Badge text="⚠️ Incidencia" color="#ef4444" />}</div>
              {p.incidencia && p.notaIncidencia && <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>🔴 {p.notaIncidencia}</div>}
              {(p.fotos || []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{p.fotos.map((url, i) => <img key={i} src={url} alt="foto" onClick={() => window.open(url)} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "2px solid #e2e8f0" }} />)}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => openModal("pedido", p)} style={editBtnStyle}>✏️</button>
              <button onClick={() => removeItem("pedidos", p.id)} style={deleteBtnStyle}>✕</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )

  const renderIncidencias = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>⚠️ Incidencias</h2><button onClick={() => openModal("incidencia")} style={addBtnStyle}>+ Añadir</button></div>
      <TurnoSelector turno={activeTurno} onChange={setActiveTurno} />
      {(turnoData.incidencias || []).length === 0 && <EmptyState text="Sin incidencias en este turno 🎉" />}
      {(turnoData.incidencias || []).map(inc => (
        <Card key={inc.id} style={{ borderLeft: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#92400e", fontSize: 15 }}>{inc.tipo}</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{inc.descripcion}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{inc.responsable && <Badge text={inc.responsable} color="#8b5cf6" />}{inc.resuelta && <Badge text="✓ Resuelta" color="#10b981" />}</div>
              {(inc.fotos || []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{inc.fotos.map((url, i) => <img key={i} src={url} alt="foto" onClick={() => window.open(url)} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "2px solid #e2e8f0" }} />)}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => openModal("incidencia", inc)} style={editBtnStyle}>✏️</button>
              <button onClick={() => removeItem("incidencias", inc.id)} style={deleteBtnStyle}>✕</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )

  const renderEncargos = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>💊 Encargos</h2>
      <TurnoSelector turno={activeTurno} onChange={setActiveTurno} />
      <Card><SectionTitle icon="🧪">Encargos especiales</SectionTitle><button onClick={() => openModal("encargo")} style={{ ...addBtnStyle, marginBottom: 12 }}>+ Añadir</button>{(turnoData.encargos || []).length === 0 && <EmptyState text="Sin encargos especiales" />}{(turnoData.encargos || []).map(e => (<div key={e.id} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{e.descripcion}</div><div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>{e.cliente && <Badge text={e.cliente} color="#6366f1" />}{e.responsable && <Badge text={e.responsable} color="#8b5cf6" />}{e.estado && <Badge text={e.estado} color={e.estado === "Entregado" ? "#10b981" : "#f59e0b"} />}</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => openModal("encargo", e)} style={editBtnStyle}>✏️</button><button onClick={() => removeItem("encargos", e.id)} style={deleteBtnStyle}>✕</button></div></div>))}</Card>
      <Card><SectionTitle icon="💉">Vacunas</SectionTitle><button onClick={() => openModal("vacuna")} style={{ ...addBtnStyle, marginBottom: 12 }}>+ Añadir</button>{(turnoData.vacunas || []).length === 0 && <EmptyState text="Sin vacunas" />}{(turnoData.vacunas || []).map(v => (<div key={v.id} style={{ padding: "10px 14px", background: "#eff6ff", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{v.vacuna}</div><div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>{v.cliente && <Badge text={v.cliente} color="#3b82f6" />}{v.dosis && <Badge text={`Dosis: ${v.dosis}`} color="#6366f1" />}{v.estado && <Badge text={v.estado} color={v.estado === "Dispensada" ? "#10b981" : "#f59e0b"} />}</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => openModal("vacuna", v)} style={editBtnStyle}>✏️</button><button onClick={() => removeItem("vacunas", v.id)} style={deleteBtnStyle}>✕</button></div></div>))}</Card>
      <Card><SectionTitle icon="⚗️">Fórmulas magistrales</SectionTitle><button onClick={() => openModal("formula")} style={{ ...addBtnStyle, marginBottom: 12 }}>+ Añadir</button>{(turnoData.formulasMagistrales || []).length === 0 && <EmptyState text="Sin fórmulas" />}{(turnoData.formulasMagistrales || []).map(f => (<div key={f.id} style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{f.formula}</div><div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>{f.cliente && <Badge text={f.cliente} color="#10b981" />}{f.laboratorio && <Badge text={f.laboratorio} color="#6366f1" />}{f.estado && <Badge text={f.estado} color={f.estado === "Recogida" ? "#10b981" : "#f59e0b"} />}</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => openModal("formula", f)} style={editBtnStyle}>✏️</button><button onClick={() => removeItem("formulasMagistrales", f.id)} style={deleteBtnStyle}>✕</button></div></div>))}</Card>
    </div>
  )

  const renderTareas = () => {
    const tareasDone = [turnoData.stocks, turnoData.caducidades, turnoData.almacenArreglado, turnoData.repuestoFuera, turnoData.repuestoDentro, turnoData.ordenadoAlmacen, turnoData.bajadoCajas, turnoData.limpieza?.hecho].filter(Boolean).length
    const pct = Math.round((tareasDone / 8) * 100)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>✅ Tareas del día</h2>
        <TurnoSelector turno={activeTurno} onChange={setActiveTurno} />
        <Card><SectionTitle icon="📊">Progreso</SectionTitle><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: "#64748b", fontSize: 14 }}>{tareasDone} de 8 completadas</span><span style={{ color: "#6366f1", fontWeight: 700, fontSize: 14 }}>{pct}%</span></div><div style={{ background: "#e2e8f0", borderRadius: 20, height: 12, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #10b981)", borderRadius: 20, transition: "width 0.4s" }} /></div></Card>
        <Card><SectionTitle icon="🧹">Limpieza</SectionTitle><CheckBox label="Se ha limpiado" checked={turnoData.limpieza?.hecho || false} onChange={v => updateTurno("limpieza", { ...turnoData.limpieza, hecho: v })} />{turnoData.limpieza?.hecho && (<div style={{ marginTop: 12 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Zonas:</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{ZONAS_LIMPIEZA.map(zona => (<Pill key={zona} label={zona} active={(turnoData.limpieza?.zonas || []).includes(zona)} onClick={() => toggleLimpiezaZona(zona)} />))}</div><textarea value={turnoData.limpieza?.notas || ""} onChange={e => updateTurno("limpieza", { ...turnoData.limpieza, notas: e.target.value })} placeholder="Notas de limpieza..." rows={3} style={{ padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical" }} /></div>)}</Card>
        <Card><SectionTitle icon="📦">Almacén y stock</SectionTitle><div style={{ display: "flex", flexDirection: "column", gap: 8 }}><CheckBox label="Repuesto desde fuera" checked={turnoData.repuestoFuera || false} onChange={v => updateTurno("repuestoFuera", v)} /><CheckBox label="Repuesto desde dentro" checked={turnoData.repuestoDentro || false} onChange={v => updateTurno("repuestoDentro", v)} /><CheckBox label="Almacén arreglado" checked={turnoData.almacenArreglado || false} onChange={v => updateTurno("almacenArreglado", v)} /><CheckBox label="Ordenado el almacén" checked={turnoData.ordenadoAlmacen || false} onChange={v => updateTurno("ordenadoAlmacen", v)} /><CheckBox label="Bajado cajas" checked={turnoData.bajadoCajas || false} onChange={v => updateTurno("bajadoCajas", v)} /></div></Card>
        <Card><SectionTitle icon="📋">Control y revisión</SectionTitle><div style={{ display: "flex", flexDirection: "column", gap: 8 }}><CheckBox label="Control de stocks" checked={turnoData.stocks || false} onChange={v => updateTurno("stocks", v)} /><CheckBox label="Revisión de caducidades" checked={turnoData.caducidades || false} onChange={v => updateTurno("caducidades", v)} /></div></Card>
      </div>
    )
  }

  const renderSemana = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>📅 Vista semanal</h2>
      {historial.length === 0 ? <EmptyState text="No hay datos todavía" /> : (
        <>
          <EstadisticasSemana historial={historial} />
          <Card>
            <SectionTitle icon="📅">Últimos 7 días</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {historial.slice(0, 7).map(day => (
                <DayResumenCard key={day.fechaKey} day={day} isToday={day.fechaKey === todayKey()} onClick={() => { setSelectedDay(day); setActiveTab("historial") }} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )

  const renderHistorial = () => {
    if (editingHistorialDay) {
      const d = editingHistorialDay
      const updateH = (turno, key, value) => setEditingHistorialDay(prev => prev ? { ...prev, turnos: { ...prev.turnos, [turno]: { ...(prev.turnos?.[turno] || emptyTurno()), [key]: value } } } : null)
      const HCheckBox = ({ label, checked, onChange }) => (<button onClick={() => onChange(!checked)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: checked ? "#d1fae5" : "#fff", border: `2px solid ${checked ? "#10b981" : "#e2e8f0"}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: checked ? "#065f46" : "#475569", fontWeight: checked ? 600 : 400, width: "100%", textAlign: "left" }}><span style={{ fontSize: 18 }}>{checked ? "✅" : "⬜"}</span>{label}</button>)
      const td = d.turnos?.[selectedDayTurno] || emptyTurno()
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><button onClick={() => setEditingHistorialDay(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#64748b" }}>← Cancelar</button><h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", flex: 1 }}>✏️ Editar jornada</h2></div>
          <TurnoSelector turno={selectedDayTurno} onChange={setSelectedDayTurno} />
          <Card>
            <SectionTitle icon="📋">Datos del turno</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select value={td.responsable || ""} onChange={e => updateH(selectedDayTurno, "responsable", e.target.value)} style={{ padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none", width: "100%", boxSizing: "border-box" }}><option value="">Responsable...</option>{EQUIPO.map(n => <option key={n} value={n}>{n}</option>)}</select>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Equipo presente:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{EQUIPO.map(nombre => { const active = (td.equipoPresente || []).includes(nombre); return (<button key={nombre} onClick={() => { const p = td.equipoPresente || []; updateH(selectedDayTurno, "equipoPresente", active ? p.filter(n => n !== nombre) : [...p, nombre]) }} style={{ padding: "6px 14px", borderRadius: 30, fontSize: 13, fontWeight: 600, cursor: "pointer", background: active ? "#6366f1" : "#f8fafc", color: active ? "#fff" : "#64748b", border: `2px solid ${active ? "#6366f1" : "#e2e8f0"}`, fontFamily: "inherit" }}>{nombre}</button>) })}  </div>
              <textarea value={td.notaTraspaso || ""} onChange={e => updateH(selectedDayTurno, "notaTraspaso", e.target.value)} placeholder="Nota de traspaso..." rows={2} style={{ padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical" }} />
            </div>
          </Card>
          <Card>
            <SectionTitle icon="📦">Pedidos</SectionTitle>
            {(td.pedidos || []).map((p, i) => (<div key={i} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 10 }}><div style={{ display: "flex", flexDirection: "column", gap: 6 }}><input value={p.proveedor || ""} onChange={e => { const arr = [...td.pedidos]; arr[i] = { ...arr[i], proveedor: e.target.value }; updateH(selectedDayTurno, "pedidos", arr) }} placeholder="Proveedor" style={{ padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none", width: "100%", boxSizing: "border-box" }} /><input value={p.descripcion || ""} onChange={e => { const arr = [...td.pedidos]; arr[i] = { ...arr[i], descripcion: e.target.value }; updateH(selectedDayTurno, "pedidos", arr) }} placeholder="Descripción" style={{ padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none", width: "100%", boxSizing: "border-box" }} /><select value={p.estado || "Recibido"} onChange={e => { const arr = [...td.pedidos]; arr[i] = { ...arr[i], estado: e.target.value }; updateH(selectedDayTurno, "pedidos", arr) }} style={{ padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none", width: "100%", boxSizing: "border-box" }}>{ESTADOS_PEDIDO.map(o => <option key={o} value={o}>{o}</option>)}</select><button onClick={() => updateH(selectedDayTurno, "pedidos", td.pedidos.filter((_, j) => j !== i))} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#ef4444", alignSelf: "flex-start" }}>🗑 Eliminar</button></div></div>))}
            <button onClick={() => updateH(selectedDayTurno, "pedidos", [...(td.pedidos || []), { id: Date.now(), proveedor: "", descripcion: "", estado: "Recibido" }])} style={{ padding: "8px 16px", background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Añadir pedido</button>
          </Card>
          <Card>
            <SectionTitle icon="✅">Tareas</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <HCheckBox label="Limpieza" checked={td.limpieza?.hecho || false} onChange={v => updateH(selectedDayTurno, "limpieza", { ...td.limpieza, hecho: v })} />
              <HCheckBox label="Repuesto desde fuera" checked={td.repuestoFuera || false} onChange={v => updateH(selectedDayTurno, "repuestoFuera", v)} />
              <HCheckBox label="Repuesto desde dentro" checked={td.repuestoDentro || false} onChange={v => updateH(selectedDayTurno, "repuestoDentro", v)} />
              <HCheckBox label="Almacén arreglado" checked={td.almacenArreglado || false} onChange={v => updateH(selectedDayTurno, "almacenArreglado", v)} />
              <HCheckBox label="Ordenado el almacén" checked={td.ordenadoAlmacen || false} onChange={v => updateH(selectedDayTurno, "ordenadoAlmacen", v)} />
              <HCheckBox label="Bajado cajas" checked={td.bajadoCajas || false} onChange={v => updateH(selectedDayTurno, "bajadoCajas", v)} />
              <HCheckBox label="Control de stocks" checked={td.stocks || false} onChange={v => updateH(selectedDayTurno, "stocks", v)} />
              <HCheckBox label="Revisión de caducidades" checked={td.caducidades || false} onChange={v => updateH(selectedDayTurno, "caducidades", v)} />
            </div>
          </Card>
          <div style={{ display: "flex", gap: 10 }}><button onClick={() => setEditingHistorialDay(null)} style={{ flex: 1, padding: 12, border: "2px solid #e2e8f0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancelar</button><button onClick={() => saveHistorialDay(d)} style={{ flex: 2, padding: 12, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>💾 Guardar cambios</button></div>
        </div>
      )
    }

    if (selectedDay) {
      const d = selectedDay
      const td = d.turnos?.[selectedDayTurno] || emptyTurno()
      const tareasDone = [td.stocks, td.caducidades, td.almacenArreglado, td.repuestoFuera, td.repuestoDentro, td.ordenadoAlmacen, td.bajadoCajas, td.limpieza?.hecho].filter(Boolean).length
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><button onClick={() => setSelectedDay(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#64748b" }}>← Volver</button><h2 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", flex: 1 }}>{d.fecha}</h2><button onClick={() => setEditingHistorialDay({ ...d })} style={{ background: "#eff6ff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#3b82f6" }}>✏️ Editar</button><button onClick={() => deleteDay(d.fechaKey)} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#ef4444" }}>🗑 Borrar</button></div>
          <TurnoSelector turno={selectedDayTurno} onChange={setSelectedDayTurno} />
          <Card><SectionTitle icon="📋">Resumen</SectionTitle><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{td.responsable && <Badge text={td.responsable} color="#8b5cf6" />}<Badge text={`✅ ${tareasDone}/8`} color="#10b981" /><Badge text={`📦 ${(td.pedidos || []).length}`} color="#3b82f6" /><Badge text={`⚠️ ${(td.incidencias || []).length}`} color="#f59e0b" /></div>{(td.equipoPresente || []).length > 0 && <div style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}>👥 {td.equipoPresente.join(", ")}</div>}{td.notaTraspaso && <div style={{ marginTop: 10, padding: "8px 12px", background: "#fffbeb", borderRadius: 8, fontSize: 13, color: "#92400e" }}>📝 {td.notaTraspaso}</div>}</Card>
          {(td.pedidos || []).length > 0 && <Card><SectionTitle icon="📦">Pedidos</SectionTitle>{td.pedidos.map((p, i) => (<div key={i} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{p.proveedor}</div>{p.descripcion && <div style={{ fontSize: 13, color: "#64748b" }}>{p.descripcion}</div>}<div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}><Badge text={p.estado} color={colorEstado[p.estado] || "#6366f1"} />{p.incidencia && <Badge text="⚠️" color="#ef4444" />}</div>{(p.fotos || []).length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 8 }}>{p.fotos.map((url, fi) => <img key={fi} src={url} alt="foto" onClick={() => window.open(url)} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "2px solid #e2e8f0" }} />)}</div>}</div>))}</Card>}
          {(td.incidencias || []).length > 0 && <Card><SectionTitle icon="⚠️">Incidencias</SectionTitle>{td.incidencias.map((inc, i) => (<div key={i} style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: 10, marginBottom: 8, borderLeft: "3px solid #f59e0b" }}><div style={{ fontWeight: 700, color: "#92400e", fontSize: 14 }}>{inc.tipo}</div><div style={{ fontSize: 13, color: "#64748b" }}>{inc.descripcion}</div><div style={{ display: "flex", gap: 6, marginTop: 6 }}>{inc.responsable && <Badge text={inc.responsable} color="#8b5cf6" />}{inc.resuelta && <Badge text="✓ Resuelta" color="#10b981" />}</div>{(inc.fotos || []).length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 8 }}>{inc.fotos.map((url, fi) => <img key={fi} src={url} alt="foto" onClick={() => window.open(url)} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "2px solid #e2e8f0" }} />)}</div>}</div>))}</Card>}
          <Card><SectionTitle icon="✅">Tareas</SectionTitle><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[{ label: "Limpieza", done: td.limpieza?.hecho }, { label: "Repuesto desde fuera", done: td.repuestoFuera }, { label: "Repuesto desde dentro", done: td.repuestoDentro }, { label: "Almacén arreglado", done: td.almacenArreglado }, { label: "Ordenado almacén", done: td.ordenadoAlmacen }, { label: "Bajado cajas", done: td.bajadoCajas }, { label: "Control de stocks", done: td.stocks }, { label: "Revisión caducidades", done: td.caducidades }].map(({ label, done }) => (<div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: done ? "#065f46" : "#94a3b8" }}><span>{done ? "✅" : "⬜"}</span>{label}</div>))}</div></Card>
        </div>
      )
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>📋 Historial</h2>
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por fecha, responsable, proveedor..." style={{ padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none", width: "100%", boxSizing: "border-box" }} />
        {filteredHistorial.length === 0 && <EmptyState text="No hay jornadas guardadas" />}
        {filteredHistorial.map(day => (
          <DayResumenCard key={day.fechaKey} day={day} isToday={day.fechaKey === todayKey()} onClick={() => setSelectedDay(day)} />
        ))}
      </div>
    )
  }

  const renderModal = () => {
    if (!showModal) return null
    const inputS = { padding: "10px 12px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none", width: "100%", boxSizing: "border-box" }
    const configs = {
      pedido: { title: editingItem ? "✏️ Editar pedido" : "📦 Nuevo pedido", fields: [{ key: "proveedor", label: "Proveedor *", type: "text", placeholder: "Ej: Cofares, Hefame..." }, { key: "descripcion", label: "Descripción", type: "text", placeholder: "Artículos o notas" }, { key: "estado", label: "Estado *", type: "select", options: ESTADOS_PEDIDO }, { key: "responsable", label: "Responsable", type: "select", options: EQUIPO }, { key: "incidencia", label: "¿Tiene incidencia?", type: "checkbox" }, { key: "notaIncidencia", label: "Nota de incidencia", type: "text", placeholder: "Describe la incidencia", hidden: !formData.incidencia }, { key: "fotos", label: "📸 Fotos", type: "fotos" }], onSave: () => addItem("pedidos") },
      incidencia: { title: editingItem ? "✏️ Editar incidencia" : "⚠️ Nueva incidencia", fields: [{ key: "tipo", label: "Tipo *", type: "select", options: ["Cliente", "Stock", "Proveedor", "Técnica", "Personal", "Otro"] }, { key: "descripcion", label: "Descripción *", type: "textarea", placeholder: "Describe la incidencia..." }, { key: "responsable", label: "Responsable", type: "select", options: EQUIPO }, { key: "resuelta", label: "¿Resuelta?", type: "checkbox" }, { key: "fotos", label: "📸 Fotos", type: "fotos" }], onSave: () => addItem("incidencias") },
      encargo: { title: editingItem ? "✏️ Editar encargo" : "🧪 Encargo especial", fields: [{ key: "descripcion", label: "Descripción *", type: "text", placeholder: "Qué se encarga..." }, { key: "cliente", label: "Cliente", type: "text", placeholder: "Nombre del cliente" }, { key: "responsable", label: "Responsable", type: "select", options: EQUIPO }, { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "En gestión", "Listo", "Entregado"] }], onSave: () => addItem("encargos") },
      vacuna: { title: editingItem ? "✏️ Editar vacuna" : "💉 Vacuna", fields: [{ key: "vacuna", label: "Vacuna *", type: "text", placeholder: "Nombre de la vacuna" }, { key: "cliente", label: "Cliente", type: "text", placeholder: "Nombre del cliente" }, { key: "dosis", label: "Dosis", type: "text", placeholder: "Ej: 1ª dosis" }, { key: "responsable", label: "Responsable", type: "select", options: EQUIPO }, { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "En camino", "Recibida", "Dispensada"] }], onSave: () => addItem("vacunas") },
      formula: { title: editingItem ? "✏️ Editar fórmula" : "⚗️ Fórmula magistral", fields: [{ key: "formula", label: "Fórmula *", type: "text", placeholder: "Nombre/descripción" }, { key: "cliente", label: "Cliente", type: "text", placeholder: "Nombre del cliente" }, { key: "laboratorio", label: "Laboratorio", type: "text", placeholder: "Laboratorio preparador" }, { key: "responsable", label: "Responsable", type: "select", options: EQUIPO }, { key: "estado", label: "Estado", type: "select", options: ["Encargada", "En preparación", "Lista", "Recogida"] }], onSave: () => addItem("formulasMagistrales") },
    }
    const cfg = configs[showModal]
    if (!cfg) return null
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && closeModal()}>
        <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
          <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{cfg.title}</h3><button onClick={closeModal} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button></div>
          {cfg.fields.filter(f => !f.hidden).map(field => (
            <div key={field.key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{field.label}</label>
              {field.type === "text" && <input value={formData[field.key] || ""} onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} style={inputS} />}
              {field.type === "textarea" && <textarea value={formData[field.key] || ""} onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} rows={3} style={{ ...inputS, resize: "vertical" }} />}
              {field.type === "select" && <select value={formData[field.key] || ""} onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} style={inputS}><option value="">Seleccionar...</option>{field.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}
              {field.type === "checkbox" && <CheckBox label={field.label} checked={!!formData[field.key]} onChange={v => setFormData(p => ({ ...p, [field.key]: v }))} />}
              {field.type === "fotos" && <FotoUploader fotos={formData[field.key] || []} onChange={urls => setFormData(p => ({ ...p, [field.key]: urls }))} />}
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={closeModal} style={{ flex: 1, padding: 12, border: "2px solid #e2e8f0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancelar</button>
            <button onClick={cfg.onSave} style={{ flex: 2, padding: 12, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{editingItem ? "Guardar cambios" : "Guardar"}</button>
          </div>
        </div>
      </div>
    )
  }

  const tabContent = { resumen: renderResumen, pedidos: renderPedidos, incidencias: renderIncidencias, encargos: renderEncargos, tareas: renderTareas, semana: renderSemana, historial: renderHistorial }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh", maxWidth: 520, margin: "0 auto", position: "relative" }}>
      <div style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", padding: "20px 20px 16px", color: "#fff", boxShadow: "0 4px 24px #6366f155" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>💊</div>
          <div><div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>FarmaciaFlow</div><div style={{ fontSize: 12, opacity: 0.85 }}>Gestión diaria del equipo</div></div>
          {pendientes.length > 0 && <div style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>🔔 {pendientes.length}</div>}
        </div>
      </div>
      <div style={{ background: "#fff", padding: "0 4px", borderBottom: "1px solid #f1f5f9", display: "flex", overflowX: "auto", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px #0001" }}>
        {tabs.map(tab => (<button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== "historial") { setSelectedDay(null); setEditingHistorialDay(null) } }} style={{ padding: "12px 8px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", color: activeTab === tab.id ? "#6366f1" : "#94a3b8", borderBottom: `2px solid ${activeTab === tab.id ? "#6366f1" : "transparent"}`, transition: "all 0.2s" }}>{tab.label}</button>))}
      </div>
      <div style={{ padding: 16, paddingBottom: 40 }}>{tabContent[activeTab]?.()}</div>
      {renderModal()}
    </div>
  )
}
