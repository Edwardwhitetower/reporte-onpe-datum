const fmt = new Intl.NumberFormat('es-PE');
const pct = (n, digits = 2) => `${Number(n || 0).toFixed(digits)}%`;
const moneyish = n => fmt.format(Math.round(Number(n || 0)));

const state = { data: null, regions: [] };

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

async function loadData(){
  const res = await fetch(`data/report-data.json?v=${Date.now()}`);
  state.data = await res.json();
  state.regions = state.data.regions.map(r => ({
    ...r,
    pending: Number(r.totalActas || 0) - Number(r.contabilizadas || 0),
    winner: Number(r.keiko_proyectado || 0) > Number(r.sanchez_proyectado || 0) ? 'keiko' : 'sanchez',
    margin: Math.abs(Number(r.keiko_proyectado || 0) - Number(r.sanchez_proyectado || 0))
  }));
  render();
}

function render(){
  const { nationalOnpe:n, projection:p, candidates:c, meta:m } = state.data;
  const keiko = c.find(x => x.id === 'keiko');
  const sanchez = c.find(x => x.id === 'sanchez');

  document.getElementById('heroSubtitle').textContent = `${m.subtitle} · Corte ONPE ${n.fechaActualizacion}`;

  const cutoff = document.getElementById('cutoffNotice');
  if(cutoff){
    cutoff.innerHTML = `
      <strong>Última actualización manual del informe:</strong> ${formatDateTime(m.generatedAt)}<br>
      <strong>Corte ONPE:</strong> ${n.fechaActualizacion} · ${pct(n.actasContabilizadasPct, 3)} de actas contabilizadas.<br>
      <strong>Escenario extranjero:</strong> ONPE para votos ya contabilizados + Datum (${pct(p.datumForeignKeikoPct, 2)} Keiko / ${pct(p.datumForeignSanchezPct, 2)} Sánchez) solo para lo pendiente.<br>
      <strong>Nota:</strong> este informe es una proyección analítica y no reemplaza los resultados oficiales de ONPE/JNE.
    `;
  }

  const methodNote = document.getElementById('manualUpdateNote');
  if(methodNote){
    methodNote.innerHTML = `Datos actualizados manualmente desde Colab. Método extranjero actual: <b>${m.foreignVolumeMethod || 'no especificado'}</b>. Si la actualización automática o manual falla, la página mantiene el último corte válido publicado.`;
  }

  document.getElementById('summaryCards').innerHTML = [
    ['Actas contabilizadas', pct(n.actasContabilizadasPct, 3), `${moneyish(n.contabilizadas)} de ${moneyish(n.totalActas)} actas`],
    ['Diferencia actual ONPE', leadText(p.currentLeadKeiko), 'Diferencia con actas contabilizadas'],
    ['Diferencia sin extranjero', leadText(p.withoutForeignLeadKeiko), 'Proyección lineal por regiones nacionales'],
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
    <p>La diferencia nacional sin extranjero queda en <b class="${leadClass(p.withoutForeignLeadKeiko)}">${leadText(p.withoutForeignLeadKeiko)}</b>. Al aplicar el escenario extranjero mixto —ONPE para lo ya contado y Datum solo para lo pendiente— la diferencia ajustada queda en <b class="${leadClass(p.adjustedLeadKeiko)}">${leadText(p.adjustedLeadKeiko)}</b>.</p>
    <p class="muted">Voto extranjero estimado: ${moneyish(p.foreignVotesEstimated)} votos válidos en ${moneyish(p.foreignActs)} actas. Votos extranjeros ya contabilizados: ${moneyish(p.foreignCurrentValidVotes || 0)}. Faltante extranjero estimado: ${moneyish(p.foreignRemainingVotesEstimated || 0)}.</p>`;

  renderSensitivity();
  renderRegions();
  document.getElementById('regionSearch').addEventListener('input', renderRegions);
  document.getElementById('regionFilter').addEventListener('change', renderRegions);
}

function renderSensitivity(){
  const rows = state.data.sensitivity;
  document.getElementById('sensitivityTable').innerHTML = `
    <thead><tr><th>Votos extranjero</th><th>% Keiko</th><th>% Sánchez</th><th>Diferencia final</th><th>Ganador</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${moneyish(r.foreignVotes)}</td><td>${pct(r.keikoPct, 2)}</td><td>${pct(r.sanchezPct, 2)}</td><td>${leadText(r.finalLeadKeiko)}</td><td class="winner ${r.winner === 'Keiko' ? 'keiko' : 'sanchez'}">${r.winner}</td></tr>`).join('')}</tbody>`;
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
