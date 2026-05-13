import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LayoutDashboard, Target, BarChart3, Search, Filter, X, Edit3, Settings, TrendingUp, Award, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import logoImg from './assets/logo.png';
import * as XLSX from 'xlsx';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const SUPABASE_URL = "https://aurtxbfckcdqrhtjufpt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1cnR4YmZja2NkcXJodGp1ZnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjAyMTUsImV4cCI6MjA5NDE5NjIxNX0.RTzh2C2OwCM4DVuHmWZhf-Y6wgcBcumUZclWvXT-C9s";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const getStatusClass = (p) => p >= 85 ? 'green' : p >= 50 ? 'yellow' : 'red';
const getStatusColor = (p) => p >= 85 ? '#16a34a' : p >= 50 ? '#ca8a04' : '#dc2626';
const shortName = (n) => n?.replace(/^(SECRETARÍA DE |SECRETARÍA |COORDINACIÓN DEPARTAMENTAL DE |OFICINA ASESORA DE |EMPRESAS PÚBLICAS DE )/, '').trim() || '';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { show: { transition: { staggerChildren: 0.05 } } };

export default function App() {
  const [metas, setMetas] = useState([]);
  const [overrides, setOverrides] = useState({ general: {}, secretarias: {} });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSec, setSelectedSec] = useState('');
  const [editingOverride, setEditingOverride] = useState(null);
  const [isDataCenterOpen, setIsDataCenterOpen] = useState(false);
  const [isAdmin] = useState(new URLSearchParams(window.location.search).get('admin') === 'risaralda2025');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: m } = await sb.from('metas').select('*').order('id');
      const { data: o } = await sb.from('overrides').select('*');
      setMetas(m || []);
      const ov = { general: {}, secretarias: {} };
      o?.forEach(r => {
        if (r.type === 'general') ov.general = { pct2025: r.pct2025, pctCuat: r.pct_cuat };
        else ov.secretarias[r.id] = { pct2025: r.pct2025, pctCuat: r.pct_cuat };
      });
      setOverrides(ov);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSaveMeta = async (form) => {
    const { error } = await sb.from('metas').upsert(form);
    if (!error) { setMetas(prev => prev.map(m => m.id === form.id ? form : m)); setSelectedMeta(null); }
  };

  const handleSaveOverride = async (val) => {
    const { id, type, pct2025, pctCuat, field } = editingOverride;
    const payload = { id, type };
    payload.pct2025 = field === 'pct2025' ? val : pct2025;
    payload.pct_cuat = field === 'pctCuat' ? val : pctCuat;
    await sb.from('overrides').upsert(payload);
    setEditingOverride(null);
    fetchData();
  };

  const filteredMetas = metas.filter(m => {
    const s = !selectedSec || m.secretaria === selectedSec;
    const q = !searchTerm || m.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) || m.referencia?.toLowerCase().includes(searchTerm.toLowerCase());
    return s && q;
  });

  const secretarias = [...new Set(metas.map(m => m.secretaria))].sort();

  if (loading) return <div className="loading-screen">Cargando Plan de Desarrollo...</div>;

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="logo-container">
          <img src={logoImg} alt="Escudo" className="logo-img" />
          <div className="logo-text">
            <h1>Risaralda</h1>
            <p>Plan de Desarrollo 2024–2027</p>
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="admin-action-btn" onClick={() => setIsDataCenterOpen(true)}>
              <Settings size={14} /> Datos
            </button>
            <div className="admin-badge">Editor</div>
          </div>
        )}
      </header>

      <div className="view-container">
        {view === 'dashboard' && <Dashboard metas={metas} overrides={overrides} isAdmin={isAdmin} onEdit={(id, type, p25, pc, f) => setEditingOverride({ id, type, pct2025: p25, pctCuat: pc, field: f })} />}
        {view === 'metas' && <MetasView metas={filteredMetas} onSelect={setSelectedMeta} searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedSec={selectedSec} setSelectedSec={setSelectedSec} secretarias={secretarias} />}
      </div>

      <nav className="bottom-nav">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
          { id: 'metas', label: 'Metas', icon: <Target size={20} /> },
        ].map(t => (
          <button key={t.id} className={`nav-tab ${view === t.id ? 'active' : ''}`} onClick={() => setView(t.id)}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {selectedMeta && <MetaModal meta={selectedMeta} isAdmin={isAdmin} onClose={() => setSelectedMeta(null)} onSave={handleSaveMeta} />}
        {editingOverride && <OverrideModal data={editingOverride} onClose={() => setEditingOverride(null)} onSave={handleSaveOverride} />}
        {isDataCenterOpen && <DataCenterModal onClose={() => setIsDataCenterOpen(false)} onRefresh={fetchData} />}
      </AnimatePresence>
    </div>
  );
}

