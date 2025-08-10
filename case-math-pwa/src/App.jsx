import React, { useMemo, useState } from 'react'

function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=(h<<13)|(h>>>19);}return function(){h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);h^=h>>>16;return h>>>0;};}
function mulberry32(a){return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function seededRand(seedStr){const seed=xmur3(seedStr)();return mulberry32(seed)}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v))
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)]
function multipleOf(r,base,min,max){const s=Math.ceil(min/base),e=Math.floor(max/base);const k=s+Math.floor(r()*(e-s+1));return k*base}
const steps=(...a)=>a

const SECTORS = ['retail','telecom','luchtvaart','SaaS','streaming','logistiek','consumptiegoederen'];
const CITIES  = ['Amsterdam','Rotterdam','Utrecht','Eindhoven','Antwerpen','Brussel','Keulen','Hamburg'];

// 1) Market sizing (multiplication)
function genMultiplyEasy(rand){
  const a=10+Math.floor(rand()*80);     // 10..89
  const b=2+Math.floor(rand()*8);       // 2..9
  const city = pick(rand, CITIES);
  const sector = pick(rand, SECTORS);
  const ans=a*b
  const contexts=[
    (a,b)=>`Een ${sector}-keten overweegt ${city}. Er zijn ${b} wijken; per wijk schatten we ${a} potentiële klanten per dag. Hoeveel klanten in totaal?`,
    (a,b)=>`Een luchtvaartmaatschappij opent ${b} nieuwe routes, elk met gemiddeld ${a} vluchten per maand. Hoeveel vluchten in totaal?`,
    (a,b)=>`Een streamingdienst plant ${b} promotieweken, elk met ${a} nieuwe inschrijvingen per dag. Hoeveel inschrijvingen totaal per week?`
  ]
  return {id:`mul-easy-${a}-${b}`,topic:'Case: market sizing',prompt:pick(rand,contexts)(a,b),hint:'Splits in tientallen en eenheden.',input:'integer',tol:0,answerText:String(ans),answerValue:ans,explain:steps('Splits in tientallen en eenheden.','Bereken tientallen × '+b+'.','Bereken eenheden × '+b+'.','Tel op tot '+ans+'.')}
}

// 2) Operations capacity (division exact)
function genDivisionExact(rand){
  const b=2+Math.floor(rand()*8)
  const q=3+Math.floor(rand()*13)
  const a=b*q
  const city = pick(rand, CITIES);
  const contexts=[
    (a,b)=>`Een logistieke speler in ${city} heeft ${a} vrachtwagens en wil ze gelijk verdelen over ${b} hubs. Hoeveel per hub?`,
    (a,b)=>`Een projectteam plant ${a} interviews, gelijk verdeeld over ${b} consultants. Hoeveel per consultant?`,
    (a,b)=>`Een producent verdeelt ${a} pallets gelijk over ${b} DC’s. Hoeveel pallets per DC?`
  ]
  return {id:`div-exact-${a}-${b}`,topic:'Case: operations capacity',prompt:pick(rand,contexts)(a,b),hint:'a = b × ?',input:'integer',tol:0,answerText:String(q),answerValue:q,explain:steps(`${a} = ${b} × ${q}`,`Dus ${a} ÷ ${b} = ${q}`)}
}

// 3) Market share / penetration (percent of total, in duizenden of miljoenen)
const PCT_OPTIONS=[{pct:50,base:2},{pct:25,base:4},{pct:75,base:4},{pct:20,base:5},{pct:10,base:10},{pct:5,base:20},{pct:12.5,base:8}]
function genPercentOfFriendly(rand){
  const opt=pick(rand,PCT_OPTIONS)
  const base=multipleOf(rand,opt.base,80,800) // 80..800 (k of m)
  const ans=(opt.pct/100)*base
  const contexts=[
    (pct,base)=>`Totale markt: ${base}k gebruikers. Wat is het aantal klanten bij ${pct}% marktaandeel? (antwoord in duizenden)`,
    (pct,base)=>`Een telco heeft ${base}k aansluitingen. Hoeveel actief bij ${pct}% activatie? (antwoord in duizenden)`,
    (pct,base)=>`Weekomzet is €${base}m. Hoeveel omzet in de premiumcategorie bij ${pct}% aandeel? (antwoord in miljoenen)`
  ]
  return {id:`pct-of-${opt.pct}-${base}`,topic:'Case: market share',prompt:pick(rand,contexts)(opt.pct,base),hint:`Bereken ${opt.pct}% van ${base}.`,input:'integer',tol:0,answerText:String(ans),answerValue:ans,explain:steps(`Bereken ${opt.pct}% van ${base} = ${ans}`)}
}

