/* All bundled records are synthetic demonstration data, not official results. */
function makeSampleData(){
 const clubs=[['Kerala Blasters FC','KB','#d8b535'],['Bengaluru FC','BFC','#426ede'],['Mohun Bagan SG','MBSG','#7c3445'],['Mumbai City FC','MCFC','#548b9e'],['FC Goa','FCG','#d76f32'],['East Bengal FC','EBFC','#bc4b47'],['Odisha FC','OFC','#8956a4'],['Chennaiyin FC','CFC','#44509b']];
 const teams=clubs.map((c,i)=>({id:'t'+i,name:c[0],short:c[1],color:c[2]}));
 let seed=1107; const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
 const first=['Arjun','Aditya','Rohan','Nikhil','Aman','Dev','Kiran','Rahul','Ishan','Vivek','Neel'];const last=['Menon','Sharma','Das','Kumar','Singh','Nair','Roy','Rao'];
 const players=teams.flatMap((t,i)=>first.map((n,j)=>({id:t.id+'p'+j,teamId:t.id,name:n+' '+last[(i+j)%last.length],position:j===0?'GK':j<5?'DEF':j<8?'MID':'FWD',minutes:0,goals:0,assists:0,shots:0,keyPasses:0,passes:0,tackles:0,interceptions:0})));
 const matches=[];
 for(let season=0;season<2;season++)for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){
   const home=teams[(i+season)%8],away=teams[(j+season)%8];const shots=[];
   for(const t of [home,away]){const n=8+Math.floor(random()*12);for(let s=0;s<n;s++){const x=72+random()*30,y=10+random()*48,xg=+(0.035+random()*.27).toFixed(2);shots.push({teamId:t.id,playerId:t.id+'p'+(8+Math.floor(random()*3)),minute:1+Math.floor(random()*90),x:+x.toFixed(1),y:+y.toFixed(1),xg,outcome:random()<xg?'Goal':random()<.45?'Saved':'Off target'});}}
   const homeGoals=shots.filter(s=>s.teamId===home.id&&s.outcome==='Goal').length,awayGoals=shots.filter(s=>s.teamId===away.id&&s.outcome==='Goal').length;
   const match={id:'s'+season+'m'+i+'-'+j,season:season===0?'Demo season A':'Demo season B',homeId:home.id,awayId:away.id,homeGoals,awayGoals,date:'2025-'+String(1+Math.floor(matches.length%28/7)).padStart(2,'0')+'-'+String(1+matches.length%27).padStart(2,'0'),shots};matches.push(match);
 }
 // Player totals represent sample season A. Rebuild season B independently.
 const playerSeasons={};for(const season of ['Demo season A','Demo season B']){playerSeasons[season]=players.map(p=>({...p}));for(const p of playerSeasons[season]){p.minutes=420+Math.floor(random()*210);p.keyPasses=p.position==='GK'?0:3+Math.floor(random()*22);p.passes=100+Math.floor(random()*390);p.tackles=p.position==='GK'?0:3+Math.floor(random()*25);p.interceptions=p.position==='GK'?0:2+Math.floor(random()*15)}for(const m of matches.filter(m=>m.season===season))for(const s of m.shots){const p=playerSeasons[season].find(p=>p.id===s.playerId);p.shots++;if(s.outcome==='Goal'){p.goals++;const assistId=s.teamId+'p'+(5+Math.floor(random()*3));const a=playerSeasons[season].find(p=>p.id===assistId);a.assists++;}}}
 return {schemaVersion:1,label:'Synthetic ISL sandbox',sample:true,teams,matches,playerSeasons};
}
const SAMPLE_DATA=makeSampleData();
