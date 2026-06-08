const fmt = new Intl.NumberFormat('es-PE');
const pct = (n, digits = 2) => `${Number(n || 0).toFixed(digits)}%`;
const moneyish = n => fmt.format(Math.round(Number(n || 0)));

const state = { data: null, regions: [], provinces: [] };

function formatDateTime(value){
  if(!value) return 'no disponible';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function leadText(lead){
  const n = Number(lead || 0);
  if(n === 0) return 'Empate técnico: 0 votos';
  return `${n > 0 ? 'Keiko' : 'Sánchez'} +${moneyish(Math.abs(n))} votos`;
}

function leadClass(lead){
  const n = Number(lead || 0);
  return n >= 0 ? 'keiko' : 'sanchez';
}

function signedPoints(n){
  const value = Number(n || 0);
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(2)} pts`;
}

function clampPct(n){
  if(!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function getForeignActual(){
  const rows = state.data?.foreign || [];
  const keiko = rows.reduce((sum, r) => sum + Number(r.keiko_actual || 0), 0);
  const sanchez = rows.reduce((sum, r) => sum + Number(r.sanchez_actual || 0), 0);
  const total = keiko + sanchez;
  return {
    keiko,
    sanchez,
    total,
    leadKeiko: keiko - sanchez,
    keikoPct: total ? keiko / total * 100 : null,
    sanchezPct: total ? sanchez / total * 100 : null
  };
}

function calculateForeignThreshold(){
  const p = state.data?.projection || {};
  const foreignActual = getForeignActual();
  const peruLeadKeiko = Number(p.withoutForeignLeadKeiko || 0);
  const pendingForeign = Number(p.foreignRemainingVotesEstimated || 0);
  const datumKeikoPct = Number(p.datumForeignKeikoPct || 0);

  const leadBeforePending = peruLeadKeiko + foreignActual.leadKeiko;
  const neededNetLeadFromPending = -leadBeforePending;

  let rawNeededPct = null;
  if(pendingForeign > 0){
    rawNeededPct = ((neededNetLeadFromPending / pendingForeign) + 1) / 2 * 100;
  }

  const neededPct = rawNeededPct === null ? null : clampPct(rawNeededPct);
  const datumMargin = neededPct === null ? null : datumKeikoPct - neededPct;
  const onpePartialMargin = (neededPct === null || foreignActual.keikoPct === null) ? null : foreignActual.keikoPct - neededPct;

  let status = 'neutral';
  let statusText = 'No disponible';

  if(rawNeededPct !== null){
    if(rawNeededPct <= 0){
      status = 'safe';
      statusText = 'Keiko ya estaría arriba antes de estimar el extranjero pendiente.';
    }else if(rawNeededPct > 100){
      status = 'danger';
      statusText = 'Ni ganando todo el extranjero pendiente alcanzaría bajo este corte.';
    }else if(datumMargin >= 5){
      status = 'safe';
      statusText = `Datum está ${signedPoints(datumMargin)} por encima del umbral.`;
    }else if(datumMargin >= 0){
      status = 'warning';
      statusText = `Datum todavía supera el umbral, pero solo por ${signedPoints(datumMargin)}.`;
    }else{
      status = 'danger';
      statusText = `Datum queda ${signedPoints(datumMargin)} por debajo del umbral.`;
    }
  }

  return {
    peruLeadKeiko,
    foreignActual,
    pendingForeign,
    leadBeforePending,
    neededNetLeadFromPending,
    rawNeededPct,
    neededPct,
    datumKeikoPct,
    datumMargin,
    onpePartialMargin,
    status,
    statusText
  };
}

function projectionLabel(source){
  if(source === 'provincia') return 'proyección lineal por provincia';
  if(source === 'departamento_fallback') return 'proyección lineal por departamento (respaldo)';
  return 'proyección lineal por ubicación geográfica';
}

function decorateRows(rows){
  return (rows || []).map(r => {
    const pending = Number(r.totalActas || 0) - Number(r.contabilizadas || 0);
    const keiko = Number(r.keiko_proyectado || 0);
    const sanchez = Number(r.sanchez_proyectado || 0);
    return {
      ...r,
      pending,
      winner: keiko > sanchez ? 'keiko' : 'sanchez',
      margin: Math.abs(keiko - sanchez)
    };
  });
}

async function loadData(){
  const res = await fetch(`data/report-data.json?v=${Date.now()}`);
  state.data = await res.json();
  state.regions = decorateRows(state.data.regions);
  state.provinces = decorateRows(state.data.provinces || []);
  render();
}

function render(){
  const { nationalOnpe:n, projection:p, candidates:c, meta:m } = state.data;
  const keiko = c.find(x => x.id === 'keiko');
  const sanchez = c.find(x => x.id === 'sanchez');
  const sourceText = projectionLabel(p.projectionSource || m.projectionSource);

  document.getElementById('heroSubtitle').textContent = `${m.subtitle} · Corte ONPE ${n.fechaActualizacion}`;

  const cutoff = document.getElementById('cutoffNotice');
  if(cutoff){
    cutoff.innerHTML = `
      <strong>Última actualización manual del informe:</strong> ${formatDateTime(m.generatedAt)}<br>
      <strong>Corte ONPE:</strong> ${n.fechaActualizacion} · ${pct(n.actasContabilizadasPct, 3)} de actas contabilizadas.<br>
      <strong>Fuente de proyección Perú:</strong> ${sourceText}.<br>
      <strong>Escenario extranjero:</strong> ONPE para votos ya contabilizados + Datum (${pct(p.datumForeignKeikoPct, 2)} Keiko / ${pct(p.datumForeignSanchezPct, 2)} Sánchez) solo para lo pendiente.<br>
      <strong>Nota:</strong> este informe es una proyección analítica y no reemplaza los resultados oficiales de ONPE/JNE.
    `;
  }

  const projectionSourceText = document.getElementById('projectionSourceText');
  if(projectionSourceText){
    projectionSourceText.textContent = `Suma la ${sourceText} para Perú y el escenario extranjero mixto ONPE + Datum.`;
  }

  const projectionMethodText = document.getElementById('projectionMethodText');
  if(projectionMethodText){
    projectionMethodText.innerHTML = p.projectionSource === 'provincia'
      ? `La proyección principal usa <b>${moneyish(state.provinces.length)} provincias</b>. Esto reduce el sesgo de usar solo departamentos, aunque sigue siendo una estimación dinámica por corte.`
      : `La proyección principal usa departamentos porque no se detectó suficiente detalle provincial en el JSON.`;
  }

  const methodNote = document.getElementById('manualUpdateNote');
  if(methodNote){
    methodNote.innerHTML = `Datos actualizados manualmente desde Colab. Método extranjero actual: <b>${m.foreignVolumeMethod || 'no especificado'}</b>. Fuente de proyección Perú: <b>${sourceText}</b>. Si la actualización falla, la página mantiene el último corte válido publicado.`;
  }

  document.getElementById('summaryCards').innerHTML = [
    ['Actas contabilizadas', pct(n.actasContabilizadasPct, 3), `${moneyish(n.contabilizadas)} de ${moneyish(n.totalActas)} actas`],
    ['Diferencia actual ONPE', leadText(p.currentLeadKeiko), 'Diferencia con actas contabilizadas'],
    ['Diferencia Perú sin extranjero', leadText(p.withoutForeignLeadKeiko), sourceText],
    ['Diferencia ajustada Datum', leadText(p.adjustedLeadKeiko), `Keiko ${pct(p.adjustedKeikoPct, 3)} vs Sánchez ${pct(p.adjustedSanchezPct, 3)}`]
  ].map(([label, value, desc]) => `<article class="card"><small>${label}</small><strong>${value}</strong><span>${desc}</span></article>`).join('');

  const max = Math.max(Number(keiko.projectedAdjusted || 0), Number(sanchez.projectedAdjusted || 0));
  document.getElementById('finalBars').innerHTML = [keiko, sanchez].map(x => `
    <div class="bar-row">
      <div class="bar-meta"><span>${x.name}</span><span>${moneyish(x.projectedAdjusted)} votos</span></div>
      <div class="track"><div class="fill ${x.id === 'sanchez' ? 'sanchez' : ''}" style="width:${max ? (x.projectedAdjusted / max * 100).toFixed(2) : 0}%"></div></div>
    </div>`).join('');

  document.getElementById('mainCallout').innerHTML = `
    <strong>Lectura principal</strong>
    <p>La diferencia Perú sin extranjero queda en <b class="${leadClass(p.withoutForeignLeadKeiko)}">${leadText(p.withoutForeignLeadKeiko)}</b>, usando ${sourceText}. Al aplicar el escenario extranjero mixto —ONPE para lo ya contado y Datum solo para lo pendiente— la diferencia ajustada queda en <b class="${leadClass(p.adjustedLeadKeiko)}">${leadText(p.adjustedLeadKeiko)}</b>.</p>
    <p class="muted">Voto extranjero estimado: ${moneyish(p.foreignVotesEstimated)} votos válidos en ${moneyish(p.foreignActs)} actas. Votos extranjeros ya contabilizados: ${moneyish(p.foreignCurrentValidVotes || 0)}. Faltante extranjero estimado: ${moneyish(p.foreignRemainingVotesEstimated || 0)}.</p>`;

  renderThreshold();
  renderSensitivity();
  setupProvinceDepartmentFilter();
  renderProvinces();
  renderRegions();

  document.getElementById('regionSearch')?.addEventListener('input', renderRegions);
  document.getElementById('regionFilter')?.addEventListener('change', renderRegions);
  document.getElementById('provinceSearch')?.addEventListener('input', renderProvinces);
  document.getElementById('provinceFilter')?.addEventListener('change', renderProvinces);
  document.getElementById('provinceDepartmentFilter')?.addEventListener('change', renderProvinces);
}


function renderThreshold(){
  const cardsEl = document.getElementById('thresholdCards');
  const tableEl = document.getElementById('thresholdTable');
  const calloutEl = document.getElementById('thresholdCallout');
  const summaryEl = document.getElementById('thresholdSummaryText');
  if(!cardsEl || !tableEl || !calloutEl) return;

  const t = calculateForeignThreshold();
  const p = state.data.projection || {};
  const currentForeignPct = t.foreignActual.keikoPct;
  const thresholdText = t.neededPct === null ? 'No disponible' : pct(t.neededPct, 2);
  const datumMarginText = t.datumMargin === null ? 'No disponible' : signedPoints(t.datumMargin);
  const onpeMarginText = t.onpePartialMargin === null ? 'No disponible' : signedPoints(t.onpePartialMargin);

  cardsEl.innerHTML = [
    ['Umbral mínimo Keiko', thresholdText, 'Porcentaje necesario del extranjero pendiente'],
    ['Escenario Datum', pct(t.datumKeikoPct, 2), `${datumMarginText} frente al umbral`],
    ['ONPE extranjero parcial', currentForeignPct === null ? 'No disponible' : pct(currentForeignPct, 2), `${onpeMarginText} frente al umbral`],
    ['Extranjero pendiente estimado', moneyish(t.pendingForeign), `Total extranjero estimado: ${moneyish(p.foreignVotesEstimated || 0)}`]
  ].map(([label, value, desc]) => `<article class="card threshold-card"><small>${label}</small><strong>${value}</strong><span>${desc}</span></article>`).join('');

  if(summaryEl){
    summaryEl.innerHTML = `Con este corte, antes de estimar el extranjero pendiente, la diferencia queda en <b class="${leadClass(t.leadBeforePending)}">${leadText(t.leadBeforePending)}</b>. Para revertir o sostener el resultado final, Keiko necesita aproximadamente <b>${thresholdText}</b> del extranjero pendiente.`;
  }

  const comparisonRows = [
    { label: 'Umbral mínimo para Keiko', value: t.neededPct, diff: 0, type: 'threshold' },
    { label: 'ONPE extranjero parcial', value: currentForeignPct, diff: t.onpePartialMargin, type: 'onpe' },
    { label: 'Escenario Datum extranjero', value: t.datumKeikoPct, diff: t.datumMargin, type: 'datum' }
  ];

  tableEl.innerHTML = `
    <thead><tr><th>Referencia</th><th>% Keiko</th><th>Distancia frente al umbral</th><th>Lectura</th></tr></thead>
    <tbody>${comparisonRows.map(r => {
      const value = r.value === null ? 'No disponible' : pct(r.value, 2);
      const diff = r.type === 'threshold' ? 'Base' : (r.diff === null ? 'No disponible' : signedPoints(r.diff));
      const ok = r.type === 'threshold' ? 'neutral' : (Number(r.diff || 0) >= 0 ? 'keiko' : 'sanchez');
      const lectura = r.type === 'threshold'
        ? 'Mínimo requerido'
        : Number(r.diff || 0) >= 0 ? 'Por encima del umbral' : 'Por debajo del umbral';
      return `<tr><td>${r.label}</td><td>${value}</td><td class="winner ${ok}">${diff}</td><td>${lectura}</td></tr>`;
    }).join('')}</tbody>`;

  calloutEl.className = `callout threshold-${t.status}`;
  calloutEl.innerHTML = `
    <strong>Lectura del umbral</strong>
    <p>${t.statusText}</p>
    <p class="muted">Fórmula: Perú proyectado sin extranjero + extranjero ONPE ya contado + extranjero pendiente estimado. El umbral indica qué porcentaje del extranjero pendiente necesitaría Keiko para terminar arriba.</p>
    <p class="muted">Extranjero ONPE parcial: Keiko ${moneyish(t.foreignActual.keiko)} vs Sánchez ${moneyish(t.foreignActual.sanchez)}; diferencia parcial: <b class="${leadClass(t.foreignActual.leadKeiko)}">${leadText(t.foreignActual.leadKeiko)}</b>.</p>`;
}

function renderSensitivity(){
  const rows = state.data.sensitivity || [];
  document.getElementById('sensitivityTable').innerHTML = `
    <thead><tr><th>Votos extranjero</th><th>% Keiko</th><th>% Sánchez</th><th>Diferencia final</th><th>Ganador</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${moneyish(r.foreignVotes)}</td><td>${pct(r.keikoPct, 2)}</td><td>${pct(r.sanchezPct, 2)}</td><td>${leadText(r.finalLeadKeiko)}</td><td class="winner ${r.winner === 'Keiko' ? 'keiko' : 'sanchez'}">${r.winner}</td></tr>`).join('')}</tbody>`;
}

