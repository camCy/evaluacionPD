/* ===== APP.JS - Metas de Producto 2025 (Supabase Version) ===== */

// Supabase Config
const SUPABASE_URL = "https://aurtxbfckcdqrhtjufpt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1cnR4YmZja2NkcXJodGp1ZnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjAyMTUsImV4cCI6MjA5NDE5NjIxNX0.RTzh2C2OwCM4DVuHmWZhf-Y6wgcBcumUZclWvXT-C9s";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let currentData = [];
let overrides = { general: {}, secretarias: {} };
let currentView = 'dashboard';
let charts = {};
let isAdmin = new URLSearchParams(window.location.search).get('admin') === 'risaralda2025';

// Helpers
function getStatusClass(pct) { return pct >= 85 ? 'green' : pct >= 50 ? 'yellow' : 'red'; }
function getStatusColor(pct) { return pct >= 85 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626'; }
function formatPct(v) { return typeof v === 'number' ? v.toFixed(1) + '%' : '0%'; }
function shortName(name) {
  return name.replace(/^(SECRETARÍA DE |SECRETARÍA |COORDINACIÓN DEPARTAMENTAL DE |OFICINA ASESORA DE |EMPRESAS PÚBLICAS DE )/, '').trim();
}

// Data Fetching
async function loadData() {
  showToast('Cargando datos desde Supabase...', 'info');
  
  // Fetch Metas
  const { data: metas, error: metasError } = await sb.from('metas').select('*').order('id', { ascending: true });
  if (metasError) {
    console.error('Error metas:', metasError);
    showToast('Error al cargar metas', 'error');
  } else {
    currentData = metas.map(m => ({
        ...m,
        lineaBase: m.linea_base,
        pctCumplimiento2025: m.pct_cumplimiento2025,
        metaCuatrienio: m.meta_cuatrienio,
        pctCuatrienio: m.pct_cuatrienio
    }));
  }

  // Fetch Overrides
  const { data: overData, error: overError } = await sb.from('overrides').select('*');
  if (overError) {
    console.error('Error overrides:', overError);
  } else {
    overrides = { general: {}, secretarias: {} };
    overData.forEach(o => {
      if (o.type === 'general') {
        overrides.general = { pct2025: o.pct2025, pctCuat: o.pct_cuat };
      } else {
        overrides.secretarias[o.id] = { pct2025: o.pct2025, pctCuat: o.pct_cuat };
      }
    });
  }

  populateSelects();
  renderDashboard();
  renderMetas();
  if (currentView === 'charts') renderCharts();
}

async function persistMeta(m) {
  const { error } = await sb.from('metas').upsert({
    id: m.id,
    codigo: m.codigo,
    referencia: m.referencia,
    programado2025: m.programado2025,
    linea_base: m.lineaBase,
    logro2025: m.logro2025,
    pct_cumplimiento2025: m.pctCumplimiento2025,
    meta_cuatrienio: m.metaCuatrienio,
    pct_cuatrienio: m.pctCuatrienio,
    secretaria: m.secretaria,
    dimension: m.dimension,
    programa: m.programa,
    objetivo: m.objetivo,
    sector: m.sector,
    producto: m.producto,
    indicador: m.indicador
  });
  if (error) {
    console.error('Error save:', error);
    showToast('Error al guardar en la nube', 'error');
  } else {
    showToast('Guardado en la nube', 'success');
  }
}

async function persistOverride(id, type, pct2025, pctCuat) {
  const { error } = await sb.from('overrides').upsert({
    id: id,
    type: type,
    pct2025: pct2025,
    pct_cuat: pctCuat
  });
  if (error) showToast('Error al guardar ajuste', 'error');
}

// ... Rest of the helper functions from previous app.js ...
function getSecretarias() {
  const s = new Set();
  currentData.forEach(m => { if (m.secretaria) s.add(m.secretaria); });
  return [...s].sort();
}

function getDimensiones() {
  const d = new Set();
  currentData.forEach(m => { if (m.dimension) d.add(m.dimension); });
  return [...d].sort();
}

function groupBy(arr, key) {
  const g = {};
  arr.forEach(item => {
    const k = item[key] || 'Sin clasificar';
    if (!g[k]) g[k] = [];
    g[k].push(item);
  });
  return g;
}

function avgPct(arr, field) {
  if (!arr.length) return 0;
  return arr.reduce((s, m) => s + (m[field] || 0), 0) / arr.length;
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ===== NAVIGATION =====
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');
  if (view === 'charts') renderCharts();
}

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

// ===== DASHBOARD =====
function renderDashboard() {
  const total = currentData.length;
  const green = currentData.filter(m => m.pctCumplimiento2025 >= 85).length;
  const yellow = currentData.filter(m => m.pctCumplimiento2025 >= 50 && m.pctCumplimiento2025 < 85).length;
  const red = currentData.filter(m => m.pctCumplimiento2025 < 50).length;

  animateCounter('kpi-total-value', total);
  animateCounter('kpi-green-value', green);
  animateCounter('kpi-yellow-value', yellow);
  animateCounter('kpi-red-value', red);

  const avg2025 = overrides.general.pct2025 !== undefined ? overrides.general.pct2025 : avgPct(currentData, 'pctCumplimiento2025');
  const avgCuat = overrides.general.pctCuat !== undefined ? overrides.general.pctCuat : avgPct(currentData, 'pctCuatrienio');

  setTimeout(() => {
    const bar2025 = document.getElementById('avg-bar-2025');
    const barCuat = document.getElementById('avg-bar-cuatrienio');
    if (!bar2025) return;
    bar2025.style.setProperty('--progress', Math.min(avg2025, 100) + '%');
    barCuat.style.setProperty('--progress', Math.min(avgCuat, 100) + '%');
    document.getElementById('avg-text-2025').textContent = avg2025.toFixed(1) + '%';
    document.getElementById('avg-text-cuatrienio').textContent = avgCuat.toFixed(1) + '%';
    document.getElementById('avg-text-2025').classList.toggle('is-manual', overrides.general.pct2025 !== undefined);
    document.getElementById('avg-text-cuatrienio').classList.toggle('is-manual', overrides.general.pctCuat !== undefined);
  }, 100);

  renderSecretariaBars();
  renderDimensionGrid();
}

window.editGeneral = async function(field) {
  const current = field === 'pct2025' ? (overrides.general.pct2025 || avgPct(currentData, 'pctCumplimiento2025')) : (overrides.general.pctCuat || avgPct(currentData, 'pctCuatrienio'));
  const newVal = prompt(`Ajustar promedio general ${field === 'pct2025' ? '2025' : 'Cuatrienio'} (%):`, current.toFixed(1));
  if (newVal !== null) {
    const val = parseFloat(newVal);
    if (!isNaN(val)) {
      overrides.general[field] = val;
      await persistOverride('general', 'general', overrides.general.pct2025, overrides.general.pctCuat);
      renderDashboard();
    }
  }
};

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current;
  }, 30);
}

