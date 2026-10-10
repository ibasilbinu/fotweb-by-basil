/* FotWeb evidence-first post-match report renderer. No external service requests. */
function fwReportPanel(title, body, id, note) {
  return '<section class="fw-report-section" id="' + esc(id) + '"><div class="fw-report-heading"><h3>' +
    esc(title) + '</h3>' + (note ? '<span class="fw-report-kicker">' + esc(note) + '</span>' : '') +
    '</div><div class="fw-report-content">' + body + '</div></section>';
}
function fwMissing(message) {
  return '<p class="fw-report-missing">◌ ' + esc(message) + '</p>';
}
function fwValue(value, unit) {
  return value === undefined || value === null ? '—' : esc(String(value) + (unit || ''));
}
function fwStatRows(match) {
  const defs = [
    ['possession', 'Possession', '%'], ['shots', 'Shots', ''], ['shotsOnTarget', 'Shots on target', ''],
    ['passes', 'Passes', ''], ['passAccuracy', 'Pass accuracy', '%'], ['corners', 'Corners', ''],
    ['bigChances', 'Big chances', ''], ['offsides', 'Offsides', ''], ['fouls', 'Fouls', ''],
    ['yellowCards', 'Yellow cards', ''], ['redCards', 'Red cards', ''], ['tackles', 'Tackles', ''],
    ['interceptions', 'Interceptions', ''], ['clearances', 'Clearances', ''], ['saves', 'Saves', ''],
    ['xg', 'Expected goals (xG)', '']
  ];
  const h = match.stats?.home || {}, a = match.stats?.away || {};
  const available = defs.filter(([key]) => h[key] != null || a[key] != null);
  if (!available.length) return fwMissing('Detailed match statistics have not been verified from an approved source.');
  return '<div class="fw-comparison">' + available.map(([key, label, suffix]) => {
    const hv=h[key], av=a[key], total=(hv || 0)+(av || 0);
    const hp=hv == null ? 0 : total ? (hv / total * 100) : 50;
    const ap=av == null ? 0 : total ? (av / total * 100) : 50;
    return '<div class="fw-comparison-row"><div class="fw-comparison-values"><strong>' + fwValue(hv,suffix) +
      '</strong><span>' + esc(label) + '</span><strong>' + fwValue(av,suffix) +
      '</strong></div><div class="fw-comparison-bars"><div class="fw-comparison-left"><i style="width:' +
      hp.toFixed(2) + '%"></i></div><div class="fw-comparison-right"><i style="width:' +
      ap.toFixed(2) + '%"></i></div></div></div>';
  }).join('') + '</div><p class="fw-report-footnote">Only published and source-verified values are shown. Missing numbers are not treated as zero.</p>';
}
function fwEfficiency(match) {
  const h=match.stats?.home || {}, a=match.stats?.away || {};
  const efficiency=(side,team,goals) => {
    let boxes = [];
    if (side.shots != null && side.shots > 0 && side.shotsOnTarget != null)
      boxes.push(['Shot accuracy', (side.shotsOnTarget / side.shots * 100).toFixed(1) + '%']);
    if (side.shots != null && side.shots > 0)
      boxes.push(['Shot conversion', (goals / side.shots * 100).toFixed(1) + '%']);
    if (side.xg != null) boxes.push(['Published xG', String(side.xg)]);
    if (!boxes.length) return '';
    return '<div class="fw-efficiency-team"><strong>' + esc(team) + '</strong><div class="fw-efficiency-grid">' +
      boxes.map(([label,val])=>'<div><small>' + esc(label) + '</small><strong>' + esc(val) + '</strong></div>').join('') +
      '</div></div>';
  };
  const content=efficiency(h,match.home,match.homeGoals)+efficiency(a,match.away,match.awayGoals);
  return content ? '<div class="fw-efficiency">' + content + '</div>' :
    fwMissing('Shot-efficiency and xG comparisons require verified shot totals or published xG.');
}
function fwShotMap(match) {
  const shots=Array.isArray(match.shotMap) ? match.shotMap : [];
  if(!shots.length) return fwMissing('Shot locations are not available. A verified, licensed event-data source is required for a shot map.');
  const markers=shots.map(s=>{
    const symbol=s.outcome==='goal' ? '●' : s.outcome==='saved' ? '○' : '×';
    return '<span class="fw-shot fw-shot-' + esc(s.side) + '" style="left:' + Number(s.x).toFixed(2) +
      '%;top:' + Number(s.y).toFixed(2) + '%" title="' + esc((s.side==='home'?match.home:match.away) +
      ': ' + s.outcome + (s.xg == null ? '' : ' · xG ' + s.xg)) + '">' + symbol + '</span>';
  }).join('');
  return '<div class="fw-pitch" role="img" aria-label="Verified shot location chart"><div class="fw-pitch-centre"></div><div class="fw-pitch-box fw-pitch-box-top"></div><div class="fw-pitch-box fw-pitch-box-bottom"></div>' +
    markers + '</div><p class="fw-report-footnote">Shot coordinates shown only when sourced, licensed and verified. Green: home, orange: away. ● goal, ○ saved, × other.</p>';
}
function fwTactics(match) {
  const findings=Array.isArray(match.tacticalInsights)?match.tacticalInsights:[];
  const formations=match.lineups || {};
  const form=['home','away'].filter(s=>formations[s]?.formation).map(s =>
    '<div><small>' + esc(s==='home'?match.home:match.away) + '</small><strong>' +
    esc(formations[s].formation) + '</strong></div>').join('');
  const display=form ? '<div class="fw-formations">' + form + '</div>' : '';
  const insights=findings.map(t => '<article class="fw-finding"><strong>' + esc(t.title) +
    '</strong><p>' + esc(t.text) + '</p>' + sourceLink(t.sourceUrl,'Evidence') + '</article>').join('');
  return display + (insights || fwMissing('No evidence-backed tactical findings have been published for this match yet. Formations alone do not establish a tactical conclusion.'));
}
function fwPlayers(match) {
  const players=Array.isArray(match.players)?match.players:[];
  const lineup=match.lineups || {};
  const metrics=[['goals','Goals'],['assists','Assists'],['shots','Shots'],['passes','Passes'],['tackles','Tackles'],['saves','Saves'],['rating','Rating']];
  const cards=players.map(p=>{
    const nums=metrics.filter(([k])=>p[k] != null).map(([k,label])=>'<span>' + esc(label) + ' <strong>' +
      esc(p[k]) + '</strong></span>').join('');
    return '<div class="fw-player"><div><strong>' + esc(p.name) + '</strong><small>' +
      esc(p.side==='home'?match.home:match.away) + (p.position?' · '+p.position:'') +
      '</small></div><div class="fw-player-numbers">' + (nums||'Verified appearance') + '</div></div>';
  }).join('');
  const lineups=['home','away'].map(side=>{
    const list=lineup[side]?.starters;
    if (!Array.isArray(list)||!list.length) return '';
    return '<div class="fw-lineup"><h4>' + esc(side==='home'?match.home:match.away) +
      ' starting XI</h4><div>' + list.map(p=>'<span>' + (p.number==null?'':esc(p.number)+' · ') +
      esc(p.name) + '</span>').join('') + '</div></div>';
  }).join('');
  return (cards?'<div class="fw-player-list">'+cards+'</div>':'') +
    (lineups?'<div class="fw-lineups">'+lineups+'</div>':'') ||
    fwMissing('Verified player metrics and starting lineups have not been published for this match.');
}
function fwTimeline(match) {
  const events=Array.isArray(match.events)?match.events:[];
  if(!events.length) return fwMissing('No individually verified goal, card or substitution events have been recorded yet.');
  const types={goal:'Goal',penalty_goal:'Penalty goal',own_goal:'Own goal',penalty_missed:'Penalty missed',
    yellow_card:'Yellow card',red_card:'Red card',substitution:'Substitution',var:'VAR',other:'Match event'};
  return '<ol class="fw-timeline">' + events.slice().sort((a,b)=>a.minute-b.minute || (a.addedMinute||0)-(b.addedMinute||0)).map(e=>{
    let detail=[e.player,e.assist?'Assist: '+e.assist:null,e.playerOut?'Off: '+e.playerOut:null,
      e.playerIn?'On: '+e.playerIn:null,e.detail].filter(Boolean).join(' · ');
    return '<li><span class="fw-minute">' + esc(e.minute) + (e.addedMinute?'+'+esc(e.addedMinute):'') +
      '′</span><span class="fw-event-mark fw-event-' + esc(e.side) + '"></span><div><strong>' +
      esc(types[e.type]||'Match event') + ' · ' + (e.side==='home'?match.home:match.away) +
      '</strong><p>' + esc(detail || 'Verified event') + '</p></div></li>';
  }).join('') + '</ol>';
}
function fwVerdict(match) {
  const v=match.verdict;
  const score=match.homeGoals===match.awayGoals ? 'The match finished level.' :
    esc(match.homeGoals>match.awayGoals?match.home:match.away) + ' won the match.';
  const h=match.stats?.home || {}, a=match.stats?.away || {};
  let facts=[score];
  if(h.shots != null && a.shots != null)
    facts.push(esc(match.home) + ' recorded ' + h.shots + ' shots; ' + esc(match.away) + ' recorded ' + a.shots + '.');
  if(h.xg != null && a.xg != null)
    facts.push('Published xG: ' + esc(match.home) + ' ' + h.xg + '–' + a.xg + ' ' + esc(match.away) + '.');
  const factBox='<div class="fw-verdict-facts"><strong>Data-driven takeaway</strong><p>' + facts.join(' ') +
    '</p></div>';
  if(!v || !v.summary) return factBox + fwMissing('The tactical verdict is pending evidence-backed review. Scorelines and possession alone do not prove tactical causes.');
  const fields=[['Key match factor',v.keyFactor],['What the home side can improve',v.homeImprovement],
    ['What the away side can improve',v.awayImprovement]].filter(([,value])=>value);
  return factBox + '<div class="fw-verdict-analysis"><h4>FotWeb Tactical Verdict · sourced interpretation</h4><p>' +
    esc(v.summary) + '</p>' + fields.map(([label,value])=>'<div><strong>' + esc(label) +
    '</strong><p>' + esc(value) + '</p></div>').join('') + sourceLink(v.sourceUrl,'Evidence for analysis') + '</div>';
}
function fwMatchReport(match) {
  const homeTeam=seasonData.teams.find(t=>t.name===canonical(match.home));
  const awayTeam=seasonData.teams.find(t=>t.name===canonical(match.away));
  const shield=t=>t?crest(t,'small'):'';
  const id='report-'+match.id;
  const labels=[['overview','Overview'],['statistics','Statistics'],['advanced','Advanced analytics'],
    ['tactics','Tactical analysis'],['players','Players & lineups'],['timeline','Match timeline'],['verdict','Tactical verdict']];
  const nav='<nav class="fw-report-nav" aria-label="Match report sections">' +
    labels.map(([key,label])=>'<a href="#'+esc(id+'-'+key)+'">'+esc(label)+'</a>').join('')+'</nav>';
  const headerBox='<header class="fw-match-hero"><span class="eyebrow">VERIFIED POST-MATCH REPORT</span>' +
    '<p>'+esc(formatDate(match.date))+' · '+esc(match.venue||'Venue unconfirmed')+
    ' · '+esc(match.status)+'</p><div class="fw-match-score"><div>'+shield(homeTeam)+'<strong>'+esc(match.home)+
    '</strong></div><span>'+esc(match.homeGoals)+' <small>—</small> '+esc(match.awayGoals)+
    '</span><div>'+shield(awayTeam)+'<strong>'+esc(match.away)+'</strong></div></div></header>';
  const overview='<p class="fw-report-summary">'+esc(match.report ||
    'The final score is verified. A sourced match narrative has not yet been published.')+'</p>' +
    '<p class="fw-report-footnote">Verified '+esc(formatDate(match.verifiedAt))+' · '+
    esc(formatTime(match.verifiedAt))+' IST. Match phase: '+esc(match.phase)+'.</p>'+
    (match.matchUrl?'<p class="fw-report-links">'+sourceLink(match.matchUrl,'Official match centre')+'</p>':'');
  const sourceLinks=match.sources.map(s=>sourceLink(s.url,s.label)).join(' <span class="fw-link-separator">·</span> ');
  return '<article id="'+esc(id)+'" class="fw-report">'+headerBox+nav+
    fwReportPanel('01 · Match overview',overview,id+'-overview','MATCH CONTEXT')+
    fwReportPanel('02 · Match statistics',fwStatRows(match),id+'-statistics','VERIFIED METRICS')+
    fwReportPanel('03 · Advanced analytics',fwEfficiency(match)+fwShotMap(match),id+'-advanced','DATA VISUALIZATION')+
    fwReportPanel('04 · Tactical analysis',fwTactics(match),id+'-tactics','EVIDENCE-BASED')+
    fwReportPanel('05 · Player performance & lineups',fwPlayers(match),id+'-players','INDIVIDUALS')+
    fwReportPanel('06 · Match timeline',fwTimeline(match),id+'-timeline','KEY EVENTS')+
    fwReportPanel('07 · FotWeb Tactical Verdict',fwVerdict(match),id+'-verdict','ANALYST VIEW')+
    '<footer class="fw-report-sources"><strong>Verified sources</strong><div>'+sourceLinks+
    (match.fotmobUrl?' <span class="fw-link-separator">·</span> '+sourceLink(match.fotmobUrl,'View on FotMob (external)'):'')+
    '</div><p>FotMob data is not scraped or copied. Only approved sources and published, verifiable facts enter this report.</p></footer></article>';
}
function buildDetailedReportsPage() {
  const matches=resultsData.matches.filter(m=>state.team==='all'||canonical(m.home)===club(state.team).name||
    canonical(m.away)===club(state.team).name).sort((a,b)=>b.date.localeCompare(a.date));
  const intro=header('Beyond the final score.','Evidence-led match reports, statistics, analysis and a tactical verdict.');
  if(matches.length) return intro+matches.map(fwMatchReport).join('')+
    '<p class="fw-report-footnote">Automatic checks run hourly; available details depend on the source and may arrive after the final score.</p>';
  const sections=['Match overview','Match statistics','Advanced analytics & shot map',
    'Tactical analysis','Player performance & lineups','Match timeline','FotWeb Tactical Verdict'];
  return intro+'<div class="fw-report-waiting"><span class="eyebrow">MATCH REPORT ENGINE READY</span>'+
    '<h2>Waiting for the first verified full-time result.</h2><p>Each completed ISL match will get its own sourced report. New records are checked hourly. Detailed numbers, shot locations and tactical findings appear only when their evidence is available.</p>'+
    '<div class="fw-report-feature-grid">'+sections.map((s,i)=>'<div><span>0'+(i+1)+'</span><strong>'+esc(s)+
    '</strong><small>'+esc(i===0?'Final result and factual summary':'Appears as verified information becomes available')+
    '</small></div>').join('')+'</div></div>';
}
