const fmt = new Intl.NumberFormat('es-PE');
const pct = (n, digits = 2) => `${Number(n || 0).toFixed(digits)}%`;
const moneyish = n => fmt.format(Math.round(Number(n || 0)));

const state = { data: null, regions: [], provinces: [], history: [] };

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


function normalizeHistory(payload){
  const entries = Array.isArray(payload) ? payload : (payload?.entries || []);
  return entries
    .filter(x => x && x.cutoff)
    .sort((a, b) => String(b.cutoff).localeCompare(String(a.cutoff)));
}

function isForeignClosed(){
  const p = state.data?.projection || {};
  const pending = Number(p.foreignRemainingVotesEstimated || 0);
  return pending <= 0;
}

function foreignModeText(){
  return isForeignClosed()
    ? 'Extranjero oficial ONPE completo; Datum queda como referencia histórica.'
    : 'ONPE para votos extranjeros ya contabilizados + Datum solo para el extranjero pendiente.';
}

function adjustedMetricLabel(){
  return isForeignClosed() ? 'Diferencia con extranjero ONPE' : 'Diferencia ajustada Datum';
}

function historySourceLabel(source){
  return projectionLabel(source).replace('proyección lineal por ', '').replace('modelo híbrido: ', 'híbrido: ');
}

function valueOrDash(v, formatter = x => x){
  if(v === null || v === undefined || Number.isNaN(Number(v))) return 'N/D';
  return formatter(v);
}

function thresholdDisplay(value, digits = 2){
  const n = Number(value);
  if(!Number.isFinite(n)) return 'N/D';
  if(n < 0) return 'Ya superado';
  if(n > 100) return '>100%';
  return pct(n, digits);
}

function thresholdDescription(value){
  const n = Number(value);
  if(!Number.isFinite(n)) return 'No disponible';
  if(n < 0) return 'Keiko no depende del extranjero pendiente';
  if(n > 100) return 'Ni ganando todo el pendiente alcanzaría';
  return 'Porcentaje mínimo Keiko del extranjero pendiente';
}

function thresholdDeltaDisplay(current, previous){
  const a = Number(current);
  const b = Number(previous);
  if(!Number.isFinite(a) || !Number.isFinite(b)) return 'N/D';
  if(a < 0 && b < 0) return 'Ya estaba superado';
  if(a < 0 && b >= 0) return 'Umbral superado';
  if(a >= 0 && b < 0) return 'Vuelve a requerir votos';
  return formatPctDelta(a - b, 3);
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
  const datumMargin = rawNeededPct === null ? null : datumKeikoPct - rawNeededPct;
  const onpePartialMargin = (rawNeededPct === null || foreignActual.keikoPct === null) ? null : foreignActual.keikoPct - rawNeededPct;

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
  if(source === 'hibrido_provincia_departamento') return 'modelo híbrido: provincias completas + departamento como respaldo';
  if(source === 'departamento_fallback') return 'proyección lineal por departamento (respaldo)';
  return 'proyección lineal por ubicación geográfica';
}

function getFallbackDepartments(){
  return state.data?.fallbackDepartments || state.data?.meta?.fallbackDepartments || [];
}

function fallbackSummaryText(){
  const items = getFallbackDepartments();
  if(!items.length) return 'No se aplicó fallback departamental en este corte.';
  return items.map(x => `${x.departamento}: ${x.provinciasProcesadas}/${x.provinciasEsperadas} provincias`).join('; ');
}

function ensureFallbackNotice(){
  let box = document.getElementById('fallbackNotice');
  if(box) return box;

  const target = document.getElementById('actualizacion') || document.getElementById('mainCallout');
  if(!target) return null;

  box = document.createElement('div');
  box.id = 'fallbackNotice';
  box.className = 'formula method-note fallback-note';
  target.insertAdjacentElement('afterend', box);
  return box;
}

function renderFallbackNotice(){
  const box = ensureFallbackNotice();
  if(!box) return;

  const p = state.data?.projection || {};
  const items = getFallbackDepartments();
  const source = p.projectionSource || state.data?.meta?.projectionSource;

  if(source !== 'hibrido_provincia_departamento' || !items.length){
    box.innerHTML = `<strong>Fallback departamental:</strong> No se aplicó fallback departamental en este corte. La proyección Perú usa provincias completas.`;
    return;
  }

  const list = items.map(x => `<li><b>${x.departamento}</b>: ${x.provinciasProcesadas}/${x.provinciasEsperadas} provincias; se usó el total departamental como respaldo.</li>`).join('');

  box.innerHTML = `
    <strong>Fallback departamental aplicado:</strong> este corte tuvo provincias que no respondieron, por lo que el modelo evitó omitir votos usando el total departamental en esos casos.
    <ul>${list}</ul>
  `;
}

function ensureFallbackDownload(){
  const grid = document.querySelector('#descargas .download-grid');
  if(!grid || document.getElementById('fallbackDownloadCard')) return;

  const card = document.createElement('a');
  card.id = 'fallbackDownloadCard';
  card.className = 'download-card';
  card.href = 'data/fallback-departments.csv';
  card.download = true;
  card.innerHTML = `<strong>fallback-departments.csv</strong><span>Departamentos donde se usó respaldo departamental.</span>`;

  const readme = [...grid.querySelectorAll('a')].find(a => (a.getAttribute('href') || '').includes('README'));
  if(readme) grid.insertBefore(card, readme);
  else grid.appendChild(card);
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
  const stamp = Date.now();
  const res = await fetch(`data/report-data.json?v=${stamp}`);
  state.data = await res.json();

  try{
    const historyRes = await fetch(`data/history.json?v=${stamp}`);
    if(historyRes.ok){
      state.history = normalizeHistory(await historyRes.json());
    }
  }catch(err){
    console.warn('No se pudo cargar history.json', err);
    state.history = [];
  }

  state.regions = decorateRows(state.data.regions);
  state.provinces = decorateRows(state.data.provinces || []);
  render();
}