function setupProvinceDepartmentFilter(){
  const select = document.getElementById('provinceDepartmentFilter');
  if(!select || select.dataset.ready === '1') return;
  const departments = [...new Set(state.provinces.map(p => p.departamento).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'es'));
  select.innerHTML = '<option value="all">Todos los departamentos</option>' + departments.map(d => `<option value="${d}">${d}</option>`).join('');
  select.dataset.ready = '1';
}

function renderProvinces(){
  const table = document.getElementById('provinceTable');
  if(!table) return;

  const q = (document.getElementById('provinceSearch')?.value || '').trim().toLowerCase();
  const dept = document.getElementById('provinceDepartmentFilter')?.value || 'all';
  const filter = document.getElementById('provinceFilter')?.value || 'all';

  let rows = [...state.provinces];
  if(q){
    rows = rows.filter(r => `${r.departamento || ''} ${r.provincia || ''}`.toLowerCase().includes(q));
  }
  if(dept !== 'all') rows = rows.filter(r => r.departamento === dept);
  if(filter === 'keiko') rows = rows.filter(r => r.winner === 'keiko');
  if(filter === 'sanchez') rows = rows.filter(r => r.winner === 'sanchez');
  if(filter === 'pending') rows.sort((a,b) => b.pending - a.pending || b.margin - a.margin);
  else if(filter === 'close') rows.sort((a,b) => a.margin - b.margin || b.pending - a.pending);
  else rows.sort((a,b) => b.pending - a.pending || b.margin - a.margin);

  const count = document.getElementById('provinceCount');
  if(count){
    count.textContent = `${moneyish(rows.length)} provincias visibles de ${moneyish(state.provinces.length)} procesadas.`;
  }

  table.innerHTML = `
    <thead><tr><th>Departamento</th><th>Provincia</th><th>Avance actas</th><th>No contabilizadas</th><th>Keiko proy.</th><th>Sánchez proy.</th><th>Ganador proy.</th><th>Diferencia</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${r.departamento || ''}</td>
      <td>${r.provincia || ''}</td>
      <td>${pct(r.actasContabilizadas, 3)}</td>
      <td>${moneyish(r.pending)}</td>
      <td>${moneyish(r.keiko_proyectado)}</td>
      <td>${moneyish(r.sanchez_proyectado)}</td>
      <td class="winner ${r.winner}">${r.winner === 'keiko' ? 'Keiko' : 'Sánchez'}</td>
      <td>${moneyish(r.margin)}</td>
    </tr>`).join('')}</tbody>`;
}

function renderRegions(){
  const q = (document.getElementById('regionSearch')?.value || '').trim().toLowerCase();
  const filter = document.getElementById('regionFilter')?.value || 'all';
  let rows = [...state.regions];
  if(q) rows = rows.filter(r => r.region.toLowerCase().includes(q));
  if(filter === 'keiko') rows = rows.filter(r => r.winner === 'keiko');
  if(filter === 'sanchez') rows = rows.filter(r => r.winner === 'sanchez');
  if(filter === 'pending') rows.sort((a,b) => b.pending - a.pending);
  else rows.sort((a,b) => b.pending - a.pending || b.margin - a.margin);

  document.getElementById('regionalTable').innerHTML = `
    <thead><tr><th>Región</th><th>Avance actas</th><th>No contabilizadas</th><th>Keiko proy.</th><th>Sánchez proy.</th><th>Ganador proy.</th><th>Diferencia</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${r.region}</td>
      <td>${pct(r.actasContabilizadas, 3)}</td>
      <td>${moneyish(r.pending)}</td>
      <td>${moneyish(r.keiko_proyectado)}</td>
      <td>${moneyish(r.sanchez_proyectado)}</td>
      <td class="winner ${r.winner}">${r.winner === 'keiko' ? 'Keiko' : 'Sánchez'}</td>
      <td>${moneyish(r.margin)}</td>
    </tr>`).join('')}</tbody>`;
}

loadData().catch(err => {
  document.body.innerHTML = `<main class="section"><h1>Error cargando datos</h1><pre>${err}</pre></main>`;
});
