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
/* Verified squad data presented on a schematic football pitch.
   Exact left/right positions are never inferred from squad-list order. */
function fwLineupRole(position) {
  const p=String(position||'').trim().toLowerCase();
  if(/^(goalkeeper|keeper|gk)$/.test(p)) return 'goalkeeper';
  if(/^(defender|defence|defense|centre back|center back|left back|right back|fullback|wingback|cb|lb|rb|lwb|rwb)$/.test(p)) return 'defender';
  if(/^(midfielder|midfield|central midfielder|defensive midfielder|attacking midfielder|cm|dm|am|cdm|cam)$/.test(p)) return 'midfielder';
  if(/^(forward|striker|winger|centre forward|center forward|left winger|right winger|cf|st|lw|rw)$/.test(p)) return 'forward';
  return 'unknown';
}
function fwLineupShortName(name) {
  const full=String(name||'').trim();
  return full.length<=14?full:full.split(/\s+/).slice(-1)[0];
}
function fwLineupPlayerChip(player) {
  const number=player.number==null?'—':esc(player.number);
  const name=String(player.name||'');
  return '<div class="fw-pitch-player" title="'+esc(name)+'" aria-label="'+esc(name+
    (player.number==null?'':' · number '+player.number))+'">'+
    '<span class="fw-pitch-shirt" aria-hidden="true">'+number+'</span>'+
    '<span class="fw-pitch-player-name">'+esc(fwLineupShortName(name))+'</span></div>';
}
/* Only an official ISL match-centre Ground View may authorize a positioned XI.
   Same-match source, published formation, and eleven verified locations required. */