function getJeeTerritorialContext(){
  const rows = state.data?.regions || [];
  const totalJee = rows.reduce((sum, r) => sum + Number(r.enviadasJee || 0), 0);
  const keikoJee = rows
    .filter(r => Number(r.diferencia_proyectada_keiko || 0) > 0)
    .reduce((sum, r) => sum + Number(r.enviadasJee || 0), 0);

  const top = [...rows]
    .filter(r => Number(r.enviadasJee || 0) > 0)
    .sort((a, b) => Number(b.enviadasJee || 0) - Number(a.enviadasJee || 0))[0] || null;

  const lima = rows.find(r => String(r.region || '').toUpperCase() === 'LIMA') || null;
  const limaJee = Number(lima?.enviadasJee || 0);
  const limaShare = totalJee ? limaJee / totalJee * 100 : null;
  const limaLead = Number(lima?.diferencia_proyectada_keiko || 0);

  return {
    totalJee,
    keikoJee,
    keikoJeeShare: totalJee ? keikoJee / totalJee * 100 : null,
    topRegion: top?.region || null,
    topRegionJee: Number(top?.enviadasJee || 0),
    topRegionLead: Number(top?.diferencia_proyectada_keiko || 0),
    limaJee,
    limaShare,
    limaLead
  };
}

function calculateScenarioState(){
  const p = state.data?.projection || {};
  const n = state.data?.nationalOnpe || {};
  const t = calculateForeignThreshold();
  const jee = getJeeTerritorialContext();
  const fallback = getFallbackDepartments();

  const currentLead = Number(p.currentLeadKeiko || 0);
  const adjustedLead = Number(p.adjustedLeadKeiko || 0);
  const pendingForeign = Math.max(0, Number(p.foreignRemainingVotesEstimated || 0));
  const leadBeforePending = Number(t.leadBeforePending || 0);
  const safeLeadWorstForeign = leadBeforePending - pendingForeign;
  const thresholdCleared = Number(t.rawNeededPct) < 0;
  const currentOnpeAhead = currentLead > 0;
  const adjustedAhead = adjustedLead > 0;
  const worstForeignAhead = safeLeadWorstForeign > 0;
  const jeeFavorsKeiko = Number(jee.keikoJeeShare || 0) >= 50;
  const limaReinforces = Number(jee.limaJee || 0) > 0 && Number(jee.limaLead || 0) > 0;
  const fallbackWarning = fallback.length > 0 || Number(p.fallbackDepartmentCount || 0) > 0 || Number(p.provinceErrors || 0) > 0;
  const limaFallback = fallback.some(x => String(x.departamento || '').toUpperCase() === 'LIMA');

  let level = 'neutral';
  let title = 'Escenario abierto bajo el modelo';
  let confidence = 'Media';
  let explanation = 'El modelo todavía no muestra una ventaja consolidada. Conviene esperar nuevos cortes válidos.';

  if(adjustedAhead && !thresholdCleared){
    level = 'favorable';
    title = 'Escenario favorable a Keiko bajo el modelo';
    confidence = 'Alta';
    explanation = 'Keiko lidera el cálculo ajustado, pero todavía depende del comportamiento del extranjero pendiente o de la evolución de actas no cerradas.';
  }

  if(thresholdCleared && worstForeignAhead){
    level = 'strong';
    title = 'Victoria virtual de Keiko bajo el modelo';
    confidence = 'Muy alta';
    explanation = 'El extranjero ya contabilizado alcanza para compensar la desventaja interna proyectada. Incluso asignando todo el extranjero pendiente a Sánchez, Keiko conserva ventaja bajo este modelo.';
  }

  if(currentOnpeAhead && thresholdCleared && worstForeignAhead){
    level = 'safe';
    title = 'Alta confianza: victoria virtual de Keiko bajo el modelo';
    confidence = 'Muy alta';
    explanation = 'Keiko ya lidera el conteo ONPE contabilizado y, bajo la proyección territorial publicada, conserva ventaja incluso en el escenario extremo de que todo el extranjero pendiente vaya a Sánchez.';
  }

  if(currentOnpeAhead && thresholdCleared && worstForeignAhead && (jeeFavorsKeiko || limaReinforces)){
    level = 'safe';
    title = 'Escenario matemáticamente consolidado bajo el modelo';
    confidence = 'Muy alta';
    explanation = 'Keiko lidera el conteo ONPE, no depende del extranjero pendiente y las actas enviadas al JEE se concentran mayoritariamente en territorios donde el modelo favorece a Keiko, especialmente Lima si aparece como principal bloque pendiente.';
  }

  if(!adjustedAhead){
    level = 'danger';
    title = 'Escenario no favorable a Keiko bajo el modelo';
    confidence = 'Baja';
    explanation = 'El cálculo ajustado no muestra ventaja de Keiko. Se requiere revisar el corte o esperar nuevas actualizaciones.';
  }

  return {
    level,
    title,
    confidence,
    explanation,
    currentLead,
    adjustedLead,
    leadBeforePending,
    pendingForeign,
    safeLeadWorstForeign,
    thresholdCleared,
    currentOnpeAhead,
    adjustedAhead,
    worstForeignAhead,
    jee,
    fallbackWarning,
    limaFallback,
    actasPct: Number(n.actasContabilizadasPct || 0),
    fallback
  };
}

