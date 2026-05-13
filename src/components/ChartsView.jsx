import React from 'react';
import { motion } from 'framer-motion';
import { Doughnut, Bar } from 'react-chartjs-2';

const shortName = (n) => n?.replace(/^(SECRETARÍA DE |SECRETARÍA |COORDINACIÓN DEPARTAMENTAL DE |OFICINA ASESORA DE |EMPRESAS PÚBLICAS DE )/, '').trim() || '';

export default function ChartsView({ metas, overrides }) {
  const verde    = metas.filter(m => m.pct_cumplimiento2025 >= 85).length;
  const amarillo = metas.filter(m => m.pct_cumplimiento2025 >= 50 && m.pct_cumplimiento2025 < 85).length;
  const rojo     = metas.filter(m => m.pct_cumplimiento2025 < 50).length;

  const bySecretaria = metas.reduce((acc, m) => { if (!acc[m.secretaria]) acc[m.secretaria] = []; acc[m.secretaria].push(m); return acc; }, {});
  const secEntries = Object.entries(bySecretaria).map(([name, items]) => {
    const calc = items.reduce((a, m) => a + (m.pct_cumplimiento2025 || 0), 0) / items.length;
    return { name: shortName(name), avg: overrides.secretarias[name]?.pct2025 ?? calc };
  }).sort((a, b) => b.avg - a.avg);

  const byDim = metas.reduce((acc, m) => { if (!acc[m.dimension]) acc[m.dimension] = []; acc[m.dimension].push(m); return acc; }, {});
  const dimEntries = Object.entries(byDim).sort().map(([name, items]) => {
    const calc = items.reduce((a, m) => a + (m.pct_cumplimiento2025 || 0), 0) / items.length;
    return { name, avg: overrides.secretarias[`dim::${name}`]?.pct2025 ?? calc };
  });

  const col  = (p) => p >= 85 ? '#16a34a' : p >= 50 ? '#ca8a04' : '#dc2626';
  const colA = (p) => p >= 85 ? 'rgba(22,163,74,0.82)' : p >= 50 ? 'rgba(202,138,4,0.82)' : 'rgba(220,38,38,0.82)';
  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${(ctx.parsed.x ?? ctx.parsed.y).toFixed(1)}%` } } },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Donut semáforo */}
      <div className="dashboard-card">
        <div className="section-header">
          <div className="section-title">Distribución</div>
          <div className="section-headline">Estado de Cumplimiento 2025</div>
        </div>
        <div style={{ height: 220, display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <Doughnut
            data={{
              labels: ['Alto ≥85%', 'Medio 50–84%', 'Bajo <50%'],
              datasets: [{ data: [verde, amarillo, rojo], backgroundColor: ['#16a34a','#ca8a04','#dc2626'], borderWidth: 0, hoverOffset: 8 }],
            }}
            options={{
              responsive: true, maintainAspectRatio: false, cutout: '68%',
              plugins: {
                legend: { display: true, position: 'bottom', labels: { font: { size: 11, weight: '600' }, padding: 14, usePointStyle: true } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} metas` } },
              },
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.6rem', marginTop: '1.25rem' }}>
          {[
            { l: 'Alto ≥85%',     v: verde,    c: '#16a34a', bg: '#dcfce7' },
            { l: 'Medio 50–84%',  v: amarillo, c: '#ca8a04', bg: '#fef9c3' },
            { l: 'Bajo <50%',     v: rojo,     c: '#dc2626', bg: '#fee2e2' },
          ].map(s => (
            <div key={s.l} style={{ background: s.bg, borderRadius: 12, padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.c, letterSpacing: '-0.04em' }}>{s.v}</div>
              <div style={{ fontSize: '0.58rem', fontWeight: 700, color: s.c, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Barras horizontales por secretaría */}
      <div className="dashboard-card">
        <div className="section-header">
          <div className="section-title">Por Dependencia</div>
          <div className="section-headline">Cumplimiento por Secretaría</div>
        </div>
        <div style={{ height: Math.max(320, secEntries.length * 38), marginTop: '1rem' }}>
          <Bar
            data={{
              labels: secEntries.map(e => e.name),
              datasets: [{
                data: secEntries.map(e => parseFloat(e.avg.toFixed(1))),
                backgroundColor: secEntries.map(e => colA(e.avg)),
                borderColor: secEntries.map(e => col(e.avg)),
                borderWidth: 2, borderRadius: 6,
              }],
            }}
            options={{
              ...baseOpts, indexAxis: 'y',
              scales: {
                x: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { callback: v => `${v}%`, font: { size: 11 } } },
                y: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' } } },
              },
            }}
          />
        </div>
      </div>

      {/* Barras verticales por dimensión */}
      <div className="dashboard-card">
        <div className="section-header">
          <div className="section-title">Por Dimensión</div>
          <div className="section-headline">Avance por Dimensión</div>
        </div>
        <div style={{ height: 260, marginTop: '1rem' }}>
          <Bar
            data={{
              labels: dimEntries.map(e => e.name.replace(/^DIMENSIÓN \d+[\s–-]+/i, '')),
              datasets: [{
                label: '% Cumplimiento',
                data: dimEntries.map(e => parseFloat(e.avg.toFixed(1))),
                backgroundColor: dimEntries.map(e => colA(e.avg)),
                borderColor: dimEntries.map(e => col(e.avg)),
                borderWidth: 2, borderRadius: 8,
              }],
            }}
            options={{
              ...baseOpts,
              scales: {
                y: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { callback: v => `${v}%`, font: { size: 11 } } },
                x: { grid: { display: false }, ticks: { font: { size: 10, weight: '600' }, maxRotation: 25 } },
              },
            }}
          />
        </div>
      </div>

    </motion.div>
  );
}
