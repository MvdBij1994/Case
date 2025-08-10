import React, { useMemo, useState } from 'react'

function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=(h<<13)|(h>>>19);}return function(){h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);h^=h>>>16;return h>>>0;};}
function mulberry32(a){return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function seededRand(seedStr){const seed=xmur3(seedStr)();return mulberry32(seed)}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v))
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)]
function multipleOf(r,base,min,max){const s=Math.ceil(min/base),e=Math.floor(max/base);const k=s+Math.floor(r()*(e-s+1));return k*base}
const steps=(...a)=>a

function genMultiplyEasy(rand){
  const a=10+Math.floor(rand()*80);
  const b=2+Math.floor(rand()*8);
  const ans=a*b
  const contexts=[
    (a,b)=>`MARKET SIZING — Een koffieketen overweegt een nieuwe stad. Er zijn ${b} wijken, en in elke wijk schatten we ${a} potentiële klanten per dag. Hoeveel klanten in totaal?`,
    (a,b)=>`MARKET SIZING — Een luchtvaartmaatschappij opent ${b} nieuwe routes, elk met gemiddeld ${a} vluchten per maand. Hoeveel vluchten in totaal?`,
    (a,b)=>`MARKET SIZING — Een streamingdienst plant ${b} promotieweken, elk met ${a} nieuwe inschrijvingen per dag. Hoeveel inschrijvingen totaal per week?`
  ]
  return {id:`mul-easy-${a}-${b}`,topic:'Case: market sizing',prompt:pick(rand,contexts)(a,b),hint:'Splits in tientallen en eenheden.',input:'integer',tol:0,answerText:String(ans),answerValue:ans,explain:steps('Splits in tientallen en eenheden.','Bereken tientallen × '+b+'.','Bereken eenheden × '+b+'.','Tel op tot '+ans+'.')}
}

function genDivisionExact(rand){
  const b=2+Math.floor(rand()*8)
  const q=3+Math.floor(rand()*13)
  const a=b*q
  const contexts=[
    (a,b)=>`OPERATIONS — Een logistieke speler heeft ${a} vrachtwagens en wil ze gelijk verdelen over ${b} hubs. Hoeveel per hub?`,
    (a,b)=>`OPERATIONS — Een projectteam plant ${a} interviews, gelijk verdeeld over ${b} consultants. Hoeveel per consultant?`,
    (a,b)=>`OPERATIONS — Een producent verdeelt ${a} pallets gelijk over ${b} DC’s. Hoeveel pallets per DC?`
  ]
  return {id:`div-exact-${a}-${b}`,topic:'Case: operations capacity',prompt:pick(rand,contexts)(a,b),hint:'a = b × ?',input:'integer',tol:0,answerText:String(q),answerValue:q,explain:steps(`${a} = ${b} × ${q}`,`Dus ${a} ÷ ${b} = ${q}`)}
}

const PCT_OPTIONS=[{pct:50,base:2},{pct:25,base:4},{pct:75,base:4},{pct:20,base:5},{pct:10,base:10},{pct:5,base:20},{pct:12.5,base:8}]
function genPercentOfFriendly(rand){
  const opt=pick(rand,PCT_OPTIONS)
  const base=multipleOf(rand,opt.base,80,800)
  const ans=(opt.pct/100)*base
  const contexts=[
    (pct,base)=>`MARKET SHARE — Totale markt: ${base}k gebruikers. Wat is het aantal klanten bij ${pct}% marktaandeel?`,
    (pct,base)=>`PENETRATION — Een telco heeft ${base}k aansluitingen. Hoeveel actief bij ${pct}% activatie?`,
    (pct,base)=>`CATEGORY MIX — Weekomzet €${base}m. Hoeveel omzet in premiumcategorie bij ${pct}% aandeel?`
  ]
  return {id:`pct-of-${opt.pct}-${base}`,topic:'Case: market share',prompt:pick(rand,contexts)(opt.pct,base),hint:`Bereken ${opt.pct}% van ${base}.`,input:'integer',tol:0,answerText:String(ans),answerValue:ans,explain:steps(`Bereken ${opt.pct}% van ${base} = ${ans}`)}
}