function renderScenarioState(){
  const cards = document.getElementById('scenarioCards');
  const callout = document.getElementById('scenarioCallout');
  if(!cards || !callout) return;

  const s = calculateScenarioState();
  const jee = s.jee;

  const jeeText = jee.totalJee
    ? `${moneyish(jee.keikoJee)} de ${moneyish(jee.totalJee)} actas JEE en territorios Keiko (${pct(jee.keikoJeeShare, 1)})`
    : 'No disponible';

  const limaText = jee.limaJee
    ? `Lima: ${moneyish(jee.limaJee)} actas JEE (${pct(jee.limaShare, 1)}) · ${leadText(jee.limaLead)} proyectados`
    : 'Lima no concentra actas JEE en este corte';

  cards.innerHTML = [
    ['Estado', s.title, `Confianza bajo el modelo: ${s.confidence}`],
    ['Conteo ONPE actual', leadText(s.currentLead), s.currentOnpeAhead ? 'Keiko ya aparece adelante en el conteo contabilizado' : 'Keiko aún no lidera el conteo contabilizado'],
    ['Ventaja segura ante extranjero', leadText(s.safeLeadWorstForeign), 'Escenario extremo: todo el extranjero pendiente para Sánchez'],
    ['Actas JEE y territorio', jeeText, limaText]
  ].map(([label, value, desc]) => `<article class="card scenario-card ${s.level}"><small>${label}</small><strong>${value}</strong><span>${desc}</span></article>`).join('');

  const fallbackNote = s.fallbackWarning
    ? `<p class="muted"><b>Nota metodológica:</b> este corte usa fallback departamental${s.limaFallback ? ' e incluye Lima, por lo que conviene confirmarlo con un corte provincial completo' : ''}. Esto no invalida el cálculo, pero debe declararse en la lectura pública.</p>`
    : `<p class="muted"><b>Calidad del corte:</b> sin fallback departamental relevante; lectura metodológica más limpia.</p>`;

  callout.className = `callout scenario-callout scenario-${s.level}`;
  callout.innerHTML = `
    <strong>${s.title}</strong>
    <p>${s.explanation}</p>
    <p>La cuenta de seguridad frente al extranjero pendiente es: Perú sin extranjero + extranjero ONPE ya contado − extranjero pendiente máximo para Sánchez = <b class="${leadClass(s.safeLeadWorstForeign)}">${leadText(s.safeLeadWorstForeign)}</b>.</p>
    <p class="muted">Esta es una lectura matemática del modelo publicado, no una proclamación oficial. La proclamación corresponde a las autoridades electorales.</p>
    ${fallbackNote}`;
}