function renderSecretariaBars() {
  const container = document.getElementById('secretaria-bars');
  if (!container) return;
  const bySecretaria = groupBy(currentData, 'secretaria');
  const entries = Object.entries(bySecretaria).map(([name, metas]) => {
    const calculated = avgPct(metas, 'pctCumplimiento2025');
    const manual = overrides.secretarias[name] ? overrides.secretarias[name].pct2025 : undefined;
    return { name, count: metas.length, avg: manual !== undefined ? manual : calculated, isManual: manual !== undefined };
  }).sort((a, b) => b.avg - a.avg);

  container.innerHTML = entries.map(e => {
    const sc = getStatusClass(e.avg);
    const labelHtml = isAdmin ? 
      `<span onclick="event.stopPropagation(); window.editSecretaria('${e.name}')" title="Ajustar manualmente" style="cursor:pointer">
        ${shortName(e.name)} ${e.isManual ? '⚠️' : ''}
      </span>` :
      `<span>${shortName(e.name)}</span>`;

    return `<div class="sec-bar-item">
      <div class="sec-bar-label">
        ${labelHtml}
        <span class="sec-bar-pct" style="color:${getStatusColor(e.avg)}">${e.avg.toFixed(1)}%</span>
      </div>
      <div class="sec-bar-track" onclick="event.stopPropagation(); window.openSecretaria('${e.name}')">
        <div class="sec-bar-fill status-${sc}" style="width:${Math.min(e.avg, 100)}%"><span class="sec-bar-count">${e.count}</span></div>
      </div>
    </div>`;
  }).join('');
}