// 4) Pricing impact (markup/markdown) – base op veelvoud van 20 voor hele getallen
const MARK_OPTIONS=[{sign:+1,pct:10,base:10},{sign:-1,pct:10,base:10},{sign:+1,pct:20,base:5},{sign:-1,pct:20,base:5},{sign:+1,pct:25,base:4},{sign:-1,pct:25,base:4},{sign:+1,pct:50,base:2},{sign:-1,pct:50,base:2}]
function genMarkupMarkdownFriendly(rand){
  const o=pick(rand,MARK_OPTIONS)
  const base=multipleOf(rand,20,80,800)           // ⟵ zorgt dat 10/20/25/50% mooi uitkomt
  const delta=(o.pct/100)*base
  const newVal=o.sign>0?base+delta:base-delta
  const signLabel=o.sign>0?'stijgt':'daalt'
  const contexts=[
    (l,p,b)=>`Een fabrikant overweegt een prijs die ${l} met ${p}% vanaf €${b}. Wat wordt de nieuwe prijs per eenheid?`,
    (l,p,b)=>`Een SaaS‑aanbieder wijzigt zijn tarief dat ${l} met ${p}% vanaf €${b}. Wat is het nieuwe maandbedrag?`,
    (l,p,b)=>`Een exporteur past de FOB‑prijs aan die ${l} met ${p}% vanaf €${b}. Wat wordt de nieuwe prijs?`
  ]
  return {id:`mark-${o.sign}-${o.pct}-${base}`,topic:'Case: pricing impact',prompt:pick(rand,contexts)(signLabel,o.pct,base),hint:`${o.pct}% van ${base} is ${delta}.`,input:'integer',tol:0,answerText:String(newVal),answerValue:newVal,explain:steps(`Bereken ${o.pct}% van ${base} = ${delta}`,`Pas toe op basisprijs: ${newVal}`)}
}

// 5) Unit economics – korting + hoeveelheid (allemaal hele getallen)
const DISC_PCT = [5,10,20,25,50];
function genDiscountRevenue(rand){
  const priceBase = multipleOf(rand,20,40,400);  // ⟵ veelvoud van 20 (25% etc. wordt heel)
  const pct = pick(rand, DISC_PCT);
  const qty = multipleOf(rand,5,10,100);
  const discount = (pct/100)*priceBase;
  const newPrice = priceBase - discount;
  const revenue = newPrice * qty;
  return {
    id:`disc-${priceBase}-${pct}-${qty}`,
    topic:'Case: unit economics',
    prompt:`Een product kost €${priceBase}. Er geldt ${pct}% korting. Je verkoopt ${qty} stuks. Wat is de omzet (in euro’s)?`,
    hint:`Nieuwe prijs = prijs − ${pct}% van prijs; vermenigvuldig met hoeveelheid.`,
    input:'integer', tol:0,
    answerText:String(revenue), answerValue:revenue,
    explain:steps(
      `${pct}% van €${priceBase} = €${discount}.`,
      `Nieuwe prijs = €${priceBase} − €${discount} = €${newPrice}.`,
      `Omzet = €${newPrice} × ${qty} = €${revenue}.`
    )
  }
}

// 6) Market share → klanten (k) → ARPU (omzet in k) – basis veelvoud van 20
const ARPU_OPTIONS = [5,10,20,25,50];
function genShareArpuRevenueK(rand){
  const pct = pick(rand, [10,20,25,50]);
  const baseK = multipleOf(rand,20,80,800);        // ⟵ veelvoud van 20 → pct% * baseK is heel
  const customersK = (pct/100)*baseK;              // in duizenden
  const arpu = pick(rand, ARPU_OPTIONS);
  const revenueK = customersK * arpu;              // in duizenden euro
  return {
    id:`share-arpu-${pct}-${baseK}-${arpu}`,
    topic:'Case: omzet uit marktaandeel',
    prompt:`Totale markt: ${baseK}k klanten. Het merk pakt ${pct}% marktaandeel en ARPU is €${arpu}. Wat is de omzet (antwoord in duizenden euro’s)?`,
    hint:`Klanten (in k) = ${pct}% × ${baseK}. Vermenigvuldig met ARPU.`,
    input:'integer', tol:0,
    answerText:String(revenueK), answerValue:revenueK,
    explain:steps(
      `Klanten = ${pct}% × ${baseK}k = ${customersK}k.`,
      `Omzet (in k) = ${customersK} × €${arpu} = ${revenueK}k.`
    )
  }
}

const TEMPLATES=[
  genMultiplyEasy,
  genDivisionExact,
  genPercentOfFriendly,
  genMarkupMarkdownFriendly,
  genDiscountRevenue,
  genShareArpuRevenueK,
]

function shuffle(r,arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function ExerciseCard({ ex, onSolved }){
  const [value,setValue]=useState('')
  const [status,setStatus]=useState(null)
  const [showHint,setShowHint] = useState(false)   // ⟵ fixed (= i.p.v. ==)
  const [showSol,setShowSol]  = useState(false)
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

function buildSet(seedStr,count=10){
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
  const dailyExercises=useMemo(()=>buildSet(`daily-${todayKey}`,10),[todayKey])
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
