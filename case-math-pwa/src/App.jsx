import React, { useMemo, useState } from 'react'

/* --- utils (ongewijzigd) --- */
function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=(h<<13)|(h>>>19);}return function(){h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);h^=h>>>16;return h>>>0;};}
function mulberry32(a){return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function seededRand(seedStr){const seed=xmur3(seedStr)();return mulberry32(seed)}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v))
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)]
function multipleOf(r,base,min,max){const s=Math.ceil(min/base),e=Math.floor(max/base);const k=s+Math.floor(r()*(e-s+1));return k*base}
const steps=(...a)=>a

/* --- variatie --- */
const SECTORS = ['retail','telecom','luchtvaart','SaaS','streaming','logistiek','consumptiegoederen'];
const CITIES  = ['Amsterdam','Rotterdam','Utrecht','Eindhoven','Antwerpen','Brussel','Keulen','Hamburg'];
const PCTS    = [5,10,20,25,50];            // mooie hoofdreken‑percentages

/* 1) Market sizing – bezoekers × conversie (twee variabelen) */
function genMarketSizingNarrative(rand){
  const city   = pick(rand, CITIES);
  const sector = pick(rand, SECTORS);
  const wijken = 2 + Math.floor(rand()*8);           // 2..9
  const conv   = pick(rand, [10,20,25,50]);          // conversie %
  const baseForConv = conv===25?4 : conv===50?2 : conv===20?5 : 10;
  const bezoek = multipleOf(rand, baseForConv, 80, 240); // per wijk per dag
  const kopers = wijken * bezoek * (conv/100);

  const prompt =
    `De ${sector}-klant bekijkt uitbreiding naar ${city}. We ramen **${wijken} wijken** met gemiddeld **${bezoek} bezoekers per dag** per wijk. ` +
    `Op basis van vergelijkbare locaties koopt ongeveer **${conv}%** van de bezoekers. ` +
    `Hoeveel **kopers per dag** verwachten we in totaal bij start?`;

  return {
    id:`ms-${wijken}-${bezoek}-${conv}`,
    topic:'Case: market sizing',
    prompt,
    hint:`Totaal bezoekers = wijken × bezoekers/ wijk. Pas daarna ${conv}% conversie toe.`,
    input:'integer', tol:0,
    answerText:String(kopers), answerValue:kopers,
    explain:steps(
      `Bezoekers totaal = ${wijken} × ${bezoek} = ${wijken*bezoek}.`,
      `Kopers = ${conv}% van ${wijken*bezoek} = ${kopers}.`
    )
  };
}

/* 2) Operations – verdelen over hubs én werkdagen (drie variabelen) */
function genOpsCapacityNarrative(rand){
  const city    = pick(rand, CITIES);
  const hubs    = 2 + Math.floor(rand()*8);     // 2..9
  const dagen   = pick(rand, [5]);              // werkweek
  const perDag  = 3 + Math.floor(rand()*13);    // 3..15
  const pallets = hubs * dagen * perDag;        // zodat deling exact is

  const prompt =
    `Een logistieke speler in ${city} verwerkt **${pallets} pallets per week**. ` +
    `We verdelen **gelijk over ${hubs} hubs** en plannen **${dagen} werkdagen**. ` +
    `Hoeveel pallets moet **elk hub per dag** laden om de weekvraag te halen?`;

  return {
    id:`ops-${pallets}-${hubs}-${dagen}`,
    topic:'Case: operations capacity',
    prompt,
    hint:`Verdeel eerst over hubs, daarna over werkdagen.`,
    input:'integer', tol:0,
    answerText:String(perDag), answerValue:perDag,
    explain:steps(
      `Per hub per week = ${pallets} ÷ ${hubs} = ${pallets/hubs}.`,
      `Per hub per dag = ${(pallets/hubs)} ÷ ${dagen} = ${perDag}.`
    )
  };
}

/* 3) Market share met groei – klanten in k (meerdere variabelen) */
function genFutureShareCustomers(rand){
  const baseK = multipleOf(rand,20,80,800);         // huidige markt (k)
  const groei = pick(rand, [10,20,25,50]);          // marktgroei %
  const share = pick(rand, [10,20,25,50]);          // ons marktaandeel %
  const futureK = baseK * (1 + groei/100);          // toekomstige markt (k)
  const klantenK = futureK * (share/100);           // in duizenden

  const prompt =
    `De huidige markt is **${baseK}k klanten**. We verwachten **${groei}% groei** tegen volgend jaar, ` +
    `en mikken dan op **${share}% marktaandeel**. ` +
    `Hoeveel **klanten (in duizenden)** verwachten we dan te bedienen?`;

  return {
    id:`share-fut-${baseK}-${groei}-${share}`,
    topic:'Case: market share (forecast)',
    prompt,
    hint:`Toekomstige markt = ${baseK} × (1 + ${groei}%). Daarna × ${share}% voor onze klanten.`,
    input:'integer', tol:0,
    answerText:String(klantenK), answerValue:klantenK,
    explain:steps(
      `Toekomstige markt = ${baseK}k × (1 + ${groei}%) = ${futureK}k.`,
      `Onze klanten = ${share}% van ${futureK}k = ${klantenK}k.`
    )
  };
}