window.openSecretaria = function(name) {
  switchView('secretarias');
  document.getElementById('secretaria-select').value = name;
  renderMetas();
};

window.editSecretaria = async function(name) {
  const current = overrides.secretarias[name] ? overrides.secretarias[name].pct2025 : avgPct(currentData.filter(m => m.secretaria === name), 'pctCumplimiento2025');
  const newVal = prompt(`Ajustar promedio de "${shortName(name)}" (%):`, current.toFixed(1));
  if (newVal !== null) {
    if (newVal === "") {
      delete overrides.secretarias[name];
      await sb.from('overrides').delete().eq('id', name);
    } else {
      const val = parseFloat(newVal);
      if (!isNaN(val)) {
        if (!overrides.secretarias[name]) overrides.secretarias[name] = {};
        overrides.secretarias[name].pct2025 = val;
        await persistOverride(name, 'secretaria', val, null);
      }
    }
    renderDashboard();
  }
};

function renderDimensionGrid() {
  const container = document.getElementById('dimension-grid');
  if (!container) return;
  const byDim = groupBy(currentData, 'dimension');
  const dims = Object.entries(byDim).sort(([a], [b]) => a.localeCompare(b));
  container.innerHTML = dims.map(([name, metas], i) => {
    const avg = avgPct(metas, 'pctCumplimiento2025');
    return `<div class="dim-card">
      <div class="dim-card-name">${name}</div>
      <div class="dim-card-stats">
        <div class="dim-stat"><div class="dim-stat-value">${metas.length}</div><div class="dim-stat-label">Metas</div></div>
        <div class="dim-stat"><div class="dim-stat-value" style="color:${getStatusColor(avg)}">${avg.toFixed(1)}%</div><div class="dim-stat-label">Promedio</div></div>
      </div>
    </div>`;
  }).join('');
}

// ===== METAS VIEW =====
function renderMetas(searchTerm = '') {
  const container = document.getElementById('metas-container');
  const select = document.getElementById('secretaria-select');
  if (!container || !select) return;
  let filtered = [...currentData];
  if (select.value) filtered = filtered.filter(m => m.secretaria === select.value);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(m =>
      (m.codigo || '').toLowerCase().includes(q) ||
      (m.referencia || '').toLowerCase().includes(q) ||
      (m.programa || '').toLowerCase().includes(q)
    );
  }
  document.getElementById('results-count').textContent = filtered.length + ' metas';
  if (!filtered.length) {
    container.innerHTML = '<div class="no-data"><p>No se encontraron metas</p></div>';
    return;
  }
  const byDim = groupBy(filtered, 'dimension');
  const dims = Object.entries(byDim).sort(([a], [b]) => a.localeCompare(b));
  container.innerHTML = dims.map(([dimName, metas], di) => {
    return `<div class="dimension-group">
      <div class="dimension-header" onclick="this.classList.toggle('collapsed'); this.nextElementSibling.classList.toggle('collapsed')">
        <div class="dimension-header-text">${dimName}</div>
        <div class="dimension-header-count">${metas.length}</div>
      </div>
      <div class="dimension-metas">
        ${metas.map(m => renderMetaCard(m)).join('')}
      </div>
    </div>`;
  }).join('');
}

function renderMetaCard(m) {
  const sc = getStatusClass(m.pctCumplimiento2025);
  return `<div class="meta-card" onclick="openModal(${m.id})">
    <div class="meta-card-top">
      <div class="meta-status-dot ${sc}"></div>
      <div class="meta-card-info">
        <div class="meta-codigo">${m.codigo}</div>
        <div class="meta-referencia">${m.referencia}</div>
      </div>
    </div>
    <div class="meta-card-bottom">
      <div class="meta-stat"><div class="meta-stat-label">Vig. 2025</div><div class="meta-stat-value pct-${sc}">${formatPct(m.pctCumplimiento2025)}</div></div>
      <div class="meta-stat"><div class="meta-stat-label">Cuatrienio</div><div class="meta-stat-value pct-blue">${formatPct(m.pctCuatrienio)}</div></div>
    </div>
  </div>`;
}

// ===== MODAL =====
function openModal(id) {
  const m = currentData.find(x => x.id === id);
  if (!m) return;
  renderModalContent(m, false);
  document.getElementById('modal-overlay').hidden = false;
  document.body.style.overflow = 'hidden';
}