function render(){
  const { nationalOnpe:n, projection:p, candidates:c, meta:m } = state.data;
  const keiko = c.find(x => x.id === 'keiko');
  const sanchez = c.find(x => x.id === 'sanchez');
  const sourceText = projectionLabel(p.projectionSource || m.projectionSource);
  const foreignClosed = isForeignClosed();
  const adjustedLabel = adjustedMetricLabel();

  const heroTitle = document.getElementById('heroTitle');
  if(heroTitle) heroTitle.textContent = foreignClosed ? 'ONPE + voto extranjero oficial' : 'ONPE + escenario extranjero Datum';
  document.getElementById('heroSubtitle').textContent = `${m.subtitle} · Corte ONPE ${n.fechaActualizacion}`;

  const cutoff = document.getElementById('cutoffNotice');
  if(cutoff){
    cutoff.innerHTML = `
      <strong>Última actualización manual del informe:</strong> ${formatDateTime(m.generatedAt)}<br>
      <strong>Corte ONPE:</strong> ${n.fechaActualizacion} · ${pct(n.actasContabilizadasPct, 3)} de actas contabilizadas.<br>
      <strong>Fuente de proyección Perú:</strong> ${sourceText}.<br>
      <strong>Tratamiento del extranjero:</strong> ${foreignClosed ? 'bloque extranjero contabilizado por ONPE; Datum ya no se usa en el cálculo principal.' : `ONPE para votos ya contabilizados + Datum (${pct(p.datumForeignKeikoPct, 2)} Keiko / ${pct(p.datumForeignSanchezPct, 2)} Sánchez) solo para lo pendiente.`}<br>
      <strong>Nota:</strong> este informe es una proyección analítica y no reemplaza los resultados oficiales de ONPE/JNE.
    `;
  }

  const projectionSourceText = document.getElementById('projectionSourceText');
  if(projectionSourceText){
    projectionSourceText.textContent = foreignClosed ? `Suma la ${sourceText} para Perú y el voto extranjero oficial ONPE.` : `Suma la ${sourceText} para Perú y el escenario extranjero mixto ONPE + Datum.`;
  }

  const projectionMethodText = document.getElementById('projectionMethodText');
  if(projectionMethodText){
    if(p.projectionSource === 'provincia'){
      projectionMethodText.innerHTML = `La proyección principal usa <b>${moneyish(state.provinces.length)} provincias</b>. Esto reduce el sesgo de usar solo departamentos, aunque sigue siendo una estimación dinámica por corte.`;
    }else if(p.projectionSource === 'hibrido_provincia_departamento'){
      projectionMethodText.innerHTML = `La proyección principal usa un <b>modelo híbrido</b>: provincias cuando el departamento está completo, y total departamental como respaldo cuando faltan provincias. Fallback aplicado en <b>${moneyish(p.fallbackDepartmentCount || getFallbackDepartments().length)}</b> departamento(s): ${fallbackSummaryText()}.`;
    }else{
      projectionMethodText.innerHTML = `La proyección principal usa departamentos porque no se detectó suficiente detalle provincial en el JSON.`;
    }
  }

  const foreignMethodTitle = document.getElementById('foreignMethodCardTitle');
  const foreignMethodText = document.getElementById('foreignMethodCardText');
  if(foreignMethodTitle) foreignMethodTitle.textContent = foreignClosed ? 'Extranjero oficial ONPE' : 'Extranjero ONPE + Datum';
  if(foreignMethodText) foreignMethodText.textContent = foreignClosed ? 'El voto extranjero ya está contabilizado por ONPE. Datum deja de aplicarse al cálculo principal y queda solo como referencia histórica de cortes anteriores.' : 'Si ONPE ya contabilizó votos del extranjero, se respetan esos votos oficiales. Datum se aplica solo al extranjero pendiente.';

  const methodNote = document.getElementById('manualUpdateNote');
  if(methodNote){
    const fallbackText = (p.projectionSource === 'hibrido_provincia_departamento')
      ? ` Fallback departamental: <b>${fallbackSummaryText()}</b>.`
      : ' Sin fallback departamental en este corte.';
    methodNote.innerHTML = `Datos actualizados mediante control manual antes de publicarse. Tratamiento extranjero: <b>${foreignModeText()}</b>. Fuente de proyección Perú: <b>${sourceText}</b>.${fallbackText} Si la actualización falla, la página mantiene el último corte válido publicado.`;
  }

  renderFallbackNotice();
  ensureFallbackDownload();
  renderScenarioState();

  document.getElementById('summaryCards').innerHTML = [
    ['Actas contabilizadas', pct(n.actasContabilizadasPct, 3), `${moneyish(n.contabilizadas)} de ${moneyish(n.totalActas)} actas`],
    ['Diferencia actual ONPE', leadText(p.currentLeadKeiko), 'Diferencia con actas contabilizadas'],
    ['Diferencia Perú sin extranjero', leadText(p.withoutForeignLeadKeiko), sourceText],
    [adjustedLabel, leadText(p.adjustedLeadKeiko), `Keiko ${pct(p.adjustedKeikoPct, 3)} vs Sánchez ${pct(p.adjustedSanchezPct, 3)}`]
  ].map(([label, value, desc]) => `<article class="card"><small>${label}</small><strong>${value}</strong><span>${desc}</span></article>`).join('');

  const max = Math.max(Number(keiko.projectedAdjusted || 0), Number(sanchez.projectedAdjusted || 0));
  document.getElementById('finalBars').innerHTML = [keiko, sanchez].map(x => `
    <div class="bar-row">
      <div class="bar-meta"><span>${x.name}</span><span>${moneyish(x.projectedAdjusted)} votos</span></div>
      <div class="track"><div class="fill ${x.id === 'sanchez' ? 'sanchez' : ''}" style="width:${max ? (x.projectedAdjusted / max * 100).toFixed(2) : 0}%"></div></div>
    </div>`).join('');

  document.getElementById('mainCallout').innerHTML = `
    <strong>Lectura principal</strong>
    <p>La diferencia Perú sin extranjero queda en <b class="${leadClass(p.withoutForeignLeadKeiko)}">${leadText(p.withoutForeignLeadKeiko)}</b>, usando ${sourceText}. Al aplicar ${foreignClosed ? 'el extranjero oficial ONPE' : 'el escenario extranjero mixto —ONPE para lo ya contado y Datum solo para lo pendiente—'} la diferencia queda en <b class="${leadClass(p.adjustedLeadKeiko)}">${leadText(p.adjustedLeadKeiko)}</b>.</p>
    ${p.projectionSource === 'hibrido_provincia_departamento' ? `<p class="muted"><b>Nota de calidad del corte:</b> se usó fallback departamental en ${moneyish(p.fallbackDepartmentCount || getFallbackDepartments().length)} departamento(s) para evitar omitir provincias que no respondieron. ${fallbackSummaryText()}.</p>` : ''}
    <p class="muted">Voto extranjero estimado: ${moneyish(p.foreignVotesEstimated)} votos válidos en ${moneyish(p.foreignActs)} actas. Votos extranjeros ya contabilizados: ${moneyish(p.foreignCurrentValidVotes || 0)}. ${foreignClosed ? 'El bloque extranjero está cerrado para efectos del cálculo principal.' : `Faltante extranjero estimado: ${moneyish(p.foreignRemainingVotesEstimated || 0)}.`}</p>`;

  renderForeignSectionHeader();
  renderThreshold();
  renderSensitivity();
  renderCutChanges();
  renderHistory();
  setupProvinceDepartmentFilter();
  renderProvinces();
  renderRegions();

  document.getElementById('regionSearch')?.addEventListener('input', renderRegions);
  document.getElementById('regionFilter')?.addEventListener('change', renderRegions);
  document.getElementById('provinceSearch')?.addEventListener('input', renderProvinces);
  document.getElementById('provinceFilter')?.addEventListener('change', renderProvinces);
  document.getElementById('provinceDepartmentFilter')?.addEventListener('change', renderProvinces);
}



