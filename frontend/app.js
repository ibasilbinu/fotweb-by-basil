'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pages=[['overview','Season overview','M3 18V7m6 11V3m6 15v-8m6 8H1'],['fixtures','Fixtures & results','M3 4h18v16H3zM3 9h18M7 2v4m10-4v4'],['standings','Points table','M3 6h18M3 12h18M3 18h18M8 3v18'],['clubs','Clubs this season','M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],['team','Team dashboard','M3 3h18v18H3zM3 9h18M9 9v12'],['analytics','Club analytics','M3 18h18M3 12h18M3 6h18M7 15l4-5 3 2 4-7'],['creator',"Creator's Corner",'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-2a8 8 0 0 1 16 0v2']];
const state={page:location.hash.slice(1)||'overview',team:'all',status:'all',month:'all',fixtureClub:'all',report:'',fixture:'',analyticsTeam:'',analyticsMetric:'points',analyticsCompareA:'',analyticsCompareB:''};
let seasonData=null,resultsData={schemaVersion:1,season:'2026-27',updatedAt:null,matches:[]},today='';
let updateLog={schemaVersion:1,season:'2026-27',checks:[]};
const statLabels={possession:'Possession (%)',shots:'Shots',shotsOnTarget:'Shots on target',corners:'Corners',fouls:'Fouls',xg:'Published xG'};
const canonical=s=>({'Churchill Brothers SC':'Churchill Brothers','Inter Kashi FC':'Inter Kashi','Mohun Bagan SG':'Mohun Bagan Super Giant'}[s]||s);
function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function sourceLink(url,label){const u=safeUrl(url);return u?`<a class="text-button" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'';}
const club=id=>seasonData.teams.find(t=>t.id===id);
const formatDate=value=>new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric'}).format(new Date(value.length===10?value+'T12:00:00+05:30':value));
const formatTime=value=>new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value));
const istDate=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
function crest(t,size=''){return t.logo?`<img class="crest ${size}" src="${esc(t.logo)}" alt="${esc(t.name)} crest">`:`<span class="club-initials ${size}">${esc(t.short)}</span>`;}
function resultFor(f){return resultsData.matches.find(m=>String(m.id)===f.id||(m.date===istDate(f.kickoff)&&canonical(m.home)===club(f.homeId).name&&canonical(m.away)===club(f.awayId).name));}
function allFixtures(){const fs=seasonData.fixtures.map(f=>({...f,result:resultFor(f)}));for(const m of resultsData.matches){if(fs.some(f=>f.result?.id===m.id))continue;const h=seasonData.teams.find(t=>t.name===canonical(m.home)),a=seasonData.teams.find(t=>t.name===canonical(m.away));if(h&&a)fs.push({id:String(m.id),homeId:h.id,awayId:a.id,kickoff:m.date+'T12:00:00+05:30',timeUnknown:true,venue:m.venue||null,status:'NS',phase:m.phase,label:'Completed match',sourceUrl:m.sources[0].url,result:m});}return fs.sort((a,b)=>a.kickoff.localeCompare(b.kickoff));}
function teamFixtures(id=state.team){return allFixtures().filter(f=>id==='all'||f.homeId===id||f.awayId===id);}
function tableRows(){const rows=seasonData.teams.map(t=>({...t,mp:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));for(const m of resultsData.matches.filter(m=>m.phase==='league'&&m.status==='FT')){const h=rows.find(t=>t.name===canonical(m.home)),a=rows.find(t=>t.name===canonical(m.away));if(!h||!a)continue;for(const [t,gf,ga] of [[h,m.homeGoals,m.awayGoals],[a,m.awayGoals,m.homeGoals]]){t.mp++;t.gf+=gf;t.ga+=ga;if(gf>ga){t.w++;t.pts+=3;}else if(gf===ga){t.d++;t.pts++;}else t.l++;}}return rows.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));}
function header(title,desc,eyebrow='INDIAN SUPER LEAGUE · 2026–27'){return `<div class="page-head"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${desc}</p></div><span class="season-tag">2026–27</span></div>`;}
function stat(label,value,sub,icon='↗'){return `<div class="stat"><span class="stat-label">${label}</span><span class="stat-icon">${icon}</span><strong class="stat-value">${esc(value)}</strong><span class="stat-sub">${sub}</span></div>`;}
function card(title,body,tag=''){return `<section class="card"><div class="card-head"><h3><span class="dot"></span>${title}</h3>${tag?`<span class="tag">${tag}</span>`:''}</div><div class="card-body">${body}</div></section>`;}
function empty(title,text){return card(esc(title),`<p class="report-note">${esc(text)}</p>`,'AWAITING DATA');}
function officialStreamUrl(b){if(!b||b.language!=='English'||b.channelUrl!=='https://www.youtube.com/@IndianSuperLeague')return '';const u=safeUrl(b.url);if(!u)return '';const p=new URL(u);return p.hostname==='www.youtube.com'&&/^\/live\/[A-Za-z0-9_-]{11}$/.test(p.pathname)&&!p.search&&!p.hash?u:'';}
function streamCandidateUrl(s){
  if(!s||s.source!=='viewer-submitted'||s.language!=='English'||s.languageEvidence!=='viewer-confirmed'||s.status!=='scheduled')return '';
  const u=safeUrl(s.url);
  if(!u)return '';
  const p=new URL(u);
  return p.hostname==='www.youtube.com'&&/^\/live\/[A-Za-z0-9_-]{11}$/.test(p.pathname)&&!p.search&&!p.hash?u:'';
}
function fixtureWatch(f){
  if(f.status==='PST'||f.status==='CANC')return '';
  const verified=officialStreamUrl(f.broadcast);
  const candidate=verified?'':streamCandidateUrl(f.streamCandidate);
  const u=verified||candidate;
  if(!u)return '';
  const ended=!!f.result||f.broadcast?.status==='ended';
  const label=verified?(ended?'Watch replay':'Watch live'):
    (ended?'Watch stream replay':'Watch live');
  const explanation=verified?
    'Official ISL YouTube · English'+(!ended&&f.broadcast.status==='scheduled'?' · Scheduled stream':''):
    'Official ISL YouTube · English · Scheduled stream';
  return `<div class="fixture-watch"><a class="watch-live" href="${esc(u)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}: ${esc(club(f.homeId).name)} vs ${esc(club(f.awayId).name)}${verified||candidate?' — English commentary':''}"><span aria-hidden="true">▶</span> ${esc(label)} <span aria-hidden="true">↗</span></a><span class="stream-note">${esc(explanation)}</span></div>`;
}
/* The entire fixture card opens match details, while source/watch/calendar
   links remain independently interactive and keep their existing behavior. */
function fixtureCard(f,compact=false) {
  const h=club(f.homeId),a=club(f.awayId),r=f.result;
  const status=r?r.status:f.needsConfirmation?'Confirm date':
    f.status==='PST'?'Postponed':f.status==='CANC'?'Cancelled':
    istDate(f.kickoff)<today?'Awaiting result':'Scheduled';
  const label=esc('Open match details: '+h.name+' versus '+a.name);
  return '<article class="fixture-card fw-fixture-clickable'+(compact?' compact':'')+
    '" data-fixture-open="'+esc(f.id)+'" role="group" tabindex="0" aria-label="'+label+'">'+
    '<div class="fixture-meta"><span>'+esc(formatDate(f.kickoff))+
    (!f.timeUnknown?' · '+esc(formatTime(f.kickoff))+' IST':'')+
    '</span><span class="fixture-status '+(r?'complete':'')+'">'+esc(status)+'</span></div>'+
    '<div class="fixture-teams"><span class="fixture-team">'+crest(h)+
    '<span>'+esc(h.name)+'</span></span><strong class="fixture-score">'+
    (r?esc(r.homeGoals)+'–'+esc(r.awayGoals):'VS')+
    '</strong><span class="fixture-team away"><span>'+esc(a.name)+'</span>'+
    crest(a)+'</span></div>'+
    '<div class="fixture-meta"><span>⌖ '+esc(r?.venue||f.venue||'Venue TBC')+
    '</span><span>'+esc(f.label||'ISL match')+'</span></div>'+
    (f.sourceNote?'<p class="chart-desc">'+esc(f.sourceNote)+'</p>':'')+
    (r?'<div class="fixture-actions"><button type="button" class="text-button fw-fixture-detail-button" data-fixture-detail="'+
    esc(f.id)+'">Open match report ↗</button></div>':'')+fixtureWatch(f)+'</article>';
}
function tableMarkup(limit){const rows=tableRows(),active=rows.some(t=>t.mp>0);return `<div class="table-wrap"><table><thead><tr><th>#</th><th>CLUB</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr></thead><tbody>${rows.slice(0,limit||rows.length).map((t,i)=>`<tr class="click-row ${state.team===t.id?'selected':''}" data-team="${esc(t.id)}"><td>${active?i+1:'—'}</td><td class="team-cell">${crest(t,'small')}${esc(t.name)}</td><td>${t.mp}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}</td><td>${t.ga}</td><td>${t.gf-t.ga}</td><td class="pts">${t.pts}</td></tr>`).join('')}</tbody></table></div>`;}
/* Overview-only selection: it does not modify the team dashboard,
   standings, fixture filters, or any other site's navigation state. */
/* League-wide facts from FotWeb's verified ISL 2026–27 records.
   Card sums use only matches where BOTH teams' totals were published. */
function overviewSeasonTotals(){
  const matches=(resultsData.matches||[]).filter(m=>
    ['FT','AET','PEN'].includes(m.status)&&['league','playoff'].includes(m.phase));
  const count=matches.length;
  const goals=matches.reduce((sum,m)=>sum+m.homeGoals+m.awayGoals,0);
  function cardTotal(key){
    let sum=0,covered=0;
    for(const m of matches){
      const h=m.stats?.home?.[key],a=m.stats?.away?.[key];
      if(!Number.isFinite(h)||!Number.isFinite(a)||h<0||a<0)continue;
      sum+=h+a;covered++;
    }
    return {value:covered?sum:'—',covered};
  }
  const yellow=cardTotal('yellowCards'),red=cardTotal('redCards');
  const coverage=records=>records===0?'Not yet verified':
    records===count?'Across '+records+' verified match'+(records===1?'':'es'):
    'Published totals from '+records+' of '+count+' verified matches';
  return stat('TOTAL GOALS THIS SEASON',count?goals:'—',
    count?'Across '+count+' verified match'+(count===1?'':'es'):'Awaiting verified results','⚽')+
    stat('TOTAL RED CARDS THIS SEASON',red.value,coverage(red.covered),'▣')+
    stat('TOTAL YELLOW CARDS THIS SEASON',yellow.value,coverage(yellow.covered),'▧');
}
function overview(){const next=teamFixtures('all').filter(f=>!f.result&&f.status==='NS'&&istDate(f.kickoff)>=today);return header('Indian football.<br>In focus.','Fixtures, clubs and the story of the season. Built on published ISL records.')+`<section class="hero"><div class="hero-copy"><span class="eyebrow">FOTWEB BY BASIL</span><h2>A new season.<br>Every match matters.</h2><p>Follow the published schedule, explore all ${seasonData.teams.length} clubs and return for verified analysis after the final whistle.</p><button class="primary-button" data-page="fixtures">Explore the fixtures &nbsp; ↗</button></div><div class="season-hero-art" aria-hidden="true"><span>ISL</span><strong>26<span>—</span>27</strong><small>THE SEASON WORKSPACE</small></div></section><div class="stats overview-stats">${stat('CLUBS THIS SEASON',seasonData.teams.length,'Official participating club list','♧')}${stat('SCHEDULE ENTRIES',seasonData.fixtures.length,esc(seasonData.scheduleScope),'▦')}${stat('FIXTURE WINDOW','10 OCT – 17 JAN','2026 → 2027 · Published Phase 1','↗')}${overviewSeasonTotals()}</div>${tdSeasonPlayersPanel()}<div class="grid equal"><section class="card"><div class="card-head"><h3><span class="dot"></span>Next on the touchline</h3><span class="tag">IST</span></div><div class="card-body fixture-list">${next.slice(0,3).map(f=>fixtureCard(f,true)).join('')||'<p class="report-note">No upcoming fixtures. Check the official schedule for the next published phase.</p>'}</div><div class="card-bottom"><button class="text-button" data-page="fixtures">View all fixtures ↗</button></div></section><section class="card"><div class="card-head"><h3><span class="dot"></span>The season so far</h3><span class="tag">${resultsData.matches.length?'VERIFIED RESULTS':'BEFORE KICKOFF'}</span></div>${tableMarkup(6)}<div class="card-bottom"><span>${resultsData.matches.length?'Computed from verified league results':'No completed results recorded yet'}</span><button class="text-button" data-page="standings">All ${seasonData.teams.length} clubs ↗</button></div></section></div>${card('From the final whistle to the full picture',`<p class="report-note">Final scores, match summaries and any published statistics will appear as they are verified. Unavailable player metrics, xG and shot maps are left unavailable.</p><div class="spaced"><button class="outline-button" data-page="fixtures">Explore match details ↗</button> ${sourceLink(seasonData.sourceUrl,'Official fixture source')}</div>`,'POST-MATCH ANALYSIS')}`;}
/* Opening a fixture does not destroy active month, status or club filters. */
function openFixtureDetail(id) {
  const f=allFixtures().find(item=>String(item.id)===String(id));
  if(!f)return;
  if(state.page!=='fixtures'||String(state.fixture)!==String(f.id))rememberNavigation();
  state.fixture=String(f.id);
  state.page='fixtures';
  history.replaceState(null,'','#fixtures');
  $('#sidebar').classList.remove('open');
  render();
  $('.main-wrap').scrollTo({top:0,behavior:'smooth'});
}
function backToFixtures() { returnToPreviousPage(); }
function fwUpcomingFixtureDetails(f) {
  const home=club(f.homeId),away=club(f.awayId);
  const status=f.status==='PST'?'POSTPONED':f.status==='CANC'?'CANCELLED':
    f.needsConfirmation?'DATE TO CONFIRM':istDate(f.kickoff)<today?
    'AWAITING VERIFIED RESULT':'UPCOMING MATCH';
  const when=esc(formatDate(f.kickoff))+
    (f.timeUnknown?' · Time not confirmed':' · '+esc(formatTime(f.kickoff))+' IST');
  const safeCentre=/^\d+$/.test(String(f.id))?
    'https://www.indiansuperleague.com/matchcentre/'+encodeURIComponent(String(f.id)):'';
  const official=f.sourceUrl||seasonData.sourceUrl;
  /* Only explicitly official, source-verified pre-match lineups are presented.
     An absent record never turns a squad list into a predicted starting XI. */
  const info=f.lineups||{};
  const fixtureXI={id:f.id,home:home.name,away:away.name,lineups:info,
    players:[],matchUrl:info.sourceUrl||safeCentre};
  const hasXI=['home','away'].some(side=>Array.isArray(info[side]?.starters)&&info[side].starters.length);
  const lineup=hasXI?fwLineup(fixtureXI):
    fwMissing('Confirmed starting XIs have not been published or verified for this fixture yet. Check back closer to kickoff.');
  return '<article class="fw-report fw-fixture-preview">'+
    '<header class="fw-match-hero"><span class="eyebrow">'+esc(status)+'</span>'+
    '<p>'+when+' · '+esc(f.venue||'Venue TBC')+'</p>'+
    '<div class="fw-match-score"><div>'+crest(home,'small')+'<strong>'+esc(home.name)+
    '</strong></div><span><small>VS</small></span><div>'+crest(away,'small')+
    '<strong>'+esc(away.name)+'</strong></div></div></header>'+
    '<div class="fw-fixture-preview-body">'+
    '<h2>Pre-match information</h2>'+
    '<p class="fw-report-summary">Official match details and confirmed starting lineups are shown when published. '+
    'A full match report becomes available after a verified final result.</p>'+
    '<div class="fw-fixture-preview-meta"><div><small>Kickoff</small><strong>'+when+'</strong></div>'+
    '<div><small>Venue</small><strong>'+esc(f.venue||'Venue TBC')+'</strong></div>'+
    '<div><small>Match status</small><strong>'+esc(status)+'</strong></div></div>'+
    '<h3 class="fw-fixture-preview-lineup-heading">Starting XI</h3>'+lineup+
    '<div class="fw-fixture-preview-links">'+
    sourceLink(official,'Official fixture source')+
    (safeCentre?sourceLink(info.sourceUrl||safeCentre,'Official ISL match centre'):'')+'</div>'+
    fixtureWatch(f)+
    '</div></article>';
}
function fwFixtureDetails(f) {
  const content=f.result?fwMatchReport(f.result):fwUpcomingFixtureDetails(f);
  return header('Match details.','Official ISL match information, verified lineups and post-match analysis.')+
    content;
}
function fixturesPage(){const selected=state.fixture && allFixtures().find(f=>String(f.id)===String(state.fixture));if(selected)return fwFixtureDetails(selected);const months=[...new Set(allFixtures().map(f=>istDate(f.kickoff).slice(0,7)))];const list=teamFixtures(state.fixtureClub).filter(f=>(state.status==='all'||(state.status==='completed'?!!f.result:!f.result))&&(state.month==='all'||istDate(f.kickoff).startsWith(state.month)));return header('The fixture book.','Published Phase 1 schedule. All kickoff times are in Indian Standard Time.')+`<div class="controls fixture-controls"><label>Match status<select id="statusFilter"><option value="all">All matches</option><option value="upcoming" ${state.status==='upcoming'?'selected':''}>Uncompleted matches</option><option value="completed" ${state.status==='completed'?'selected':''}>Completed results</option></select></label><label>Month<select id="monthFilter"><option value="all">All published months</option>${months.map(m=>`<option value="${m}" ${state.month===m?'selected':''}>${new Date(m+'-01T12:00:00').toLocaleString('en-IN',{month:'long',year:'numeric'})}</option>`).join('')}</select></label><label for="fixtureClubFilter">Club<select id="fixtureClubFilter"><option value="all" ${state.fixtureClub==='all'?'selected':''}>All ${seasonData.teams.length} clubs</option>${seasonData.teams.map(t=>`<option value="${esc(t.id)}" ${state.fixtureClub===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label></div><p class="chart-desc filter-count">${list.length} matches${state.fixtureClub!=='all'?' · '+esc(club(state.fixtureClub).name):''}. Venues marked TBC are not published in the imported schedule.</p><div class="fixtures-grid">${list.map(f=>fixtureCard(f)).join('')||'<div class="source-note">No matches match these filters.</div>'}</div><p class="chart-desc">Only published schedule entries are included. Dates and venues may change. Entries with conflicting dates are flagged for confirmation. ${sourceLink(seasonData.sourceUrl,'Check the official schedule')}</p>`;}
function standingsPage(){return header('The points picture.','All participating clubs. Totals are calculated from verified league-stage results.')+card('Points table',tableMarkup(),'2026–27')+`<p class="chart-desc">${resultsData.matches.length?'Three points per win, one per draw. Display ties use goal difference, goals scored and name; official tie-breakers or rulings can change the order.':'The season has no verified completed matches here yet. All totals are zero; clubs are listed alphabetically without a league rank.'} ${sourceLink(seasonData.standingsSourceUrl,'Official standings')}</p>`;}
function clubsPage(){return header('Thirteen clubs.<br>One season.','The participating clubs listed on the official ISL 2026–27 schedule.')+`<div class="clubs-grid">${seasonData.teams.map(t=>{const fs=teamFixtures(t.id),next=fs.find(f=>!f.result&&istDate(f.kickoff)>=today);return `<article class="card club-card"><div class="card-body">${crest(t,'large')}<span class="eyebrow">${esc(t.short)}</span><h2>${esc(t.name)}</h2><p>${fs.length} published fixtures · ${fs.filter(f=>f.result).length} verified results</p>${next?`<div class="club-next"><span>Next fixture</span><strong>${esc(formatDate(next.kickoff))} · ${esc(formatTime(next.kickoff))} IST</strong><small>vs ${esc(club(next.homeId===t.id?next.awayId:next.homeId).name)}</small></div>`:''}<div class="spaced"><button class="primary-button" data-team="${esc(t.id)}">Explore club ↗</button></div>${sourceLink(t.profileUrl,'Official club profile')}</div></article>`}).join('')}</div>`;}
function teamDashboardSelectors(){
  const seasonLabel=String(seasonData.season||'2026-27').replace('-', '–');
  return '<section class="td-dashboard-filters" aria-label="Team Dashboard selections">'+
    '<div class="td-dashboard-filter-grid">'+
    '<label for="tdCompetitionFilter">Competition'+
    '<select id="tdCompetitionFilter" aria-label="Competition" title="Only Indian Super League is available">'+
    '<option value="isl" selected>Indian Super League</option></select></label>'+
    '<label for="tdSeasonFilter">Season'+
    '<select id="tdSeasonFilter" aria-label="Season" title="Only the published '+esc(seasonLabel)+' season is available">'+
    '<option value="'+esc(seasonData.season)+'" selected>'+esc(seasonLabel)+'</option></select></label>'+
    '<label for="tdClubFilter">Club'+
    '<select id="tdClubFilter" aria-label="Choose a club">'+
    '<option value="all" '+(state.team==='all'?'selected':'')+'>Select a club</option>'+
    seasonData.teams.map(t=>'<option value="'+esc(t.id)+'" '+
      (state.team===t.id?'selected':'')+'>'+esc(t.name)+'</option>').join('')+
    '</select></label></div>'+
    '<p class="td-dashboard-filter-note">Available competition: Indian Super League · '+esc(seasonLabel)+
    '. Select any of the '+seasonData.teams.length+' clubs to explore its verified data.</p>'+
    '</section>';
}
function teamPage(){
  if(state.team==='all')return header('Team dashboard.','Choose a club to explore its ISL 2026–27 performance.')+
    teamDashboardSelectors()+
    '<div class="td-dashboard-empty"><strong>Choose a club to get started.</strong>'+
    '<p>Use the Club dropdown above to view its points, leading players, published statistics and fixtures.</p></div>';
const t=club(state.team),r=tableRows().find(x=>x.id===t.id),fs=teamFixtures(t.id),ss=resultsData.matches.filter(m=>canonical(m.home)===t.name||canonical(m.away)===t.name),league=tdLeagueResults(t.name);let totals={};for(const [key,label] of Object.entries(statLabels)){const values=ss.map(m=>m.stats?.[canonical(m.home)===t.name?'home':'away']?.[key]).filter(v=>v!=null);if(values.length)totals[label]=key==='possession'?(values.reduce((a,b)=>a+b,0)/values.length).toFixed(1)+'% average':values.reduce((a,b)=>a+b,0);}
return header(esc(t.name),'The club’s published schedule and verified season results.',esc(t.short)+' · TEAM DASHBOARD')+teamDashboardSelectors()+`<div class="ca-team-entry"><button type="button" class="outline-button" data-analytics-club="${esc(t.id)}">Analyse & compare this club ↗</button></div><div class="stats">${stat('LEAGUE MATCHES',r.mp,'Verified completed league matches','▦')}${stat('POINTS',r.pts,`${r.w} wins · ${r.d} draws · ${r.l} losses`,'♜')}${stat('GOALS FOR',r.gf,'From verified league scores','↗')}${stat('GOALS AGAINST',r.ga,'From verified league scores','↘')}</div>${tdVenuePanel(league,t.name)}${tdPlayersPanel(league,t.name)}<div class="grid equal">${card('Published team statistics',Object.keys(totals).length?`<div class="bar-chart">${Object.entries(totals).map(([k,v])=>`<div class="verified-stat"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div><p class="chart-desc">Totals include only matches with a published value. Possession is the average of available match values.</p>`:'<p class="report-note">Team-performance statistics will appear after they are published and verified. No shot, passing or xG data is available here yet.</p>','AVAILABLE DATA')}${card('Club information',`<div class="club-profile">${crest(t,'large')}<div><h2>${esc(t.name)}</h2><p class="chart-desc">${fs.length} published Phase 1 fixtures.</p>${sourceLink(t.profileUrl,'Official club profile')}</div></div><p class="chart-desc">Player summaries are calculated from verified match events and available player statistics, with missing information clearly identified.</p>`,'2026–27')}</div><h2 class="section-title">Club fixtures & results</h2><div class="fixtures-grid">${fs.map(f=>fixtureCard(f)).join('')}</div>`;}
function creatorPage(){return `<div class="page-head creator-page-head"><div><span class="eyebrow">CREATOR'S CORNER</span><h1>Behind the data.<br>Beyond the score.</h1><p>Meet the football fan behind FotWeb.</p></div><span class="season-tag">BY BASIL</span></div><div class="creator-layout"><article class="creator-story"><div class="creator-person"><div class="creator-monogram" aria-hidden="true">BB</div><div><span class="eyebrow">HELLO, I'M</span><h2>Basil Binu</h2><p>Aspiring Data Analyst</p></div></div><div class="creator-interests"><span>DATA ANALYSIS</span><span>FOOTBALL</span><span>ALWAYS LEARNING</span></div><p>I'm Basil Binu, an aspiring data analyst with a passion for making sense of numbers and a serious love for football. I enjoy looking beyond the final score and asking what the data can tell us about a match.</p><p>FotWeb brings these two interests together. I'm building a place where fans can follow Indian football, explore a club's season and understand matches through clear, sourced information.</p><p>My journey in analytics is still growing. This project is a way to keep learning, turn curiosity into practical work and share what I discover with other football fans.</p><blockquote>Football fuels the curiosity.<br>Data gives it direction.</blockquote></article><div class="creator-side"><section class="creator-online"><h2><span aria-hidden="true">↗</span> Find me online</h2><p>Connect with me on LinkedIn or GitHub, or send me an email.</p><div class="creator-links about-links">${$('#creatorLinks').innerHTML}</div></section><section class="creator-features"><h2><span aria-hidden="true">▦</span> What FotWeb does</h2><div class="creator-feature-list">${[['overview','Season overview','The published ISL season at a glance.'],['fixtures','Fixtures & results','Click fixtures for upcoming lineups, verified reports, match dates and streams.'],['standings','Points table','League points calculated from verified final scores.'],['team','Team dashboard','Explore a club’s fixtures, results and available statistics.'],['analytics','Club analytics','Team trends, attack and defence rankings, comparisons, and charts.']].map(([page,title,desc],i)=>`<a href="#${page}" data-page="${page}"><span class="feature-number">0${i+1}</span><div><strong>${title}</strong><p>${desc}</p></div><span aria-hidden="true">↗</span></a>`).join('')}</div><p class="creator-principle">Built with curiosity. Backed by sources.</p></section></div></div>`;}
/* A check run is not the same as a change to official football data. */
function latestUpdateLabel(){
  const checks=Array.isArray(updateLog?.checks)?updateLog.checks:[];
  const last=checks[0];
  if(!last||!last.checkedAt||Number.isNaN(Date.parse(last.checkedAt))){
    return 'Last updated: Automated check time not yet available';
  }
  return 'Last updated: '+formatDate(last.checkedAt)+', '+formatTime(last.checkedAt).replace(/\b(am|pm)\b/i,m=>m.toUpperCase())+' IST';
}
function render(){if(!seasonData)return;if(state.page==='reports')state.page='fixtures';if(!pages.some(p=>p[0]===state.page))state.page='overview';if(state.team!=='all'&&!club(state.team))state.team='all';if(state.fixtureClub!=='all'&&!club(state.fixtureClub))state.fixtureClub='all';$('#navigation').innerHTML=pages.filter(p=>p[0]!=='creator').map(([id,label,path],i)=>`<a href="#${id}" data-page="${id}" class="${state.page===id?'active':''}" ${state.page===id?'aria-current="page"':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="${path}"/></svg>${label}<span class="nav-index">0${i+1}</span></a>`).join('');$('#crumb').textContent=pages.find(p=>p[0]===state.page)[1];const backButton=$('#pageBack');backButton.disabled=state.page==='overview'&&!state.fixture;backButton.title=backButton.disabled?'No earlier page':'Return to previous page';const homeButton=$('#pageHome');homeButton.disabled=state.page==='overview'&&!state.fixture;homeButton.title=homeButton.disabled?'You are on Season Overview':'Go to Season Overview';const fn={overview,fixtures:fixturesPage,standings:standingsPage,clubs:clubsPage,team:teamPage,analytics:analyticsPage,creator:creatorPage}[state.page];$('#creatorCorner').classList.toggle('active',state.page==='creator');$('#main').innerHTML=(state.page==='creator'?'':`<div class="source-note">${esc(seasonData.scheduleScope)} · Fixtures verified ${esc(formatDate(seasonData.verifiedAt))}. ${sourceLink(seasonData.sourceUrl,'Official ISL source')}</div>`)+fn();$('#dataDescription').textContent=latestUpdateLabel();bindPage();document.title='FotWeb by Basil · '+pages.find(p=>p[0]===state.page)[1];}
/* Keep a lightweight navigation trail so Back returns to the exact prior
   view, including fixture filters and an open match report. */
const navigationHistory=[];
function rememberNavigation(){
  const snapshot={...state};
  const previous=navigationHistory[navigationHistory.length-1];
  if(!previous||JSON.stringify(previous)!==JSON.stringify(snapshot)){
    navigationHistory.push(snapshot);
    if(navigationHistory.length>60)navigationHistory.shift();
  }
}
function returnToPreviousPage(){
  const previous=navigationHistory.pop();
  if(previous){
    Object.assign(state,previous);
  }else if(state.fixture){
    state.fixture='';
    state.page='fixtures';
  }else if(state.page!=='overview'){
    state.page='overview';
  }else return;
  history.replaceState(null,'','#'+state.page);
  $('#sidebar').classList.remove('open');
  render();
  $('.main-wrap').scrollTo({top:0,behavior:'smooth'});
}
function navigate(page,changes={}){
  const different=state.page!==page||Boolean(state.fixture)||
    Object.keys(changes).some(key=>state[key]!==changes[key]);
  if(different)rememberNavigation();
  Object.assign(state,changes);
  state.fixture='';
  state.page=page;
  history.replaceState(null,'','#'+page);
  $('#sidebar').classList.remove('open');
  render();
  $('.main-wrap').scrollTo({top:0,behavior:'smooth'});
}
/* The possession-vs-shots scatter displays a readable club tooltip.
   Hover, touch/click and keyboard focus all work; labels use textContent. */
function bindScatterTooltips(){
  $$('.ca-scatter-plot').forEach(plot=>{
    const tooltip=plot.querySelector('.ca-scatter-tooltip');
    if(!tooltip)return;
    const club=tooltip.querySelector('[data-ca-tooltip-club]');
    const shots=tooltip.querySelector('[data-ca-tooltip-shots]');
    const possession=tooltip.querySelector('[data-ca-tooltip-possession]');
    const sample=tooltip.querySelector('[data-ca-tooltip-sample]');
    const show=dot=>{
      const n=Number(dot.dataset.matches)||0;
      club.textContent=dot.dataset.club||'Unknown club';
      shots.textContent='Shots per match: '+(dot.dataset.shots||'Unavailable');
      possession.textContent='Average possession: '+(dot.dataset.possession||'Unavailable')+'%';
      sample.textContent='Based on '+n+' verified '+(n===1?'match':'matches');
      tooltip.hidden=false;
      const box=plot.getBoundingClientRect();
      const point=dot.getBoundingClientRect();
      const center=point.left+point.width/2-box.left;
      const width=Math.min(246,Math.max(0,box.width-16));
      const min=width/2+8,max=box.width-min;
      const x=max>=min?Math.min(max,Math.max(min,center)):box.width/2;
      const above=point.top-box.top-14;
      const below=above<100;
      tooltip.classList.toggle('below',below);
      tooltip.style.left=x+'px';
      tooltip.style.top=(below?point.bottom-box.top+12:above)+'px';
    };
    const hide=()=>{tooltip.hidden=true;};
    plot.querySelectorAll('[data-ca-scatter-point]').forEach(dot=>{
      dot.onpointerenter=()=>show(dot);
      dot.onpointerleave=()=>{if(document.activeElement!==dot)hide();};
      dot.onfocus=()=>show(dot);
      dot.onblur=hide;
      dot.onclick=e=>{e.stopPropagation();show(dot);};
      dot.onkeydown=e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();show(dot);}
        if(e.key==='Escape')hide();
      };
    });
    plot.onclick=e=>{
      if(!e.target.closest('[data-ca-scatter-point]'))hide();
    };
  });
}
/* Identify each club and verified fixture behind a trend chart dot.
   One tooltip handles mouse hover, keyboard focus and phone taps. */
function bindTrendTooltips(){
  $$('.ca-trend-plot').forEach(plot=>{
    const tooltip=plot.querySelector('.ca-trend-tooltip');
    if(!tooltip)return;
    const club=tooltip.querySelector('[data-ca-trend-club]');
    const metric=tooltip.querySelector('[data-ca-trend-metric]');
    const fixture=tooltip.querySelector('[data-ca-trend-fixture]');
    const date=tooltip.querySelector('[data-ca-trend-date]');
    const overlap=tooltip.querySelector('[data-ca-trend-overlap]');
    const show=dot=>{
      club.textContent=dot.dataset.club||'Unknown club';
      metric.textContent=(dot.dataset.metric||'Statistic')+': '+
        (dot.dataset.value||'Unavailable');
      fixture.textContent='Match '+(dot.dataset.game||'?')+' · vs '+
        (dot.dataset.opponent||'Unknown opponent');
      date.textContent=(dot.dataset.date||'Date unavailable')+
        (dot.dataset.score?' · Final score '+dot.dataset.score:'');
      const also=dot.dataset.also||'';
      overlap.textContent=also?'Also at this point: '+also:'';
      overlap.hidden=!also;
      tooltip.hidden=false;
      const area=plot.getBoundingClientRect();
      const point=dot.getBoundingClientRect();
      const center=point.left+point.width/2-area.left;
      const width=Math.min(260,Math.max(0,area.width-16));
      const min=width/2+8,max=area.width-min;
      tooltip.style.left=(max>=min?Math.min(max,Math.max(min,center)):area.width/2)+'px';
      const above=point.top-area.top-14;
      const below=above<122;
      tooltip.classList.toggle('below',below);
      tooltip.style.top=(below?point.bottom-area.top+12:above)+'px';
    };
    const hide=()=>{tooltip.hidden=true;};
    plot.querySelectorAll('[data-ca-trend-point]').forEach(dot=>{
      dot.onpointerenter=()=>show(dot);
      dot.onpointerleave=()=>{if(document.activeElement!==dot)hide();};
      dot.onfocus=()=>show(dot);
      dot.onblur=hide;
      dot.onclick=e=>{e.stopPropagation();show(dot);};
      dot.onkeydown=e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();show(dot);}
        if(e.key==='Escape'){e.preventDefault();hide();}
      };
    });
    plot.onclick=e=>{
      if(!e.target.closest('[data-ca-trend-point]'))hide();
    };
  });
}
function bindPage(){
  bindScatterTooltips();
  bindTrendTooltips();
  const teamClubFilter=$('#tdClubFilter');
  if(teamClubFilter)teamClubFilter.onchange=e=>navigate('team',{team:e.target.value});
  $$('[data-analytics-club]').forEach(el=>el.onclick=()=>{
    navigate('analytics',{analyticsTeam:el.dataset.analyticsClub,
      analyticsCompareA:el.dataset.analyticsClub,analyticsCompareB:''});
  });
  const analyticInputs=[
    ['#caTrendMetric','analyticsMetric'],
    ['#caCompareA','analyticsCompareA'],['#caCompareB','analyticsCompareB']
  ];
  analyticInputs.forEach(([selector,field])=>{
    const input=$(selector);
    if(input)input.onchange=e=>{state[field]=e.target.value;render();};
  });$$('[data-page]').forEach(el=>el.onclick=e=>{e.preventDefault();navigate(el.dataset.page);});$$('[data-team]').forEach(el=>el.onclick=()=>navigate('team',{team:el.dataset.team}));
  $$('[data-fixture-open]').forEach(el=>{
    el.onclick=e=>{
      if(e.target.closest('button,a,select,input,[data-team]'))return;
      openFixtureDetail(el.dataset.fixtureOpen);
    };
    el.onkeydown=e=>{
      if(e.target!==el||!['Enter',' '].includes(e.key))return;
      e.preventDefault();
      openFixtureDetail(el.dataset.fixtureOpen);
    };
  });
  $$('[data-fixture-detail]').forEach(el=>el.onclick=()=>openFixtureDetail(el.dataset.fixtureDetail));
$$('[data-report]').forEach(el=>el.onclick=()=>openFixtureDetail(el.dataset.report));$$('[data-report-section]').forEach(el=>el.onclick=()=>document.getElementById(el.dataset.reportSection)?.scrollIntoView({behavior:'smooth',block:'start'}));$$('[data-lineup-side]').forEach(el=>el.onclick=()=>{
  if(el.disabled)return;
  const side=el.dataset.lineupSide;
  $$('[data-lineup-side]').forEach(button=>{
    const active=button.dataset.lineupSide===side;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
  $$('[data-lineup-panel]').forEach(panel=>{
    panel.hidden=panel.dataset.lineupPanel!==side;
  });
});if($('#statusFilter'))$('#statusFilter').onchange=e=>{state.status=e.target.value;render();};if($('#monthFilter'))$('#monthFilter').onchange=e=>{state.month=e.target.value;render();};if($('#fixtureClubFilter'))$('#fixtureClubFilter').onchange=e=>{state.fixtureClub=e.target.value;render();};}
window.receiveSeasonData=args=>{if(!args?.season_data)return;seasonData=args.season_data;resultsData=args.post_match_data||{matches:[],updatedAt:null};updateLog=args.update_log||{schemaVersion:1,season:'2026-27',checks:[]};today=args.today||istDate(new Date().toISOString());render();};
$('#pageBack').onclick=returnToPreviousPage;$('#pageHome').onclick=()=>navigate('overview');$('#menu').onclick=()=>$('#sidebar').classList.toggle('open');$('#sidebarBackdrop').onclick=()=>$('#sidebar').classList.remove('open');$('#methodology').onclick=()=>$('#dataDialog').showModal();$('#closeDialog').onclick=()=>$('#dataDialog').close();document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#sidebar').classList.remove('open');});window.addEventListener('hashchange',()=>{const requested=location.hash.slice(1)||'overview';if(state.page!==requested||state.fixture)rememberNavigation();state.fixture='';state.page=requested;render();});