function renderModalContent(m, isEditing) {
  const sc2025 = getStatusClass(m.pctCumplimiento2025);
  document.getElementById('modal-title').textContent = m.codigo + ' — ' + shortName(m.secretaria);
  let content = `
    <div class="modal-field"><div class="modal-field-label">Referencia Meta</div><div class="modal-field-value">${m.referencia}</div></div>
    <div class="modal-stats-grid">
      <div class="modal-stat-box"><div class="modal-stat-box-label">Prog. 2025</div>${isEditing ? `<input type="number" id="edit-prog" value="${m.programado2025}" class="modal-input">` : `<div class="modal-stat-box-value">${m.programado2025}</div>`}</div>
      <div class="modal-stat-box"><div class="modal-stat-box-label">Logro 2025</div>${isEditing ? `<input type="number" id="edit-logro" value="${m.logro2025}" class="modal-input">` : `<div class="modal-stat-box-value">${m.logro2025}</div>`}</div>
    </div>
    <div class="modal-progress">
      <div class="modal-progress-label"><span>Vigencia 2025</span><span style="color:${getStatusColor(m.pctCumplimiento2025)}">${formatPct(m.pctCumplimiento2025)}</span></div>
      ${isEditing ? `<input type="number" id="edit-pct2025" value="${m.pctCumplimiento2025}" class="modal-input-pct">%` : `<div class="modal-progress-track"><div class="modal-progress-fill ${sc2025}" style="width:${Math.min(m.pctCumplimiento2025, 100)}%"></div></div>`}
    </div>
    <div class="modal-progress" style="margin-top:10px">
      <div class="modal-progress-label"><span>Cuatrienio</span><span style="color:var(--blue-600)">${formatPct(m.pctCuatrienio)}</span></div>
      ${isEditing ? `<input type="number" id="edit-pct-cuat" value="${m.pctCuatrienio}" class="modal-input-pct">%` : `<div class="modal-progress-track"><div class="modal-progress-fill blue" style="width:${Math.min(m.pctCuatrienio, 100)}%"></div></div>`}
    </div>
    <div class="modal-actions">
      ${isAdmin ? (isEditing ? 
        `<button class="btn-save" onclick="saveMeta(${m.id})">Guardar</button>
         <button class="btn-cancel" onclick="renderModalContent(currentData.find(x=>x.id===${m.id}), false)">Cancelar</button>` : 
        `<button class="btn-edit" onclick="renderModalContent(currentData.find(x=>x.id===${m.id}), true)">Editar</button>`) : ''}
    </div>
  `;
  document.getElementById('modal-body').innerHTML = content;
}

window.saveMeta = async function(id) {
  const m = currentData.find(x => x.id === id);
  if (!m) return;
  m.programado2025 = parseFloat(document.getElementById('edit-prog').value) || 0;
  m.logro2025 = parseFloat(document.getElementById('edit-logro').value) || 0;
  m.pctCumplimiento2025 = parseFloat(document.getElementById('edit-pct2025').value) || 0;
  m.pctCuatrienio = parseFloat(document.getElementById('edit-pct-cuat').value) || 0;
  await persistMeta(m);
  renderDashboard();
  renderMetas(document.getElementById('search-input').value);
  renderModalContent(m, false);
};

function closeModal() {
  document.getElementById('modal-overlay').hidden = true;
  document.body.style.overflow = '';
}
document.getElementById('modal-close').addEventListener('click', closeModal);

// ===== SEARCH =====
document.getElementById('search-input').addEventListener('input', (e) => {
  if (currentView !== 'secretarias') switchView('secretarias');
  renderMetas(e.target.value);
});

// ===== CHARTS (Omitted for brevity, same logic as before) =====
function renderCharts() { /* logic here... */ }

function populateSelects() {
  const secs = getSecretarias();
  const select = document.getElementById('secretaria-select');
  if (!select) return;
  select.innerHTML = '<option value="">— Todas las Secretarías —</option>' + secs.map(s => `<option value="${s}">${s}</option>`).join('');
  select.onchange = () => renderMetas();
}

// ===== UPLOAD =====
async function processFile(file) {
    // Similar to previous processFile but calls await persistMeta(m) for each record
    showToast('Migrando datos a Supabase...', 'info');
    // ... logic to read Excel ...
    // ... loop and await persistMeta(m) ...
    await loadData();
}

// ===== INIT =====
loadData();