const MARK_OPTIONS=[{sign:+1,pct:10,base:10},{sign:-1,pct:10,base:10},{sign:+1,pct:20,base:5},{sign:-1,pct:20,base:5},{sign:+1,pct:25,base:4},{sign:-1,pct:25,base:4},{sign:+1,pct:50,base:2},{sign:-1,pct:50,base:2}]
function genMarkupMarkdownFriendly(rand){
  const o=pick(rand,MARK_OPTIONS)
  const base=multipleOf(rand,o.base,80,800)
  const delta=(o.pct/100)*base
  const newVal=o.sign>0?base+delta:base-delta
  const signLabel=o.sign>0?'stijgt':'daalt'
  const contexts=[
    (l,p,b)=>`PRICING — Een fabrikant overweegt een prijs die ${l} met ${p}% vanaf €${b}. Wat wordt de nieuwe prijs per eenheid?`,
    (l,p,b)=>`PRICING — Een SaaS‑aanbieder wijzigt zijn tarief dat ${l} met ${p}% vanaf €${b}. Wat is het nieuwe maandbedrag?`,
    (l,p,b)=>`PRICING — Een exporteur past de FOB‑prijs aan die ${l} met ${p}% vanaf €${b}. Wat wordt de nieuwe prijs?`
  ]
  return {id:`mark-${o.sign}-${o.pct}-${base}`,topic:'Case: pricing impact',prompt:pick(rand,contexts)(signLabel,o.pct,base),hint:`${o.pct}% van ${base} is ${delta}.`,input:'integer',tol:0,answerText:String(newVal),answerValue:newVal,explain:steps(`Bereken ${o.pct}% van ${base} = ${delta}`,`Pas toe op basisprijs: ${newVal}`)}
}

const TEMPLATES=[genMultiplyEasy,genDivisionExact,genPercentOfFriendly,genMarkupMarkdownFriendly]
function shuffle(r,arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function ExerciseCard({ ex, onSolved }){
  const [value,setValue]=useState('')
  const [status,setStatus]=useState(null)
  const [showHint,setShowHint]=useState(false)
  const [showSol,setShowSol]=useState(false)
  function check(){
    if(!value.trim())return
    let v=value.replace('%','').replace(',','.')
    const num=Number(v)
    if(!Number.isFinite(num)){ setStatus('wrong'); return }
    const diff=Math.abs(num-ex.answerValue)
    const ok=diff<=ex.tol+1e-9
    setStatus(ok?'correct':'wrong')
    if(ok) onSolved()
  }
  const cls=status==='correct'?'input ok':status==='wrong'?'input err':'input'
  return (
    <div className="card">
      <div className="topic">{ex.topic}</div>
      <div className="prompt">{ex.prompt}</div>
      <input
        className={cls}
        value={value}
        onChange={e=>setValue(e.target.value)}
        placeholder={ex.input==='percent'?'Antwoord in %':'Antwoord'}
        inputMode="numeric" pattern="[0-9]*" autoComplete="off" autoCorrect="off" autoCapitalize="off"
        enterKeyHint="done"
      />
      <div className="controls" style={{marginTop:8, marginBottom:8}}>
        <button className="btn primary" type="button" onClick={check}>Check</button>
        <button className="btn" type="button" onClick={()=>setShowHint(s=>!s)}>Hint</button>
        <button className="btn" type="button" onClick={()=>setShowSol(s=>!s)}>Oplossing</button>
        {status==='correct' && <span style={{color:'#166534'}}>✓ Klopt</span>}
        {status==='wrong' && <span style={{color:'#b91c1c'}}>Niet goed</span>}
      </div>
      {showHint && <div className="hint">{ex.hint}</div>}
      {showSol && (
        <ol className="explain">
          {ex.explain.map((s,i)=>(<li key={i}>{s}</li>))}
        </ol>
      )}
    </div>
  )
}

function buildSet(seedStr,count=5){
  const rand=seededRand(seedStr)
  const chosen=[]
  const order=shuffle(rand,TEMPLATES)
  let i=0
  while(chosen.length<count){
    const t=order[i%order.length]
    chosen.push(t(rand))
    i++
  }
  return chosen
}

export default function App(){
  const todayKey=new Date().toISOString().slice(0,10)
  const dailyExercises=useMemo(()=>buildSet(`daily-${todayKey}`,5),[todayKey])
  const [solved,setSolved]=useState(0)
  return (
    <div className="container">
      <div className="title">Dagelijkse Case Math Oefeningen</div>
      {dailyExercises.map(ex=>(
        <ExerciseCard key={ex.id} ex={ex} onSolved={()=>setSolved(s=>clamp(s+1,0,dailyExercises.length))} />
      ))}
      <div className="progress">Voortgang: {solved}/{dailyExercises.length}</div>
    </div>
  )
}