/* 4) Pricing + discount + volumestijging – nieuwe omzet (€) */
function genPricingLiftRevenue(rand){
  const priceBase = multipleOf(rand,20,40,400);   // basisprijs €
  const disc      = pick(rand, [10,20,25,50]);    // korting %
  const units0    = multipleOf(rand,20,100,400);  // basisvolume
  const lift      = pick(rand, [10,20,25,50]);    // volumestijging %
  const newPrice  = priceBase * (1 - disc/100);
  const newUnits  = units0 * (1 + lift/100);
  const revenue   = newPrice * newUnits;

  const prompt =
    `We verkopen een product voor **€${priceBase}** en verkopen **${units0} stuks per week**. ` +
    `We overwegen een **korting van ${disc}%**, waarmee we een **volumestijging van ${lift}%** verwachten. ` +
    `Wat wordt de **nieuwe weekomzet in euro’s** na deze prijsaanpassing?`;

  return {
    id:`price-lift-${priceBase}-${disc}-${units0}-${lift}`,
    topic:'Case: pricing impact',
    prompt,
    hint:`Nieuwe prijs = €${priceBase} × (1 − ${disc}%). Nieuwe volume = ${units0} × (1 + ${lift}%).`,
    input:'integer', tol:0,
    answerText:String(revenue), answerValue:revenue,
    explain:steps(
      `Nieuwe prijs = €${priceBase} × (1 − ${disc}%) = €${newPrice}.`,
      `Nieuw volume = ${units0} × (1 + ${lift}%) = ${newUnits}.`,
      `Omzet = €${newPrice} × ${newUnits} = €${revenue}.`
    )
  };
}

/* 5) Markt → groei → share → prijsdaling – verwachte omzet (in duizenden €) */
function genFullForecastRevenueK(rand){
  const baseK   = multipleOf(rand,20,80,800);     // markt nu (k)
  const groei   = pick(rand, [10,20,25]);         // marktgroei %
  const share   = pick(rand, [10,20,25,50]);      // marktaandeel %
  const price0  = multipleOf(rand,20,40,200);     // huidige prijs €
  const disc    = pick(rand, [10,20,25]);         // prijsverlaging %
  const futureK = baseK * (1 + groei/100);        // markt straks (k)
  const klantenK = futureK * (share/100);         // klanten in k
  const priceNew = price0 * (1 - disc/100);       // nieuwe prijs €
  const revenueK = klantenK * priceNew;           // omzet in duizenden €

  const prompt =
    `De markt telt nu **${baseK}k klanten** en groeit volgend jaar met **${groei}%**. ` +
    `Wij mikken op **${share}% marktaandeel** en verlagen de prijs van **€${price0}** met **${disc}%** ` +
    `om die penetratie te halen. Wat is de **verwachte omzet volgend jaar (in duizenden euro’s)**?`;

  return {
    id:`full-rev-${baseK}-${groei}-${share}-${price0}-${disc}`,
    topic:'Case: market expansion (revenue)',
    prompt,
    hint:`Toekomstige markt → klanten (share) → nieuwe prijs toepassen. Let op: antwoord in duizenden €.`,
    input:'integer', tol:0,
    answerText:String(revenueK), answerValue:revenueK,
    explain:steps(
      `Toekomstige markt = ${baseK}k × (1 + ${groei}%) = ${futureK}k.`,
      `Klanten = ${share}% × ${futureK}k = ${klantenK}k.`,
      `Nieuwe prijs = €${price0} × (1 − ${disc}%) = €${priceNew}.`,
      `Omzet (in k) = ${klantenK} × €${priceNew} = ${revenueK}k.`
    )
  };
}

/* 6) Unit economics – korting en hoeveelheid (simpele verhalende versie) */
function genDiscountRevenue(rand){
  const priceBase = multipleOf(rand,20,40,400);
  const pct       = pick(rand, PCTS);
  const qty       = multipleOf(rand,5,20,120);
  const discount  = (pct/100)*priceBase;
  const newPrice  = priceBase - discount;
  const revenue   = newPrice * qty;

  const prompt =
    `Voor een promotieperiode zetten we de prijs van **€${priceBase}** **${pct}% lager**. ` +
    `We verwachten **${qty} verkopen** in die week. Wat is de **weekomzet in euro’s** onder deze actie?`;

  return {
    id:`disc-${priceBase}-${pct}-${qty}`,
    topic:'Case: unit economics',
    prompt,
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

/* lijst met generators */
const TEMPLATES = [
  genMarketSizingNarrative,
  genOpsCapacityNarrative,
  genFutureShareCustomers,
  genPricingLiftRevenue,
  genFullForecastRevenueK,
  genDiscountRevenue,
];

/* shuffle & build */
function shuffle(r,arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function ExerciseCard({ ex, onSolved }){
  const [value,setValue]=useState('')
  const [status,setStatus]=useState(null)
  const [showHint,setShowHint] = useState(false)
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