function renderForeignSectionHeader(){
  const eyebrow = document.getElementById('foreignSectionEyebrow');
  const title = document.getElementById('foreignSectionTitle');
  const desc = document.getElementById('foreignSectionDescription');
  const comparison = document.getElementById('thresholdComparisonTitle');
  const sensTitle = document.getElementById('sensitivityTitle');
  const sensDesc = document.getElementById('sensitivityDescription');
  const footer = document.getElementById('footerText');

  if(isForeignClosed()){
    if(eyebrow) eyebrow.textContent = 'Extranjero ONPE';
    if(title) title.textContent = 'Voto extranjero contabilizado oficialmente';
    if(desc) desc.textContent = 'El bloque extranjero ya no requiere estimación Datum para el cálculo principal. Se usa el voto extranjero contabilizado por ONPE.';
    if(comparison) comparison.textContent = 'Resultado extranjero ONPE';
    if(sensTitle) sensTitle.textContent = 'Sensibilidad cerrada';
    if(sensDesc) sensDesc.textContent = 'El extranjero ya no se simula porque no queda voto pendiente significativo en ese bloque.';
    if(footer) footer.textContent = 'Informe analítico. Datos oficiales: ONPE. Datum queda como referencia histórica si el extranjero ya fue contabilizado. No reemplaza resultados oficiales ni proclamación electoral.';
  }else{
    if(eyebrow) eyebrow.textContent = 'Umbral extranjero';
    if(title) title.textContent = 'Qué necesita Keiko del voto extranjero pendiente';
    if(desc) desc.textContent = 'Este bloque compara el porcentaje mínimo que Keiko necesita en el extranjero pendiente con el escenario Datum y con el avance parcial ONPE del extranjero.';
    if(comparison) comparison.textContent = 'Comparación contra el umbral';
    if(sensTitle) sensTitle.textContent = 'Prueba de sensibilidad del volumen extranjero';
    if(sensDesc) sensDesc.textContent = 'Estos escenarios no son pronósticos independientes. Solo prueban cómo cambiaría el resultado si el volumen final de votos extranjeros válidos termina por debajo o por encima del estimado actual.';
  }
}