/* ─── DASHBOARD ─────────────────────────────────────────── */
function Dashboard({ metas, overrides, isAdmin, onEdit }) {
  // Cálculo de promedios consolidados con tope del 100% por meta para no distorsionar el avance real
  const calcAvg = (items, field) => {
    if (!items.length) return 0;
    const sum = items.reduce((acc, m) => acc + Math.min(m[field] || 0, 100), 0);
    return sum / items.length;
  };

  const avg2025 = overrides.general.pct2025 ?? calcAvg(metas, 'pct_cumplimiento2025');
  const avgCuat = overrides.general.pctCuat ?? calcAvg(metas, 'pct_cuatrienio');

  const bySecretaria = metas.reduce((acc, m) => { if (!acc[m.secretaria]) acc[m.secretaria] = []; acc[m.secretaria].push(m); return acc; }, {});
  const byDim = metas.reduce((acc, m) => { if (!acc[m.dimension]) acc[m.dimension] = []; acc[m.dimension].push(m); return acc; }, {});

  const secEntries = Object.entries(bySecretaria).map(([name, items]) => {
    const calc = calcAvg(items, 'pct_cumplimiento2025');
    const manual = overrides.secretarias[name]?.pct2025;
    return { name, count: items.length, avg: manual ?? calc, isManual: manual !== undefined };
  }).sort((a, b) => b.avg - a.avg);

  const kpis = [
    { label: 'Metas Totales', value: metas.length, icon: <Target size={16} />, cls: '' },
    { label: 'Cumpl. Alto', value: metas.filter(m => m.pct_cumplimiento2025 >= 85).length, icon: <Award size={16} />, cls: 'green' },
    { label: 'Cumpl. Medio', value: metas.filter(m => m.pct_cumplimiento2025 >= 50 && m.pct_cumplimiento2025 < 85).length, icon: <TrendingUp size={16} />, cls: 'yellow' },
    { label: 'Cumpl. Bajo', value: metas.filter(m => m.pct_cumplimiento2025 < 50).length, icon: <AlertTriangle size={16} />, cls: 'red' },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* KPIs */}
      <div className="kpi-grid">
        {kpis.map(k => (
          <motion.div key={k.label} variants={fadeUp} className={`kpi-card ${k.cls}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Promedios Generales */}
      <motion.div variants={fadeUp} className="avg-compliance-card">
        <div className="section-header">
          <div className="section-title">Cumplimiento Consolidado</div>
          <div className="section-headline">Resultados Vigencia 2025</div>
        </div>
        <div className="avg-row">
          {[
            { label: 'Vigencia 2025', val: avg2025, cls: getStatusClass(avg2025), barCls: '', field: 'pct2025' },
            { label: 'Cuatrienio 2024–2027', val: avgCuat, cls: 'blue', barCls: 'cuatrienio', field: 'pctCuat' },
          ].map(it => (
            <div key={it.field} className={`avg-item ${isAdmin ? 'admin-cursor' : ''}`} onClick={() => isAdmin && onEdit('general', 'general', avg2025, avgCuat, it.field)}>
              <div className="avg-label">
                <span className="avg-label-text">{it.label} {isAdmin && <Edit3 size={11} style={{verticalAlign:'middle',opacity:0.5}} />}</span>
                <span className={`avg-pct-badge ${it.cls}`}>{it.val.toFixed(1)}%</span>
              </div>
              <div className="avg-progress-wrapper">
                <motion.div className={`avg-progress-bar ${it.barCls} status-${it.cls}`} initial={{ width: 0 }} animate={{ width: `${Math.min(it.val, 100)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Por Secretaría */}
      <motion.div variants={fadeUp} className="dashboard-card">
        <div className="section-header">
          <div className="section-title">Entidades</div>
          <div className="section-headline">Cumplimiento por Dependencia</div>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          {secEntries.map((e, i) => (
            <div key={e.name} className="sec-bar-item">
              <div className="sec-bar-label">
                <span className={`sec-bar-name ${isAdmin ? 'admin-cursor' : ''}`} onClick={() => isAdmin && onEdit(e.name, 'secretaria', e.avg, null, 'pct2025')}>
                  {shortName(e.name)} {isAdmin && <Edit3 size={10} style={{ verticalAlign: 'middle', opacity: 0.4 }} />}
                  {e.isManual && <span style={{ color: '#ca8a04', fontSize: '0.65rem', marginLeft: 4 }}>⚠ ajustado</span>}
                </span>
                <div className="sec-bar-meta">
                  <span className="sec-bar-count">{e.count} metas</span>
                  <span className="sec-bar-pct" style={{ color: getStatusColor(e.avg) }}>{e.avg.toFixed(1)}%</span>
                </div>
              </div>
              <div className="sec-bar-track">
                <motion.div
                  className={`sec-bar-fill status-${getStatusClass(e.avg)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(e.avg, 100)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Por Dimensión */}
      <motion.div variants={fadeUp} className="dashboard-card">
        <div className="section-header">
          <div className="section-title">Dimensiones</div>
          <div className="section-headline">Avance por Dimensión</div>
        </div>
        <div className="dimension-grid" style={{ marginTop: '1.25rem' }}>
          {Object.entries(byDim).sort().map(([name, items]) => {
            const calcAvg = items.reduce((a, m) => a + (m.pct_cumplimiento2025 || 0), 0) / items.length;
            const manualDim = overrides.secretarias[`dim::${name}`]?.pct2025;
            const avg = manualDim ?? calcAvg;
            const sc = getStatusClass(avg);
            const colors = { green: '#16a34a', yellow: '#ca8a04', red: '#dc2626' };
            return (
              <div key={name} className={`dim-card ${isAdmin ? 'admin-cursor' : ''}`} onClick={() => isAdmin && onEdit(`dim::${name}`, 'secretaria', avg, null, 'pct2025')}>
                <div className="dim-card-name">
                  {name}
                  {manualDim !== undefined && <span style={{ color: '#ca8a04', fontSize: '0.6rem', marginLeft: 4 }}>⚠ ajustado</span>}
                  {isAdmin && <Edit3 size={10} style={{ verticalAlign: 'middle', marginLeft: 4, opacity: 0.4 }} />}
                </div>
                <div className="dim-card-bar">
                  <motion.div className="dim-card-bar-fill" style={{ background: colors[sc] }} initial={{ width: 0 }} animate={{ width: `${Math.min(avg, 100)}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
                </div>
                <div className="dim-card-bottom">
                  <span className="dim-card-count">{items.length} metas</span>
                  <span className="dim-card-pct" style={{ color: colors[sc] }}>{avg.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── METAS VIEW ─────────────────────────────────────────── */
function MetasView({ metas, onSelect, searchTerm, setSearchTerm, selectedSec, setSelectedSec, secretarias }) {
  return (
    <div>
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input type="text" placeholder="Buscar código o nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="select-box">
          <Filter size={16} />
          <select value={selectedSec} onChange={e => setSelectedSec(e.target.value)}>
            <option value="">Todas las entidades</option>
            {secretarias.map(s => <option key={s} value={s}>{shortName(s)}</option>)}
          </select>
        </div>
      </div>
      <motion.div className="metas-grid" variants={stagger} initial="hidden" animate="show">
        {metas.map(m => {
          const sc = getStatusClass(m.pct_cumplimiento2025);
          return (
            <motion.div key={m.id} variants={fadeUp} className="meta-card" onClick={() => onSelect(m)} whileTap={{ scale: 0.97 }}>
              <div className="meta-card-header">
                <div className={`status-pill ${sc}`} />
                <div style={{ flex: 1 }}>
                  <div className="meta-codigo">{m.codigo}</div>
                  <div className="meta-referencia">{m.referencia}</div>
                </div>
              </div>
              <div className="meta-card-footer">
                <div className="meta-stat"><div className="meta-stat-label">Prog.</div><div className="meta-stat-value">{m.programado2025}</div></div>
                <div className="meta-stat"><div className="meta-stat-label">Logro</div><div className="meta-stat-value">{m.logro2025}</div></div>
                <div className="meta-stat"><div className="meta-stat-label">Vig. 25</div><div className={`meta-stat-value ${sc}`}>{m.pct_cumplimiento2025?.toFixed(1)}%</div></div>
                <div className="meta-stat"><div className="meta-stat-label">Cuat.</div><div className="meta-stat-value blue">{m.pct_cuatrienio?.toFixed(1)}%</div></div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ─── META MODAL ──────────────────────────────────────────── */
function MetaModal({ meta, isAdmin, onClose, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...meta });
  const sc = getStatusClass(meta.pct_cumplimiento2025);

  const Field = ({ label, value }) => (
    <div style={{ marginBottom: '1rem' }}>
      <div className="modal-label">{label}</div>
      <div className="modal-text">{value || '—'}</div>
    </div>
  );

  const EditableField = ({ label, field, type = 'text' }) => (
    <div style={{ marginBottom: '1rem' }}>
      <div className="modal-label">{label}</div>
      {editing
        ? <input className="progress-input" type={type} value={form[field] ?? ''} onChange={e => setForm({ ...form, [field]: type === 'number' ? parseFloat(e.target.value) : e.target.value })} />
        : <div className="modal-text">{form[field] || '—'}</div>
      }
    </div>
  );

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} onClick={e => e.stopPropagation()}>
        <span className="modal-handle" />
        <button className="modal-close-btn" onClick={onClose}><X size={16} /></button>

        {/* Header */}
        <div className="modal-badge">{meta.codigo}</div>
        <div className="modal-title">{meta.secretaria}</div>
        <div className="modal-subtitle">{meta.dimension}</div>
        <div className="modal-divider" />

        {/* Contexto */}
        <div className="modal-section-title">Contexto Estratégico</div>
        <div className="modal-info-grid">
          <div className="modal-info-chip"><span className="modal-info-label">Sector</span><span className="modal-info-value">{meta.sector || '—'}</span></div>
          <div className="modal-info-chip"><span className="modal-info-label">Programa</span><span className="modal-info-value">{meta.programa || '—'}</span></div>
        </div>

        {meta.objetivo && (
          <div className="modal-highlight-box">
            <div className="modal-label">Objetivo</div>
            <div className="modal-text">{meta.objetivo}</div>
          </div>
        )}

        <div className="modal-divider" />

        {/* Detalle de la Meta */}
        <div className="modal-section-title">Detalle de la Meta</div>
        <Field label="Producto" value={meta.producto} />
        <Field label="Referencia" value={meta.referencia} />
        <Field label="Indicador de Producto" value={meta.indicador} />

        <div className="modal-divider" />

        {/* Criterios de Evaluación */}
        <div className="modal-section-title">Criterios de Evaluación</div>
        <div className="modal-stats-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="stat-box"><label>Línea Base</label>{editing ? <input type="number" value={form.linea_base ?? ''} onChange={e => setForm({ ...form, linea_base: e.target.value })} /> : <span>{meta.linea_base || '—'}</span>}</div>
          <div className="stat-box"><label>Meta Cuatrienio</label>{editing ? <input type="number" value={form.meta_cuatrienio ?? ''} onChange={e => setForm({ ...form, meta_cuatrienio: parseFloat(e.target.value) })} /> : <span>{meta.meta_cuatrienio ?? '—'}</span>}</div>
          <div className="stat-box"><label>Programado 2025</label>{editing ? <input type="number" value={form.programado2025 ?? ''} onChange={e => setForm({ ...form, programado2025: parseFloat(e.target.value) })} /> : <span>{meta.programado2025 ?? '—'}</span>}</div>
          <div className="stat-box"><label>Logro 2025</label>{editing ? <input type="number" value={form.logro2025 ?? ''} onChange={e => setForm({ ...form, logro2025: parseFloat(e.target.value) })} /> : <span>{meta.logro2025 ?? '—'}</span>}</div>
        </div>

        <div className="modal-divider" />

        {/* Evaluación */}
        <div className="modal-section-title">Evaluación (Avance %)</div>
        <div className="progress-section" style={{ marginTop: '0.75rem' }}>
          <div className="progress-header">
            <span>Vigencia 2025</span>
            <b style={{ color: getStatusColor(meta.pct_cumplimiento2025) }}>{meta.pct_cumplimiento2025?.toFixed(1)}%</b>
          </div>
          {editing
            ? <input className="progress-input" type="number" value={form.pct_cumplimiento2025} onChange={e => setForm({ ...form, pct_cumplimiento2025: parseFloat(e.target.value) })} />
            : <div className="progress-track"><div className={`progress-fill ${sc}`} style={{ width: `${Math.min(meta.pct_cumplimiento2025 || 0, 100)}%` }} /></div>
          }
        </div>
        <div className="progress-section">
          <div className="progress-header">
            <span>Cuatrienio 2024–2027</span>
            <b style={{ color: '#2563eb' }}>{meta.pct_cuatrienio?.toFixed(1)}%</b>
          </div>
          {editing
            ? <input className="progress-input" type="number" value={form.pct_cuatrienio} onChange={e => setForm({ ...form, pct_cuatrienio: parseFloat(e.target.value) })} />
            : <div className="progress-track"><div className="progress-fill blue" style={{ width: `${Math.min(meta.pct_cuatrienio || 0, 100)}%` }} /></div>
          }
        </div>

        {isAdmin && (
          <div className="modal-actions">
            {editing
              ? (<><button className="btn-primary" onClick={() => onSave(form)}>Guardar Cambios</button><button className="btn-secondary" onClick={() => { setEditing(false); setForm({ ...meta }); }}>Cancelar</button></>)
              : (<button className="btn-accent" onClick={() => setEditing(true)}>Editar Meta</button>)
            }
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── OVERRIDE MODAL ─────────────────────────────────────── */
function OverrideModal({ data, onClose, onSave }) {
  const [val, setVal] = useState((data.field === 'pct2025' ? data.pct2025 : data.pctCuat) ?? 0);
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} onClick={e => e.stopPropagation()}>
        <span className="modal-handle" />
        <button className="modal-close-btn" onClick={onClose}><X size={16} /></button>
        <div className="modal-badge">Ajuste Manual</div>
        <div className="modal-title">{data.type === 'general' ? 'Promedio General' : shortName(data.id)}</div>
        <div className="modal-subtitle">{data.field === 'pct2025' ? 'Vigencia 2025' : 'Cuatrienio 2024–2027'}</div>
        <div className="modal-divider" />
        <input className="override-value-input" type="number" min="0" max="100" step="0.1" value={val} onChange={e => setVal(parseFloat(e.target.value))} autoFocus />
        <p className="override-hint">Ingresa un valor entre 0 y 100</p>
        <div className="modal-actions">
          <button className="btn-primary" onClick={() => onSave(val)}>Guardar Ajuste</button>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── DATA CENTER MODAL ───────────────────────────────────── */
function DataCenterModal({ onClose, onRefresh }) {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [log, setLog] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("¿Estás seguro? Esto eliminará TODA la información actual de la base de datos para cargar el nuevo archivo.")) return;

    setStatus('loading');
    setLog('Leyendo archivo Excel...');

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        let allRawData = [];
        // RECORRER TODAS LAS HOJAS (DIRECCIONES/SECRETARÍAS)
        wb.SheetNames.forEach(sheetName => {
          const sheetData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
          // Guardamos el nombre de la hoja como referencia por si la fila no trae la secretaría
          const withSheetRef = sheetData.map(row => ({ ...row, _sheetName: sheetName }));
          allRawData = [...allRawData, ...withSheetRef];
        });

        setLog(`Limpiando base de datos y procesando ${allRawData.length} registros en ${wb.SheetNames.length} hojas...`);
        
        // 1. Limpiar tablas
        const { error: delMetasErr } = await sb.from('metas').delete().neq('id', 0);
        const { error: delOverErr } = await sb.from('overrides').delete().neq('id', '0');

        if (delMetasErr || delOverErr) throw new Error("Error al limpiar la base de datos");

        // Utilidades internas
        const parseNum = (val) => {
          if (val === null || val === undefined || val === '') return 0;
          if (typeof val === 'number') return val;
          const clean = String(val).replace('%', '').replace(',', '.').trim();
          const n = parseFloat(clean);
          return isNaN(n) ? 0 : n;
        };

        // Utilidad para buscar columnas con validación de tipo para evitar colisiones (ej. Programa vs Programado)
        const findCol = (row, names, isNumeric = false) => {
          const keys = Object.keys(row);
          let foundValue = null;
          let foundKeyName = null;

          for (let targetName of names) {
            const target = targetName.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            // Buscar una coincidencia que cumpla el criterio de tipo
            const match = keys.find(k => {
              const key = k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              const isMatch = key.includes(target) || target.includes(key);
          // 2. Mapear e insertar todas las metas
        const newMetas = allRawData
          .filter(row => {
            const hasInfo = Object.values(row).some(v => v !== null && v !== "" && v !== undefined);
            return hasInfo;
          })
          .map((row, idx) => {
            // NORMALIZACIÓN DE CABECERAS (Elimina espacios extra, saltos de línea, tildes)
            const normalizedRow = {};
            Object.keys(row).forEach(k => {
              const normK = k.toLowerCase()
                .trim()
                .replace(/\s+/g, ' ') // Colapsa múltiples espacios a uno solo
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
              normalizedRow[normK] = row[k];
            });

            // Función de búsqueda sobre cabeceras ya normalizadas
            const getVal = (targets, isNum = false) => {
              for (let t of targets) {
                const normT = t.toLowerCase().trim().replace(/\s+/g, ' ').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (normalizedRow[normT] !== undefined) {
                  const val = normalizedRow[normT];
                  if (isNum) {
                    const n = parseNum(val);
                    // Si buscamos un número pero encontramos texto largo, probablemente es la columna equivocada (ej. Programa vs Programado)
                    if (typeof val === 'string' && val.length > 20 && isNaN(parseFloat(val))) continue;
                    return n;
                  }
                  return val;
                }
              }
              return null;
            };

            const prog25 = getVal(["programado 2025", "meta 2025", "programado", "prog 2025"], true);
            const logr25 = getVal(["logro 2025", "ejecutado 2025", "avance 2025", "logro me", "real 2025"], true);
            
            // Buscar porcentajes por patrón
            const normKeys = Object.keys(normalizedRow);
            const pctCols = normKeys.filter(k => k.includes("porcenta") || k.includes("pct") || k.includes("cumplimiento"));
            const rawPct25 = pctCols.length > 0 ? normalizedRow[pctCols[0]] : null;
            const rawPctCuat = pctCols.length > 1 ? normalizedRow[pctCols[1]] : (pctCols.length > 0 ? normalizedRow[pctCols[0]] : null);

            const progCuat = getVal(["meta cuatrienio", "meta cua", "total programado", "2024-2027"], true);
            const logrCuat = getVal(["logro cuatrienio", "avance total", "real total"], true);

            let v25 = 0;
            if (rawPct25 !== null && rawPct25 !== undefined) {
              v25 = parseNum(rawPct25);
              if (v25 <= 1.1 && v25 > 0) v25 *= 100;
            } else if (prog25 > 0) v25 = (logr25 / prog25) * 100;

            let vCuat = 0;
            if (rawPctCuat !== null && rawPctCuat !== undefined) {
              vCuat = parseNum(rawPctCuat);
              if (vCuat <= 1.1 && vCuat > 0) vCuat *= 100;
            } else if (progCuat > 0) vCuat = (logrCuat / progCuat) * 100;

            const sec = getVal(["entidad responsable", "entidad r", "secretaria", "dependencia", "direccion"]) || row._sheetName || "GENERAL";

            return {
              id: idx + 1,
              codigo: getVal(["codigo meta", "codigo interno meta", "codigo", "meta", "id"]) || `M-${idx}`,
              referencia: getVal(["referencia", "ref", "descripcion"]) || "",
              programado2025: prog25,
              linea_base: String(getVal(["linea base"]) || ""),
              logro2025: logr25,
              pct_cumplimiento2025: v25,
              meta_cuatrienio: progCuat,
              pct_cuatrienio: vCuat,
              secretaria: String(sec).toUpperCase().trim(),
              dimension: String(getVal(["dimension", "eje", "estrategico", "linea estrategica"]) || "GENERAL").toUpperCase().trim(),
              programa: getVal(["programa"]) || "",
              objetivo: getVal(["objetivo"]) || "",
              sector: getVal(["sector"]) || "",
              producto: getVal(["meta producto", "producto"]) || "",
              indicador: getVal(["indicador"]) || "",
              datos_extra: row // GUARDAMOS TODA LA FILA ORIGINAL
            };
          });

        // Insertar en bloques de 50 para evitar errores de payload
        for (let i = 0; i < newMetas.length; i += 50) {
          const chunk = newMetas.slice(i, i + 50);
          const { error: insErr } = await sb.from('metas').insert(chunk);
          if (insErr) {
            console.error("Error Supabase:", insErr);
            throw new Error(`Error en bloque ${i}: ${insErr.message} (${insErr.details})`);
          }
          setLog(`Insertando: ${Math.min(i + 50, newMetas.length)} / ${newMetas.length}`);
        }

        setLog("¡Importación exitosa!");
        setStatus('success');
        setTimeout(() => { onRefresh(); onClose(); }, 1500);
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error(err);
      setLog(`Error: ${err.message}`);
      setStatus('error');
    }
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={e => e.stopPropagation()}>
        <span className="modal-handle" />
        <div className="modal-badge">Centro de Datos</div>
        <div className="modal-title">Actualización Masiva</div>
        <div className="modal-subtitle">Sube un archivo Excel para resetear el plan</div>
        <div className="modal-divider" />
        
        <div style={{ padding: '1rem 0', textAlign: 'center' }}>
          {status === 'idle' && (
            <div className="upload-zone">
              <label htmlFor="excel-upload" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <TrendingUp size={18} /> Seleccionar Excel (.xlsx)
              </label>
              <input id="excel-upload" type="file" accept=".xlsx, .xls" onChange={handleFile} style={{ display: 'none' }} />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1rem' }}>
                El archivo debe tener las columnas exactas del formato oficial.
              </p>
            </div>
          )}

          {status === 'loading' && (
            <div style={{ padding: '2rem 0' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p style={{ fontWeight: '700', color: 'var(--brand-green)' }}>{log}</p>
            </div>
          )}

          {status === 'success' && (
            <div style={{ color: '#16a34a', padding: '2rem 0' }}>
              <Award size={48} style={{ marginBottom: '1rem' }} />
              <p style={{ fontWeight: '800' }}>¡Base de datos actualizada!</p>
            </div>
          )}

          {status === 'error' && (
            <div style={{ color: '#dc2626', padding: '2rem 0' }}>
              <AlertTriangle size={48} style={{ marginBottom: '1rem' }} />
              <p style={{ fontWeight: '800' }}>Falló la importación</p>
              <p style={{ fontSize: '0.8rem' }}>{log}</p>
              <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setStatus('idle')}>Reintentar</button>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={status === 'loading'}>Cerrar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
