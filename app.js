const fmt = new Intl.NumberFormat('es-PE');
const pct = (n, digits=2) => `${Number(n).toFixed(digits)}%`;
const moneyish = n => fmt.format(Math.round(Number(n || 0)));

const state = { data:null, regions:[] };

async function loadData(){
  const res = await fetch('data/report-data.json');
  state.data = await res.json();
  state.regions = state.data.regions.map(r => ({
    ...r,
    pending: r.totalActas - r.contabilizadas,
    winner: r.keiko_proyectado > r.sanchez_proyectado ? 'keiko' : 'sanchez',
    margin: Math.abs(r.keiko_proyectado - r.sanchez_proyectado)
  }));
  render();
}

function render(){
  const { nationalOnpe:n, projection:p, candidates:c } = state.data;
  document.getElementById('heroSubtitle').textContent = `${state.data.meta.subtitle} · Corte ${n.fechaActualizacion}`;
  document.getElementById('cutoffNotice').innerHTML = `
  <strong>Fecha de corte:</strong> Datos ONPE actualizados al ${n.fechaActualizacion}.<br>
  <strong>Escenario extranjero:</strong> Datum: Keiko ${pct(p.datumForeignKeikoPct, 2)} / Sánchez ${pct(p.datumForeignSanchezPct, 2)}.<br>
  <strong>Nota:</strong> Este informe es una proyección analítica y no reemplaza los resultados oficiales de ONPE/JNE.
`;
  const keiko = c.find(x=>x.id==='keiko');
  const sanchez = c.find(x=>x.id==='sanchez');

  document.getElementById('summaryCards').innerHTML = [
    ['Actas contabilizadas', pct(n.actasContabilizadasPct,3), `${moneyish(n.contabilizadas)} de ${moneyish(n.totalActas)} actas`],
    ['Ventaja actual ONPE', `${moneyish(p.currentLeadKeiko)} votos`, 'Keiko sobre Sánchez con actas contabilizadas'],
    ['Ventaja sin extranjero', `${moneyish(p.withoutForeignLeadKeiko)} votos`, 'Proyección lineal por regiones nacionales'],
    ['Ventaja ajustada Datum', `${moneyish(p.adjustedLeadKeiko)} votos`, `Keiko ${pct(p.adjustedKeikoPct,3)} vs Sánchez ${pct(p.adjustedSanchezPct,3)}`]
  ].map(([label,value,desc]) => `<article class="card"><small>${label}</small><strong>${value}</strong><span>${desc}</span></article>`).join('');

  const max = Math.max(keiko.projectedAdjusted, sanchez.projectedAdjusted);
  document.getElementById('finalBars').innerHTML = [keiko, sanchez].map(x => `
    <div class="bar-row">
      <div class="bar-meta"><span>${x.name}</span><span>${moneyish(x.projectedAdjusted)} votos</span></div>
      <div class="track"><div class="fill ${x.id==='sanchez'?'sanchez':''}" style="width:${(x.projectedAdjusted/max*100).toFixed(2)}%"></div></div>
    </div>`).join('');

  document.getElementById('mainCallout').innerHTML = `
    <strong>Lectura principal</strong>
    <p>La proyección nacional sin extranjero deja a Keiko con una ventaja de <b>${moneyish(p.withoutForeignLeadKeiko)}</b> votos. Al aplicar el escenario extranjero Datum (${pct(p.datumForeignKeikoPct,2)} / ${pct(p.datumForeignSanchezPct,2)}), la ventaja estimada sube a <b>${moneyish(p.adjustedLeadKeiko)}</b> votos.</p>
    <p class="muted">Voto extranjero estimado: ${moneyish(p.foreignVotesEstimated)} votos válidos en ${moneyish(p.foreignActs)} actas.</p>`;

  renderSensitivity();
  renderRegions();
  document.getElementById('regionSearch').addEventListener('input', renderRegions);
  document.getElementById('regionFilter').addEventListener('change', renderRegions);
}

function renderSensitivity(){
  const rows = state.data.sensitivity;
  document.getElementById('sensitivityTable').innerHTML = `
    <thead><tr><th>Votos extranjero</th><th>% Keiko</th><th>% Sánchez</th><th>Ventaja final Keiko</th><th>Ganador</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${moneyish(r.foreignVotes)}</td><td>${pct(r.keikoPct,2)}</td><td>${pct(r.sanchezPct,2)}</td><td>${moneyish(r.finalLeadKeiko)}</td><td class="winner ${r.winner==='Keiko'?'keiko':'sanchez'}">${r.winner}</td></tr>`).join('')}</tbody>`;
}

function renderRegions(){
  const q = (document.getElementById('regionSearch')?.value || '').trim().toLowerCase();
  const filter = document.getElementById('regionFilter')?.value || 'all';
  let rows = [...state.regions];
  if(q) rows = rows.filter(r => r.region.toLowerCase().includes(q));
  if(filter === 'keiko') rows = rows.filter(r => r.winner === 'keiko');
  if(filter === 'sanchez') rows = rows.filter(r => r.winner === 'sanchez');
  if(filter === 'pending') rows.sort((a,b)=>b.pending-a.pending);
  else rows.sort((a,b)=>b.pending-a.pending || b.margin-a.margin);

  document.getElementById('regionalTable').innerHTML = `
    <thead><tr><th>Región</th><th>Avance actas</th><th>No contabilizadas</th><th>Keiko proy.</th><th>Sánchez proy.</th><th>Ganador proy.</th><th>Diferencia</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${r.region}</td>
      <td>${pct(r.actasContabilizadas,3)}</td>
      <td>${moneyish(r.pending)}</td>
      <td>${moneyish(r.keiko_proyectado)}</td>
      <td>${moneyish(r.sanchez_proyectado)}</td>
      <td class="winner ${r.winner}">${r.winner==='keiko'?'Keiko':'Sánchez'}</td>
      <td>${moneyish(r.margin)}</td>
    </tr>`).join('')}</tbody>`;
}

loadData().catch(err=>{
  document.body.innerHTML = `<main class="section"><h1>Error cargando datos</h1><pre>${err}</pre></main>`;
});