/* FotWeb uses a confirmed Starting XI list, not a positional pitch diagram. */
function fwLineupListPanel(match,side) {
  const teamName=side==='home'?match.home:match.away;
  const info=match.lineups?.[side];
  const starters=Array.isArray(info?.starters)?info.starters:[];
  const verifiedPlayers=Array.isArray(match.players)?match.players:[];
  const fullXI=starters.slice().sort((a,b)=>{
    const aNo=Number.isInteger(a.number)?a.number:Infinity;
    const bNo=Number.isInteger(b.number)?b.number:Infinity;
    return aNo-bNo||String(a.name||'').localeCompare(String(b.name||''));
  }).map(p=>{
    const record=verifiedPlayers.find(item=>item.side===side &&
      String(item.name||'').trim().toLowerCase()===String(p.name||'').trim().toLowerCase());
    const role=String(p.position||record?.position||'').trim();
    return '<li class="fw-xi-player"><span class="fw-xi-shirt-number">'+
      (p.number==null?'—':esc(p.number))+'</span><span class="fw-xi-player-details">'+
      '<span class="fw-xi-player-name">'+esc(p.name)+'</span>'+
      (role?'<small class="fw-xi-player-role">'+esc(role)+'</small>':'')+
      '</span></li>';
  }).join('');
  const formation=info?.formation?
    '<span class="fw-pitch-formation" title="Previously recorded formation; reviewed against official ISL updates">Recorded formation: '+
    esc(info.formation)+'</span>':
    '<span class="fw-lineup-no-formation">Official formation not yet confirmed</span>';
  const officialMatchLink=(()=>{
    const url=safeUrl(match.matchUrl);
    if(!url)return '';
    try {
      const parsed=new URL(url);
      if(!['indiansuperleague.com','www.indiansuperleague.com'].includes(parsed.hostname)||
        !/^\/matchcentre\/\d+\/?$/.test(parsed.pathname))return '';
      return '<p class="fw-lineup-external">'+
        sourceLink(url,'View official ISL lineup')+'</p>';
    } catch {return '';}
  })();
  return '<div class="fw-lineup-panel" id="fw-lineup-panel-'+esc(match.id)+'-'+side+'" '+
    'data-lineup-panel="'+side+'" role="tabpanel" aria-labelledby="fw-lineup-tab-'+
    esc(match.id)+'-'+side+'"'+(side==='away'?' hidden':'')+'>'+
    '<div class="fw-lineup-pitch-footer">'+formation+
      '<span>'+esc(starters.length)+' starting players</span></div>'+
    '<div class="fw-xi-list" aria-label="'+esc(teamName)+' starting players">'+
      '<h5>Starting XI <span>'+esc(starters.length)+' players</span></h5>'+
      '<ol>'+fullXI+'</ol></div>'+
    '<p class="fw-lineup-disclaimer">The starting XI and recorded formation are reviewed against the official ISL match centre as updates become available.</p>'+
    officialMatchLink+'</div>';
}
function fwLineupList(match) {
  const home=match.lineups?.home,away=match.lineups?.away;
  const hasHome=Array.isArray(home?.starters)&&home.starters.length;
  const hasAway=Array.isArray(away?.starters)&&away.starters.length;
  if(!hasHome&&!hasAway)return '';
  const defaultSide=hasHome?'home':'away';
  const tab=side=>{
    const t=seasonData.teams.find(t=>t.name===canonical(side==='home'?match.home:match.away));
    const info=match.lineups?.[side],available=side==='home'?hasHome:hasAway;
    const name=side==='home'?match.home:match.away;
    return '<button type="button" role="tab" id="fw-lineup-tab-'+esc(match.id)+'-'+side+
      '" data-lineup-side="'+side+'" aria-controls="fw-lineup-panel-'+esc(match.id)+'-'+side+
      '" aria-selected="'+(side===defaultSide)+'"'+(!available?' disabled':'')+
      ' class="fw-lineup-tab'+(side===defaultSide?' active':'')+'">'+
      (t?crest(t,'small'):'')+'<span><strong>'+esc(name)+'</strong><small>'+
      esc(info?.formation||'Formation unavailable')+'</small></span></button>';
  };
  let panels='';
  if(hasHome)panels+=fwLineupListPanel(match,'home');
  if(hasAway)panels+=fwLineupListPanel(match,'away').replace(
    /(<div class="fw-lineup-panel"[^>]*data-lineup-panel="away"[^>]*)( hidden)/,
    (_,open)=>open+(defaultSide==='away'?'':' hidden'));
  if(!hasHome&&hasAway)panels=panels.replace(/(data-lineup-panel="away"[^>]*)( hidden)/,'$1');
  return '<section class="fw-lineup-shell" aria-label="Starting XI lineups">'+
    '<div class="fw-lineup-title"><div><span class="eyebrow">STARTING XI</span>'+
    '<h4>Team lineups</h4></div><span class="fw-lineup-title-tag">LINEUP LIST</span></div>'+
    '<div class="fw-lineup-tabs" role="tablist" aria-label="Choose a team">'+
      tab('home')+tab('away')+'</div>'+panels+'</section>';
}
function fwLineup(match) {
  return fwLineupList(match) ||
    fwMissing('Verified starting lineups have not been published for this match.');
}
function fwPlayerStats(match) {
  const players=Array.isArray(match.players)?match.players:[];
  const metrics=[['goals','Goals'],['assists','Assists'],['shots','Shots'],['passes','Passes'],
    ['tackles','Tackles'],['saves','Saves'],['rating','Rating']];
  const cards=players.map(p=>{
    const nums=metrics.filter(([k])=>p[k] != null).map(([k,label])=>'<span>' + esc(label) +
      ' <strong>' + esc(p[k]) + '</strong></span>').join('');
    return '<div class="fw-player"><div><strong>' + esc(p.name) + '</strong><small>' +
      esc(p.side==='home'?match.home:match.away) + (p.position?' · '+p.position:'') +
      '</small></div><div class="fw-player-numbers">' + (nums||'Verified appearance') + '</div></div>';
  }).join('');
  return cards ? '<div class="fw-player-list">'+cards+'</div>' :
    fwMissing('Verified individual player statistics have not been published for this match.');
}
function fwTimeline(match) {
  const events=Array.isArray(match.events)?match.events:[];
  if(!events.length) return fwMissing('No individually verified goal, card or substitution events have been recorded yet.');
  const types={goal:'Goal',penalty_goal:'Penalty goal',own_goal:'Own goal',penalty_missed:'Penalty missed',
    yellow_card:'Yellow card',red_card:'Red card',second_yellow_red:'Second yellow · red card',substitution:'Substitution',var:'VAR',other:'Match event'};
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
function fwGoalScorers(match) {
  const goals=(Array.isArray(match.events)?match.events:[])
    .filter(e=>['goal','penalty_goal','own_goal'].includes(e.type) &&
      (e.side==='home'||e.side==='away'))
    .sort((a,b)=>(a.minute??0)-(b.minute??0)||(a.addedMinute??0)-(b.addedMinute??0));
  const finalGoals=(Number(match.homeGoals)||0)+(Number(match.awayGoals)||0);
  if(finalGoals===0) return '<div class="fw-goals-under-score"><span class="fw-goals-heading">GOAL SCORERS</span>'+
    '<p class="fw-goals-empty">No goals scored</p></div>';
  const known=goals.filter(e=>e.player);
  if(!known.length) return '<div class="fw-goals-under-score"><span class="fw-goals-heading">GOAL SCORERS</span>'+
    '<p class="fw-goals-empty">Scorers pending verification</p></div>';
  const sideGoals=side=>goals.filter(e=>e.side===side&&e.player);
  const formatGoal=e=>{
    const suffix=e.type==='own_goal'?' (OG)':e.type==='penalty_goal'?' (P)':'';
    const minute=e.minute==null?'':(' · '+esc(e.minute)+(e.addedMinute?'+'+esc(e.addedMinute):'')+'′');
    return '<li><span class="fw-goal-ball" aria-hidden="true">⚽</span><span>'+
      esc(e.player)+esc(suffix)+'<span class="fw-goal-minute">'+minute+'</span></span></li>';
  };
  const column=side=>'<div class="fw-goals-team fw-goals-'+side+'"><ul>'+
    sideGoals(side).map(formatGoal).join('')+'</ul></div>';
  const pending=known.length<finalGoals?
    '<p class="fw-goals-pending">Some scorer details are still awaiting verification.</p>':'';
  return '<div class="fw-goals-under-score"><span class="fw-goals-heading">GOAL SCORERS</span>'+
    '<div class="fw-goals-columns">'+column('home')+column('away')+'</div>'+pending+'</div>';
}
/* Red-card summary directly below the scoreboard. Second-yellow dismissals
   use layered CSS cards; never infer discipline from the final score. */
function fwRedCards(match) {
  const events=Array.isArray(match.events)?match.events:[];
  const redEvents=events.filter(e=>['red_card','second_yellow_red'].includes(e.type)&&
    (e.side==='home'||e.side==='away'))
    .sort((a,b)=>(a.minute??0)-(b.minute??0)||(a.addedMinute??0)-(b.addedMinute??0));
  if(!redEvents.length) return '';
  const isSecondYellow=e=>{
    if(e.type==='second_yellow_red') return true;
    if(!e.player||e.minute==null) return false;
    /* Only establish two yellows from two individually verified events. */
    const name=e.player.trim().toLocaleLowerCase();
    return events.filter(y=>y.type==='yellow_card'&&y.side===e.side&&
      typeof y.player==='string'&&y.player.trim().toLocaleLowerCase()===name&&
      (y.minute<e.minute||(y.minute===e.minute&&(y.addedMinute||0)<=(e.addedMinute||0)))).length>=2;
  };
  const cardIcon=twoYellows=>'<span class="fw-dismissal-cards '+(twoYellows?'fw-dismissal-double':'fw-dismissal-straight')+
    '" aria-hidden="true">'+(twoYellows?'<i class="fw-dismissal-yellow"></i>':'')+
    '<i class="fw-dismissal-red"></i></span>';
  const item=e=>{
    const twoYellows=isSecondYellow(e);
    const typeLabel=twoYellows?'Second yellow, red card':'Red card';
    const minute=e.minute==null?'':' · '+esc(e.minute)+(e.addedMinute?'+'+esc(e.addedMinute):'')+'′';
    return '<li aria-label="'+esc((e.player||'Player not verified')+', '+typeLabel+
      (e.minute==null?'':' at '+e.minute+(e.addedMinute?'+'+e.addedMinute:'')+' minutes'))+'">'+
      cardIcon(twoYellows)+'<span class="fw-dismissal-info"><strong>'+
      esc(e.player||'Player not verified')+'</strong><span class="fw-dismissal-minute">'+minute+
      '</span></span></li>';
  };
  const side=which=>'<div class="fw-reds-team fw-reds-'+which+'"><ul>'+
    redEvents.filter(e=>e.side===which).map(item).join('')+'</ul></div>';
  return '<section class="fw-reds-under-score" aria-label="Match red cards">'+
    '<span class="fw-reds-heading">RED CARDS</span>'+
    '<div class="fw-reds-columns">'+side('home')+side('away')+'</div></section>';
}
function fwMatchReport(match) {
  const homeTeam=seasonData.teams.find(t=>t.name===canonical(match.home));
  const awayTeam=seasonData.teams.find(t=>t.name===canonical(match.away));
  const shield=t=>t?crest(t,'small'):'';
  const id='report-'+match.id;
  const labels=[['overview','Overview'],['lineup','Lineup'],['statistics','Statistics'],
    ['players','Player stats'],['timeline','Match timeline'],['tactics','Tactical analytics'],
    ['advanced','Advanced analytics'],['verdict','Tactical verdict']];
  const nav='<nav class="fw-report-nav" aria-label="Match report sections">' +
    labels.map(([key,label])=>'<button type="button" data-report-section="'+esc(id+'-'+key)+'">'+esc(label)+'</button>').join('')+'</nav>';
  const headerBox='<header class="fw-match-hero"><span class="eyebrow">VERIFIED POST-MATCH REPORT</span>' +
    '<p>'+esc(formatDate(match.date))+' · '+esc(match.venue||'Venue unconfirmed')+
    ' · '+esc(match.status)+'</p><div class="fw-match-score"><div>'+shield(homeTeam)+'<strong>'+esc(match.home)+
    '</strong></div><span>'+esc(match.homeGoals)+' <small>—</small> '+esc(match.awayGoals)+
    '</span><div>'+shield(awayTeam)+'<strong>'+esc(match.away)+'</strong></div></div>'+fwGoalScorers(match)+fwRedCards(match)+'</header>';
  const overview='<p class="fw-report-summary">'+esc(match.report ||
    'The final score is verified. A sourced match narrative has not yet been published.')+'</p>' +
    '<p class="fw-report-footnote">Verified '+esc(formatDate(match.verifiedAt))+' · '+
    esc(formatTime(match.verifiedAt))+' IST. Match phase: '+esc(match.phase)+'.</p>'+
    (match.matchUrl?'<p class="fw-report-links">'+sourceLink(match.matchUrl,'Official match centre')+'</p>':'');
  const sourceLinks=match.sources.map(s=>sourceLink(s.url,s.label)).join(' <span class="fw-link-separator">·</span> ');
  return '<article id="'+esc(id)+'" class="fw-report">'+headerBox+nav+
    fwReportPanel('01 · Match overview',overview,id+'-overview','MATCH CONTEXT')+
    fwReportPanel('02 · Lineup',fwLineup(match),id+'-lineup','STARTING XI')+
    fwReportPanel('03 · Match statistics',fwStatRows(match),id+'-statistics','VERIFIED METRICS')+
    fwReportPanel('04 · Player stats',fwPlayerStats(match),id+'-players','INDIVIDUALS')+
    fwReportPanel('05 · Match timeline',fwTimeline(match),id+'-timeline','KEY EVENTS')+
    fwReportPanel('06 · Tactical analytics',fwTactics(match),id+'-tactics','EVIDENCE-BASED')+
    fwReportPanel('07 · Advanced analytics',fwEfficiency(match)+fwShotMap(match),id+'-advanced','DATA VISUALIZATION')+
    fwReportPanel('08 · FotWeb Tactical Verdict',fwVerdict(match),id+'-verdict','ANALYST VIEW')+
    '<footer class="fw-report-sources"><strong>Verified sources</strong><div>'+sourceLinks+
    (match.fotmobUrl?' <span class="fw-link-separator">·</span> '+sourceLink(match.fotmobUrl,'View on FotMob (external)'):'')+
    '</div><p>FotMob data is not scraped or copied. Only approved sources and published, verifiable facts enter this report.</p></footer></article>';
}
/* Compact fixtures first; the full eight-section report opens on request. */
function fwMatchFixtureRow(f) {
  const h=club(f.homeId), a=club(f.awayId), r=f.result;
  const completed=!!r;
  const status=completed?'FULL TIME':f.status==='PST'?'POSTPONED':
    f.status==='CANC'?'CANCELLED':f.needsConfirmation?'DATE TO CONFIRM':
    istDate(f.kickoff)<today?'AWAITING RESULT':'UPCOMING';
  const when=(!f.timeUnknown ? formatTime(f.kickoff)+' IST' : 'Time unconfirmed');
  const meta='<span class="fw-match-list-meta">'+esc(when)+' · '+esc(r?.venue||f.venue||'Venue TBC')+'</span>';
  const content='<span class="fw-match-list-info"><span class="fw-match-list-status '+(completed?'is-final':'')+'">'+
    esc(status)+'</span>'+meta+'</span>'+
    '<span class="fw-match-list-main"><span class="fw-match-list-club">'+crest(h,'small')+
    '<strong>'+esc(h.name)+'</strong></span><span class="fw-match-list-score">'+
    (completed?esc(r.homeGoals)+' <em>–</em> '+esc(r.awayGoals):'<em>vs</em>')+
    '</span><span class="fw-match-list-club fw-match-list-away">'+crest(a,'small')+
    '<strong>'+esc(a.name)+'</strong></span></span>'+
    '<span class="fw-match-list-footer">'+(completed?
      '<span class="fw-match-list-link">View detailed match report <span aria-hidden="true">↗</span></span>':
      '<span class="fw-match-list-unavailable">'+(f.status==='PST'||f.status==='CANC'?
        'No match report scheduled':'Report available after a verified final result')+'</span>')+'</span>';
  if(completed) return '<button type="button" class="fw-match-list-item is-complete" data-report="'+
    esc(r.id)+'" aria-label="View match report: '+esc(h.name)+' '+esc(r.homeGoals)+
    ' to '+esc(r.awayGoals)+' '+esc(a.name)+'">'+content+'</button>';
  return '<div class="fw-match-list-item is-pending">'+content+'</div>';
}
function fwMatchDayGroups(fixtures) {
  if(!fixtures.length) return '';
  const groups=new Map();
  fixtures.forEach(f=>{
    const day=f.result?.date||istDate(f.kickoff);
    if(!groups.has(day)) groups.set(day,[]);
    groups.get(day).push(f);
  });
  return [...groups].map(([day, matches])=>
    '<section class="fw-match-day"><div class="fw-match-day-heading"><h3>'+esc(formatDate(day))+
    '</h3><span>'+matches.length+' '+(matches.length===1?'match':'matches')+'</span></div>'+
    '<div class="fw-match-day-list">'+matches.map(fwMatchFixtureRow).join('')+'</div></section>'
  ).join('');
}
function buildDetailedReportsPage() {
  const intro=header('Match reports.','Choose a completed fixture to open its statistics, player performances and tactical analysis.');
  const selected=state.report && resultsData.matches.find(m=>String(m.id)===String(state.report));
  if(selected) {
    return intro+
      '<div class="fw-report-backline"><button type="button" class="fw-report-back" data-report-back="true">'+
      '<span aria-hidden="true">←</span> All match reports</button>'+
      '<span class="fw-report-context">'+esc(selected.home+' vs '+selected.away)+'</span></div>'+
      fwMatchReport(selected)+
      '<div class="fw-report-end"><button type="button" class="fw-report-back" data-report-back="true">← Back to match reports</button></div>';
  }
  const matches=allFixtures().filter(f=>f.result &&
    (state.team==='all'||f.homeId===state.team||f.awayId===state.team))
    .sort((a,b)=>(b.result?.date||istDate(b.kickoff)).localeCompare(a.result?.date||istDate(a.kickoff))||
      b.kickoff.localeCompare(a.kickoff));
  const body=matches.length?
    '<div class="fw-match-browser-title"><h2>Completed matches</h2><span>'+matches.length+
    ' '+(matches.length===1?'report':'reports')+' · Latest first</span></div>'+
    fwMatchDayGroups(matches):
    '<div class="fw-match-empty"><strong>No verified completed matches in this selection yet.</strong>'+
    '<p>Reports appear automatically after each final score has been verified. '+
    'Select All clubs in the sidebar to view every completed match.</p></div>';
  return intro+body+
    '<p class="fw-report-footnote fw-match-browser-note">New match reports are checked hourly. Advanced statistics and tactical findings appear only when verified sources provide the relevant evidence.</p>';
}