function renderThreshold(){
  const cardsEl = document.getElementById('thresholdCards');
  const tableEl = document.getElementById('thresholdTable');
  const calloutEl = document.getElementById('thresholdCallout');
  const summaryEl = document.getElementById('thresholdSummaryText');
  if(!cardsEl || !tableEl || !calloutEl) return;

  const t = calculateForeignThreshold();
  const p = state.data.projection || {};

  if(isForeignClosed()){
    cardsEl.innerHTML = [
      ['Extranjero ONPE Keiko', moneyish(t.foreignActual.keiko), t.foreignActual.keikoPct === null ? 'Porcentaje no disponible' : pct(t.foreignActual.keikoPct, 2)],
      ['Extranjero ONPE Sánchez', moneyish(t.foreignActual.sanchez), t.foreignActual.sanchezPct === null ? 'Porcentaje no disponible' : pct(t.foreignActual.sanchezPct, 2)],
      ['Diferencia extranjero', leadText(t.foreignActual.leadKeiko), 'Margen oficial en el bloque extranjero'],
      ['Datum', 'No activo', 'Solo referencia histórica; no se usa en el cálculo principal']
    ].map(([label, value, desc]) => `<article class="card threshold-card"><small>${label}</small><strong>${value}</strong><span>${desc}</span></article>`).join('');

    if(summaryEl){
      summaryEl.innerHTML = `El voto extranjero ya fue incorporado como dato ONPE. La diferencia combinada antes de cualquier pendiente extranjero queda en <b class="${leadClass(t.leadBeforePending)}">${leadText(t.leadBeforePending)}</b>.`;
    }

    tableEl.innerHTML = `
      <thead><tr><th>Bloque</th><th>Keiko</th><th>Sánchez</th><th>Diferencia</th></tr></thead>
      <tbody><tr>
        <td data-label="Bloque">Extranjero ONPE</td>
        <td data-label="Keiko">${moneyish(t.foreignActual.keiko)} (${t.foreignActual.keikoPct === null ? 'N/D' : pct(t.foreignActual.keikoPct, 2)})</td>
        <td data-label="Sánchez">${moneyish(t.foreignActual.sanchez)} (${t.foreignActual.sanchezPct === null ? 'N/D' : pct(t.foreignActual.sanchezPct, 2)})</td>
        <td data-label="Diferencia" class="winner ${leadClass(t.foreignActual.leadKeiko)}">${leadText(t.foreignActual.leadKeiko)}</td>
      </tr></tbody>`;

    calloutEl.className = 'callout threshold-safe';
    calloutEl.innerHTML = `
      <strong>Extranjero cerrado</strong>
      <p>El cálculo principal ya no necesita escenario Datum para el extranjero. El bloque extranjero se toma de ONPE y Datum queda como referencia metodológica histórica.</p>
      <p class="muted">Fórmula actual: Perú proyectado sin extranjero + extranjero oficial ONPE.</p>`;
    return;
  }
  const currentForeignPct = t.foreignActual.keikoPct;
  const thresholdText = t.rawNeededPct === null ? 'No disponible' : thresholdDisplay(t.rawNeededPct, 2);
  const datumMarginText = t.datumMargin === null ? 'No disponible' : signedPoints(t.datumMargin);
  const onpeMarginText = t.onpePartialMargin === null ? 'No disponible' : signedPoints(t.onpePartialMargin);

  cardsEl.innerHTML = [
    ['Umbral extranjero', thresholdText, thresholdDescription(t.rawNeededPct)],
    ['Escenario Datum', pct(t.datumKeikoPct, 2), `${datumMarginText} frente al umbral`],
    ['ONPE extranjero parcial', currentForeignPct === null ? 'No disponible' : pct(currentForeignPct, 2), `${onpeMarginText} frente al umbral`],
    ['Extranjero pendiente estimado', moneyish(t.pendingForeign), `Total extranjero estimado: ${moneyish(p.foreignVotesEstimated || 0)}`]
  ].map(([label, value, desc]) => `<article class="card threshold-card"><small>${label}</small><strong>${value}</strong><span>${desc}</span></article>`).join('');

  if(summaryEl){
    if(Number(t.rawNeededPct) < 0){
      summaryEl.innerHTML = `Con este corte, antes de estimar el extranjero pendiente, la diferencia queda en <b class="${leadClass(t.leadBeforePending)}">${leadText(t.leadBeforePending)}</b>. El umbral extranjero ya está superado: Keiko no depende del extranjero pendiente para mantenerse arriba bajo este modelo.`;
    }else if(Number(t.rawNeededPct) > 100){
      summaryEl.innerHTML = `Con este corte, antes de estimar el extranjero pendiente, la diferencia queda en <b class="${leadClass(t.leadBeforePending)}">${leadText(t.leadBeforePending)}</b>. El umbral supera 100%, por lo que ni ganando todo el extranjero pendiente alcanzaría bajo este modelo.`;
    }else{
      summaryEl.innerHTML = `Con este corte, antes de estimar el extranjero pendiente, la diferencia queda en <b class="${leadClass(t.leadBeforePending)}">${leadText(t.leadBeforePending)}</b>. Para revertir o sostener el resultado final, Keiko necesita aproximadamente <b>${thresholdText}</b> del extranjero pendiente.`;
    }
  }

  const comparisonRows = [
    { label: 'Umbral extranjero', value: t.rawNeededPct, diff: 0, type: 'threshold' },
    { label: 'ONPE extranjero parcial', value: currentForeignPct, diff: t.onpePartialMargin, type: 'onpe' },
    { label: 'Escenario Datum extranjero', value: t.datumKeikoPct, diff: t.datumMargin, type: 'datum' }
  ];

  tableEl.innerHTML = `
    <thead><tr><th>Referencia</th><th>% Keiko</th><th>Distancia frente al umbral</th><th>Lectura</th></tr></thead>
    <tbody>${comparisonRows.map(r => {
      const value = r.value === null ? 'No disponible' : (r.type === 'threshold' ? thresholdDisplay(r.value, 2) : pct(r.value, 2));
      const diff = r.type === 'threshold' ? 'Base' : (r.diff === null ? 'No disponible' : signedPoints(r.diff));
      const ok = r.type === 'threshold' ? (Number(r.value) < 0 ? 'keiko' : 'neutral') : (Number(r.diff || 0) >= 0 ? 'keiko' : 'sanchez');
      const lectura = r.type === 'threshold'
        ? thresholdDescription(r.value)
        : Number(r.diff || 0) >= 0 ? 'Por encima del umbral' : 'Por debajo del umbral';
      return `<tr>
        <td data-label="Referencia">${r.label}</td>
        <td data-label="% Keiko">${value}</td>
        <td data-label="Distancia" class="winner ${ok}">${diff}</td>
        <td data-label="Lectura">${lectura}</td>
      </tr>`;
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
  const table = document.getElementById('sensitivityTable');
  if(!table) return;
  const section = table.closest('section');
  if(isForeignClosed()){
    if(section) section.style.display = 'none';
    return;
  }
  if(section) section.style.display = '';

  table.innerHTML = `
    <thead><tr><th>Escenario de volumen</th><th>Votos extranjeros estimados</th><th>Escenario de porcentaje</th><th>% Keiko</th><th>% Sánchez</th><th>Diferencia final</th><th>Ganador</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${r.volumeLabel || 'Escenario'}</td>
      <td>${moneyish(r.foreignVotes)}</td>
      <td>${r.pctLabel || ''}</td>
      <td>${pct(r.keikoPct, 2)}</td>
      <td>${pct(r.sanchezPct, 2)}</td>
      <td>${leadText(r.finalLeadKeiko)}</td>
      <td class="winner ${r.winner === 'Keiko' ? 'keiko' : 'sanchez'}">${r.winner}</td>
    </tr>`).join('')}</tbody>`;
}



function formatMarginShift(delta){
  const n = Number(delta || 0);
  if(n === 0) return 'Sin cambio';
  return `${n > 0 ? 'Keiko' : 'Sánchez'} +${moneyish(Math.abs(n))}`;
}

function formatVoteDelta(delta){
  const n = Number(delta || 0);
  if(n === 0) return '0';
  return `${n > 0 ? '+' : '−'}${moneyish(Math.abs(n))}`;
}

function formatPctDelta(delta, digits = 3){
  const n = Number(delta || 0);
  if(n === 0) return '0.000 pts';
  return `${n > 0 ? '+' : '−'}${Math.abs(n).toFixed(digits)} pts`;
}

function numericDelta(current, previous){
  const a = Number(current);
  const b = Number(previous);
  if(!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a - b;
}

function qualityText(e){
  if(!e) return 'N/D';
  const errors = Number(e.provinceErrors || 0);
  const fallback = Number(e.fallbackDepartmentCount || 0);
  if(errors > 0 || fallback > 0){
    return `Híbrido: fallback ${moneyish(fallback)} / errores ${moneyish(errors)}`;
  }
  return 'Provincia completa';
}

function renderCutChanges(){
  const table = document.getElementById('changesTable');
  const cards = document.getElementById('changesCards');
  if(!table || !cards) return;

  const entries = state.history || [];
  if(entries.length < 2){
    cards.innerHTML = `<article class="card"><small>Cambios</small><strong>No disponible</strong><span>Se necesitan al menos dos cortes válidos en history.json.</span></article>`;
    table.innerHTML = '';
    return;
  }

  const latest = entries[0];
  const prev = entries[1];

  const actasDelta = numericDelta(latest.actasContabilizadasPct, prev.actasContabilizadasPct);
  const currentMarginDelta = numericDelta(latest.currentLeadKeiko, prev.currentLeadKeiko);
  const adjustedMarginDelta = numericDelta(latest.adjustedLeadKeiko, prev.adjustedLeadKeiko);
  const thresholdDelta = numericDelta(latest.keikoNeededPctPendingForeign, prev.keikoNeededPctPendingForeign);
  const foreignKeikoDelta = numericDelta(latest.foreignOnpeKeiko, prev.foreignOnpeKeiko);
  const foreignSanchezDelta = numericDelta(latest.foreignOnpeSanchez, prev.foreignOnpeSanchez);

  const sourceChanged = (latest.projectionSource || '') !== (prev.projectionSource || '');
  const qualityChanged = qualityText(latest) !== qualityText(prev);

  cards.innerHTML = [
    [
      'Actas contabilizadas',
      actasDelta === null ? 'N/D' : formatPctDelta(actasDelta, 3),
      `${valueOrDash(prev.actasContabilizadasPct, x => pct(x, 3))} → ${valueOrDash(latest.actasContabilizadasPct, x => pct(x, 3))}`
    ],
    [
      'Cambio margen ONPE',
      currentMarginDelta === null ? 'N/D' : formatMarginShift(currentMarginDelta),
      `Conteo actual: ${leadText(prev.currentLeadKeiko)} → ${leadText(latest.currentLeadKeiko)}`
    ],
    [
      adjustedMetricLabel(),
      adjustedMarginDelta === null ? 'N/D' : formatMarginShift(adjustedMarginDelta),
      `Diferencia final: ${leadText(prev.adjustedLeadKeiko)} → ${leadText(latest.adjustedLeadKeiko)}`
    ],
    [
      'Calidad del corte',
      sourceChanged || qualityChanged ? 'Cambió' : 'Estable',
      `${qualityText(prev)} → ${qualityText(latest)}`
    ]
  ].map(([label, value, desc]) => `<article class="card change-card"><small>${label}</small><strong>${value}</strong><span>${desc}</span></article>`).join('');

  const rows = [
    {
      label: 'Corte',
      prev: prev.cutoff,
      latest: latest.cutoff,
      change: 'Nuevo corte válido',
      note: 'Comparación cronológica'
    },
    {
      label: 'Actas contabilizadas',
      prev: valueOrDash(prev.actasContabilizadasPct, x => pct(x, 3)),
      latest: valueOrDash(latest.actasContabilizadasPct, x => pct(x, 3)),
      change: actasDelta === null ? 'N/D' : formatPctDelta(actasDelta, 3),
      note: 'Avance del conteo'
    },
    {
      label: 'Diferencia actual ONPE',
      prev: leadText(prev.currentLeadKeiko),
      latest: leadText(latest.currentLeadKeiko),
      change: currentMarginDelta === null ? 'N/D' : formatMarginShift(currentMarginDelta),
      note: 'Cambio en margen contabilizado'
    },
    {
      label: 'Perú sin extranjero',
      prev: leadText(prev.peruNoForeignLeadKeiko),
      latest: leadText(latest.peruNoForeignLeadKeiko),
      change: formatMarginShift(numericDelta(latest.peruNoForeignLeadKeiko, prev.peruNoForeignLeadKeiko)),
      note: 'Cambio de la proyección interna'
    },
    {
      label: 'Extranjero ONPE Keiko',
      prev: moneyish(prev.foreignOnpeKeiko),
      latest: moneyish(latest.foreignOnpeKeiko),
      change: foreignKeikoDelta === null ? 'N/D' : formatVoteDelta(foreignKeikoDelta),
      note: 'Votos extranjeros ya contabilizados'
    },
    {
      label: 'Extranjero ONPE Sánchez',
      prev: moneyish(prev.foreignOnpeSanchez),
      latest: moneyish(latest.foreignOnpeSanchez),
      change: foreignSanchezDelta === null ? 'N/D' : formatVoteDelta(foreignSanchezDelta),
      note: 'Votos extranjeros ya contabilizados'
    },
    {
      label: '% Keiko extranjero',
      prev: valueOrDash(prev.foreignPartialKeikoPct, x => pct(x, 3)),
      latest: valueOrDash(latest.foreignPartialKeikoPct, x => pct(x, 3)),
      change: numericDelta(latest.foreignPartialKeikoPct, prev.foreignPartialKeikoPct) === null ? 'N/D' : formatPctDelta(numericDelta(latest.foreignPartialKeikoPct, prev.foreignPartialKeikoPct), 3),
      note: 'Participación Keiko dentro del extranjero contado'
    },
    {
      label: 'Umbral extranjero',
      prev: prev.foreignClosed ? 'Cerrado' : thresholdDisplay(prev.keikoNeededPctPendingForeign, 3),
      latest: latest.foreignClosed ? 'Cerrado' : thresholdDisplay(latest.keikoNeededPctPendingForeign, 3),
      change: latest.foreignClosed || prev.foreignClosed ? 'Cerrado' : thresholdDeltaDisplay(latest.keikoNeededPctPendingForeign, prev.keikoNeededPctPendingForeign),
      note: thresholdDescription(latest.keikoNeededPctPendingForeign)
    },
    {
      label: 'Diferencia final ajustada',
      prev: leadText(prev.adjustedLeadKeiko),
      latest: leadText(latest.adjustedLeadKeiko),
      change: adjustedMarginDelta === null ? 'N/D' : formatMarginShift(adjustedMarginDelta),
      note: isForeignClosed() ? 'Con extranjero ONPE' : 'Con escenario mixto ONPE + Datum'
    },
    {
      label: 'Fuente / calidad',
      prev: `${historySourceLabel(prev.projectionSource || '')}; ${qualityText(prev)}`,
      latest: `${historySourceLabel(latest.projectionSource || '')}; ${qualityText(latest)}`,
      change: sourceChanged || qualityChanged ? 'Revisar calidad' : 'Sin cambio relevante',
      note: 'Indica si hubo fallback o errores provinciales'
    }
  ];

  table.innerHTML = `
    <thead><tr>
      <th>Indicador</th><th>Corte anterior</th><th>Último corte</th><th>Cambio</th><th>Lectura</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td data-label="Indicador">${r.label}</td>
      <td data-label="Corte anterior">${r.prev}</td>
      <td data-label="Último corte">${r.latest}</td>
      <td data-label="Cambio"><b>${r.change}</b></td>
      <td data-label="Lectura">${r.note}</td>
    </tr>`).join('')}</tbody>`;
}


function renderHistory(){
  const table = document.getElementById('historyTable');
  const cards = document.getElementById('historyCards');
  if(!table || !cards) return;

  const entries = state.history || [];
  if(!entries.length){
    cards.innerHTML = `<article class="card"><small>Historial</small><strong>No disponible</strong><span>No se encontró data/history.json.</span></article>`;
    table.innerHTML = '';
    return;
  }

  const latest = entries[0];
  const first = entries[entries.length - 1];
  const threshold = latest.foreignClosed ? 'Cerrado' : thresholdDisplay(latest.keikoNeededPctPendingForeign, 2);
  const trend = Number(latest.adjustedLeadKeiko || 0) - Number(first.adjustedLeadKeiko || 0);

  cards.innerHTML = [
    ['Cortes válidos', moneyish(entries.length), 'Solo cortes con ZIP de datos generado'],
    ['Último corte', latest.cutoff, `${valueOrDash(latest.actasContabilizadasPct, x => pct(x, 3))} actas contabilizadas`],
    ['Último umbral extranjero', threshold, latest.foreignClosed ? 'Datum ya no está activo' : thresholdDescription(latest.keikoNeededPctPendingForeign)],
    ['Cambio desde primer corte', leadText(trend), 'Variación de la ventaja ajustada en el historial']
  ].map(([label, value, desc]) => `<article class="card history-card"><small>${label}</small><strong>${value}</strong><span>${desc}</span></article>`).join('');

  table.innerHTML = `
    <thead><tr>
      <th>Corte</th><th>Actas</th><th>Fuente</th><th>ONPE actual</th><th>Perú sin extranjero</th><th>Extranjero Keiko</th><th>Umbral</th><th>Diferencia final</th><th>Calidad</th>
    </tr></thead>
    <tbody>${entries.map(e => {
      const quality = Number(e.provinceErrors || 0) > 0 || Number(e.fallbackDepartmentCount || 0) > 0
        ? `Fallback ${moneyish(e.fallbackDepartmentCount || 0)} / errores ${moneyish(e.provinceErrors || 0)}`
        : 'Provincia completa';
      const thresholdText = e.foreignClosed ? 'Cerrado' : thresholdDisplay(e.keikoNeededPctPendingForeign, 2);
      return `<tr>
        <td data-label="Corte">${e.cutoff}</td>
        <td data-label="Actas">${valueOrDash(e.actasContabilizadasPct, x => pct(x, 3))}</td>
        <td data-label="Fuente">${historySourceLabel(e.projectionSource || '')}</td>
        <td data-label="ONPE actual" class="winner ${leadClass(e.currentLeadKeiko)}">${leadText(e.currentLeadKeiko)}</td>
        <td data-label="Perú sin extranjero" class="winner ${leadClass(e.peruNoForeignLeadKeiko)}">${leadText(e.peruNoForeignLeadKeiko)}</td>
        <td data-label="Extranjero Keiko">${valueOrDash(e.foreignPartialKeikoPct, x => pct(x, 3))}</td>
        <td data-label="Umbral">${thresholdText}</td>
        <td data-label="Diferencia final" class="winner ${leadClass(e.adjustedLeadKeiko)}">${leadText(e.adjustedLeadKeiko)}</td>
        <td data-label="Calidad">${quality}</td>
      </tr>`;
    }).join('')}</tbody>`;
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
    const p = state.data.projection || {};
    const fallback = getFallbackDepartments();
    const fallbackText = fallback.length ? ` Modelo híbrido con fallback en ${moneyish(fallback.length)} departamento(s): ${fallbackSummaryText()}.` : '';
    count.textContent = `${moneyish(rows.length)} provincias visibles de ${moneyish(state.provinces.length)} procesadas.${fallbackText}`;
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
