import { useState, useEffect, useCallback, useRef } from "react";

const SHEET_ID = "1AghTt6XfRxy7_bb-jdL7q_cy5q2gC1QfIji1qfO1fWc";
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MESES_C = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const FALLBACK = {
  lb: {
    fct:   [28155.53,33710.27,19262.97,14447.23,30200,35100,40255,51385,37923,27962,49518,32081],
    hist:  [22529,32790,9265,11040,17494,23955,29973,41432,28250,20834,36898,23952],
    real:  [22789.73,29237.49,35602.59,5506.08,null,null,null,null,null,null,null,null],
    yoy:   [1.2,-10.8,137.9,-50.1,null,null,null,null,null,null,null,null],
    pauta: [2027,3518.56,1541.04,1155.78,2416,2808,3220.40,4110.80,3033.84,2236.96,3961.44,2566.48],
  },
  hb: {
    fct:   [65110.76,55810.15,37818.28,39892.70,42890.42,45907.58,83912.01,93937.74,42506.10,72557.82,109411.41,49760.81],
    hist:  [58988.75,46733.54,32140.05,34914.44,36086.28,40580.93,73778.53,81376.19,40186.77,68261.31,99118.33,72785.16],
    real:  [45558.70,23453.26,37162.58,9766.58,null,null,null,null,null,null,null,null],
    yoy:   [-22.8,-49.8,15.6,-72.0,null,null,null,null,null,null,null,null],
  }
};

async function fetchSheetData() {
  const toNum = v => {
    if (!v || v.v === null || v.v === undefined) return null;
    if (typeof v.v === "number") return v.v;
    const s = String(v.f || v.v).replace(/[$,%\s]/g,"");
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };
  const pad12 = arr => { const a = [...arr]; while(a.length < 12) a.push(null); return a.slice(0,12); };

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=2026&t=${Date.now()}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.replace(/^[^\{]*/,"").replace(/[^\}]*$/,""));
  const rows = json.table.rows;

  let lb = { fct:[],hist:[],real:[],yoy:[],pauta:[] };
  let hb = { fct:[],hist:[],real:[],yoy:[] };
  let lbS = false, hbS = false;

  rows.forEach(row => {
    const cells = row.c || [];
    const label = String(cells[0]?.v || cells[0]?.f || "").trim().toUpperCase();
    const vals = cells.slice(1,13).map(toNum);
    if (label.includes("LUXURY BRANDS")) { lbS=true; hbS=false; return; }
    if (label.includes("HUGOBOSS") || label.includes("HUGO BOSS")) { hbS=true; lbS=false; return; }
    if (lbS) {
      if (label==="FCT 2026") lb.fct=pad12(vals);
      if (label.includes("HIST")) lb.hist=pad12(vals);
      if (label==="NET SALE") lb.real=pad12(vals);
      if (label==="YOY") lb.yoy=pad12(vals);
      if (label==="PAUTA") lb.pauta=pad12(vals);
    }
    if (hbS) {
      if (label==="FCT 2026") hb.fct=pad12(vals);
      if (label.includes("HIST")) hb.hist=pad12(vals);
      if (label==="NET SALE") hb.real=pad12(vals);
      if (label==="YOY") hb.yoy=pad12(vals);
    }
  });
  ["fct","hist","real","yoy","pauta"].forEach(k => { lb[k]=pad12(lb[k]||[]); });
  ["fct","hist","real","yoy"].forEach(k => { hb[k]=pad12(hb[k]||[]); });
  const ok = lb.real.some(v=>v!==null)||hb.real.some(v=>v!==null);
  return ok ? {lb,hb} : FALLBACK;
}

const $ = v => v===null||v===undefined||isNaN(v) ? "—" : "$"+Math.round(v).toLocaleString("en-US");
const pct = (v,d=1) => v===null||isNaN(v) ? "—" : v.toFixed(d)+"%";

function getBadge(v, mode="pct") {
  if (v===null||v===undefined||isNaN(v)) return {bg:"#f0f0ee",col:"#888",txt:"—"};
  if (mode==="pct") {
    if (v>=100) return {bg:"#d4edda",col:"#1a5c2e",txt:pct(v)};
    if (v>=70)  return {bg:"#fff3cd",col:"#7a3e00",txt:pct(v)};
    return {bg:"#f8d7da",col:"#6b1c1c",txt:pct(v)};
  }
  const sign = v>0?"+":"";
  if (v>=0) return {bg:"#d4edda",col:"#1a5c2e",txt:sign+pct(v)};
  return {bg:"#f8d7da",col:"#6b1c1c",txt:sign+pct(v)};
}

function Bdg({v,mode="pct"}) {
  const b = getBadge(v,mode);
  return <span style={{background:b.bg,color:b.col,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,display:"inline-block"}}>{b.txt}</span>;
}

function KCard({label,value,sub,badge,bMode="pct"}) {
  return (
    <div style={{background:"#fff",border:"0.5px solid #e4e4e2",borderRadius:8,padding:"14px 16px"}}>
      <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.07em",color:"#999",fontWeight:600,marginBottom:4}}>{label}</div>
      <div style={{fontSize:21,fontWeight:600,color:"#111",marginBottom:4}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#999"}}>{sub}{badge!==undefined&&<> <Bdg v={badge} mode={bMode}/></>}</div>}
    </div>
  );
}

function PBar({real,target,hist,mes}) {
  const p = target>0 ? real/target*100 : 0;
  const hP = hist>0 ? (real/hist-1)*100 : null;
  const col = p>=100?"#2d7a4f":p>=70?"#888":"#c0392b";
  return (
    <div style={{background:"#fff",border:"0.5px solid #e4e4e2",borderRadius:8,padding:"12px 16px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
        <span style={{fontSize:12,fontWeight:500,color:"#333"}}>Net Sale vs FCT — {mes}</span>
        <span style={{fontSize:20,fontWeight:700,color:col}}>{pct(p)}</span>
      </div>
      <div style={{height:6,background:"#eee",borderRadius:3,overflow:"hidden",marginBottom:5}}>
        <div style={{height:"100%",width:`${Math.min(p,100)}%`,background:col,borderRadius:3,transition:"width .8s"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#999"}}>
        <span>Real: {$(real)}</span><span>FCT: {$(target)}</span><span>Brecha: {$(real-target)}</span>
      </div>
      {hP!==null&&<div style={{marginTop:5,fontSize:11,color:"#999"}}>vs Histórico 2025: <Bdg v={hP} mode="yoy"/> ({$(hist)})</div>}
    </div>
  );
}

function MiniChart({lb,hb}) {
  const ref = useRef();
  useEffect(()=>{
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio||1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width=W*dpr; canvas.height=H*dpr;
    ctx.scale(dpr,dpr);
    const pad={top:16,right:16,bottom:28,left:52};
    const cW=W-pad.left-pad.right, cH=H-pad.top-pad.bottom;
    const allV=[...lb.real,...lb.fct,...lb.hist,...hb.real,...hb.fct,...hb.hist].filter(v=>v!==null&&v>0);
    const maxV=allV.length?Math.max(...allV)*1.12:1;
    const xPos=(i)=>pad.left+(i+0.5)*(cW/12);
    const yPos=(v)=>pad.top+cH-((v/maxV)*cH);
    // Grid
    [0,1,2,3,4].forEach(t=>{
      const y=pad.top+(t/4)*cH;
      ctx.strokeStyle="rgba(0,0,0,0.05)"; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cW,y); ctx.stroke();
      ctx.fillStyle="#ccc"; ctx.font="9px sans-serif"; ctx.textAlign="right";
      ctx.fillText("$"+(((maxV-(t/4)*maxV))/1000).toFixed(0)+"k",pad.left-4,y+3);
    });
    // X labels
    ctx.fillStyle="#ccc"; ctx.font="9px sans-serif"; ctx.textAlign="center";
    MESES_C.forEach((m,i)=>ctx.fillText(m,xPos(i),H-pad.bottom+12));
    // Bars LB
    const bW=cW/12*0.28;
    lb.real.forEach((v,i)=>{ if(!v)return; const x=xPos(i)-bW*0.7,y=yPos(v),bH=yPos(0)-y; ctx.fillStyle="#555"; ctx.beginPath(); ctx.roundRect?ctx.roundRect(x,y,bW,bH,2):ctx.rect(x,y,bW,bH); ctx.fill(); });
    hb.real.forEach((v,i)=>{ if(!v)return; const x=xPos(i)+bW*0.1,y=yPos(v),bH=yPos(0)-y; ctx.fillStyle="#aaa"; ctx.beginPath(); ctx.roundRect?ctx.roundRect(x,y,bW,bH,2):ctx.rect(x,y,bW,bH); ctx.fill(); });
    // Lines FCT
    [[lb.fct,"#666",[5,4]],[hb.fct,"#bbb",[5,4]],[lb.hist,"#ddd",[]],[hb.hist,"#ebebeb",[]]].forEach(([data,color,dash])=>{
      ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.setLineDash(dash);
      ctx.beginPath(); let first=true;
      data.forEach((v,i)=>{ if(!v)return; first?ctx.moveTo(xPos(i),yPos(v)):ctx.lineTo(xPos(i),yPos(v)); first=false; });
      ctx.stroke(); ctx.setLineDash([]);
    });
  },[lb,hb]);
  return <canvas ref={ref} style={{width:"100%",height:"100%",display:"block"}}/>;
}

function PctChart({lbP,hbP}) {
  const ref = useRef();
  useEffect(()=>{
    const canvas=ref.current; if(!canvas)return;
    const ctx=canvas.getContext("2d");
    const dpr=window.devicePixelRatio||1;
    const W=canvas.offsetWidth,H=canvas.offsetHeight;
    canvas.width=W*dpr; canvas.height=H*dpr; ctx.scale(dpr,dpr);
    const pad={top:14,right:16,bottom:28,left:44};
    const cW=W-pad.left-pad.right,cH=H-pad.top-pad.bottom;
    const maxV=220;
    const xP=(i)=>pad.left+(i+0.5)*(cW/12);
    const yP=(v)=>pad.top+cH-((Math.min(v,maxV)/maxV)*cH);
    [0,50,100,150,200].forEach(t=>{
      const y=pad.top+cH-((t/maxV)*cH);
      ctx.strokeStyle=t===100?"rgba(0,0,0,0.18)":"rgba(0,0,0,0.05)";
      ctx.lineWidth=t===100?1:0.5; ctx.setLineDash(t===100?[4,3]:[]);
      ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cW,y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle="#ccc"; ctx.font="9px sans-serif"; ctx.textAlign="right";
      ctx.fillText(t+"%",pad.left-4,y+3);
    });
    ctx.fillStyle="#ccc"; ctx.font="9px sans-serif"; ctx.textAlign="center";
    MESES_C.forEach((m,i)=>ctx.fillText(m,xP(i),H-pad.bottom+12));
    const bW=cW/12*0.28;
    [[lbP,-bW*0.7],[hbP,bW*0.1]].forEach(([data,offset])=>{
      data.forEach((v,i)=>{ if(v===null)return;
        const x=xP(i)+offset,y=yP(v),bH=yP(0)-y;
        ctx.fillStyle=v>=100?"#2d7a4f":v>=70?"#888":"#c0392b";
        ctx.beginPath(); ctx.roundRect?ctx.roundRect(x,y,bW,bH,2):ctx.rect(x,y,bW,bH); ctx.fill();
      });
    });
  },[lbP,hbP]);
  return <canvas ref={ref} style={{width:"100%",height:"100%",display:"block"}}/>;
}

const thStyle={fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:"#999",padding:"7px 8px",textAlign:"right",borderBottom:"1px solid #ebebea",fontWeight:600,whiteSpace:"nowrap"};
const tdStyle=(align="right")=>({padding:"7px 8px",textAlign:align,borderBottom:"1px solid #f0f0ee",whiteSpace:"nowrap"});

export default function App() {
  const [tab,setTab] = useState("evo");
  const [data,setData] = useState(FALLBACK);
  const [loading,setLoading] = useState(true);
  const [ts,setTs] = useState(null);
  const [err,setErr] = useState(null);

  const refresh = useCallback(async()=>{
    setLoading(true); setErr(null);
    try {
      const d = await fetchSheetData();
      setData(d);
      setErr(d===FALLBACK?"Usando datos de respaldo — hoja pública no respondió.":null);
    } catch(e) {
      setData(FALLBACK);
      setErr("Error al conectar. Mostrando datos de respaldo.");
    } finally {
      setLoading(false);
      setTs(new Date().toLocaleString("es-PE",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}));
    }
  },[]);

  useEffect(()=>{ refresh(); },[refresh]);

  const {lb,hb} = data;
  const lastIdx = arr=>{ let i=-1; arr.forEach((v,j)=>{ if(v!==null)i=j; }); return i; };
  const lbI=lastIdx(lb.real), hbI=lastIdx(hb.real);
  const ytd=(arr,n)=>arr.slice(0,n+1).reduce((s,v)=>s+(v||0),0);
  const lbR=lbI>=0?ytd(lb.real,lbI):0, lbF=lbI>=0?ytd(lb.fct,lbI):0;
  const hbR=hbI>=0?ytd(hb.real,hbI):0, hbF=hbI>=0?ytd(hb.fct,hbI):0;
  const lbFA=lb.fct.reduce((s,v)=>s+(v||0),0), hbFA=hb.fct.reduce((s,v)=>s+(v||0),0);
  const lbP=lb.real.map((r,i)=>r!==null&&lb.fct[i]>0?r/lb.fct[i]*100:null);
  const hbP=hb.real.map((r,i)=>r!==null&&hb.fct[i]>0?r/hb.fct[i]*100:null);

  const tabBtn=(t,label)=>(
    <button onClick={()=>setTab(t)} style={{padding:"9px 22px",fontSize:13,cursor:"pointer",border:"none",background:tab===t?"#1a1a18":"transparent",color:tab===t?"#fff":"#666",fontWeight:tab===t?500:400,fontFamily:"inherit",transition:"all .15s"}}>
      {label}
    </button>
  );

  const grid4={display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.5rem"};
  const card={background:"#fff",border:"0.5px solid #e4e4e2",borderRadius:10,padding:"1.2rem 1.5rem",marginBottom:"1.2rem"};
  const sLabel={fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",color:"#999",fontWeight:600,marginBottom:8};

  return (
    <div style={{background:"#f2f2f0",minHeight:"100vh",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",fontSize:14}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"1.5rem 1rem"}}>

        {/* Header */}
        <div style={{background:"#fff",borderRadius:10,padding:"1.2rem 1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",border:"0.5px solid #e4e4e2"}}>
          <div>
            <div style={{fontSize:17,fontWeight:600,color:"#111"}}>Canales Digitales — Grupo Yes</div>
            <div style={{fontSize:11,color:"#999",marginTop:3}}>
              Luxury Brands &amp; HugoBoss.pe · {loading?"Cargando datos...":`Actualizado: ${ts}`}
            </div>
            {err&&<div style={{fontSize:11,color:"#7a3e00",background:"#fff3cd",padding:"2px 8px",borderRadius:4,marginTop:4,display:"inline-block"}}>{err}</div>}
          </div>
          <button onClick={refresh} disabled={loading} style={{background:"#1a1a18",color:"#fff",border:"none",padding:"8px 18px",borderRadius:6,fontSize:12,cursor:loading?"wait":"pointer",fontFamily:"inherit",opacity:loading?0.6:1}}>
            {loading?"Cargando...":"↻ Actualizar"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",border:"0.5px solid #ddd",borderRadius:8,overflow:"hidden",width:"fit-content",marginBottom:"1.5rem",background:"#fff"}}>
          {tabBtn("evo","Evolutivo anual")}
          {tabBtn("lb","Luxury Brands")}
          {tabBtn("hb","HugoBoss.pe")}
        </div>

        {/* EVOLUTIVO */}
        {tab==="evo"&&<div>
          <div style={sLabel}>YTD acumulado</div>
          <div style={grid4}>
            <KCard label="LB Net Sale YTD" value={$(lbR)} sub={`FCT YTD: ${$(lbF)}`} badge={lbF>0?lbR/lbF*100:null}/>
            <KCard label="LB Deuda FCT anual" value={<span style={{color:lbR>=lbFA?"#1a5c2e":"#6b1c1c"}}>{$(lbR-lbFA)}</span>} sub={`Meta año: ${$(lbFA)} · ${lbFA>0?(lbR/lbFA*100).toFixed(1)+"% avance":"—"}`}/>
            <KCard label="HB Net Sale YTD" value={$(hbR)} sub={`FCT YTD: ${$(hbF)}`} badge={hbF>0?hbR/hbF*100:null}/>
            <KCard label="HB Deuda FCT anual" value={<span style={{color:hbR>=hbFA?"#1a5c2e":"#6b1c1c"}}>{$(hbR-hbFA)}</span>} sub={`Meta año: ${$(hbFA)} · ${hbFA>0?(hbR/hbFA*100).toFixed(1)+"% avance":"—"}`}/>
          </div>

          <div style={card}>
            <div style={sLabel}>Net Sale vs FCT vs Histórico — todos los meses</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:12}}>
              {[["#555","LB Real"],["#aaa","HB Real"],["dashed #666","LB FCT"],["dashed #bbb","HB FCT"],["#ddd","LB Hist 2025"],["#ebebeb","HB Hist 2025"]].map(([c,l],i)=>(
                <span key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#888"}}>
                  <span style={{width:10,height:10,borderRadius:2,flexShrink:0,
                    background:c.startsWith("dashed")?"transparent":"#"+c.split("#")[1]||c,
                    border:c.startsWith("dashed")?`1.5px dashed #${c.split("#")[1]}`:"none"}}/>
                  {l}
                </span>
              ))}
            </div>
            <div style={{height:260}}><MiniChart lb={lb} hb={hb}/></div>
          </div>

          <div style={card}>
            <div style={sLabel}>% Cumplimiento vs FCT · verde ≥100% · ámbar ≥70% · rojo &lt;70%</div>
            <div style={{display:"flex",gap:14,marginBottom:10}}>
              <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#888"}}><span style={{width:10,height:10,borderRadius:2,background:"#555"}}/>LB</span>
              <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#888"}}><span style={{width:10,height:10,borderRadius:2,background:"#aaa"}}/>HB</span>
            </div>
            <div style={{height:180}}><PctChart lbP={lbP} hbP={hbP}/></div>
          </div>

          <div style={card}>
            <div style={sLabel}>Tabla evolutivo anual — LB + HB</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#fafaf8"}}>
                  {["Mes","LB Real","LB FCT","LB %FCT","LB YoY","HB Real","HB FCT","HB %FCT","HB YoY"].map((h,i)=>(
                    <th key={h} style={{...thStyle,textAlign:i===0?"left":"right"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {MESES.map((m,i)=>{
                    const lr=lb.real[i],lf=lb.fct[i],ly=lb.yoy[i];
                    const hr=hb.real[i],hf=hb.fct[i],hy=hb.yoy[i];
                    const lp=lf>0&&lr!==null?lr/lf*100:null;
                    const hp=hf>0&&hr!==null?hr/hf*100:null;
                    const has=lr!==null||hr!==null;
                    return <tr key={m} style={{opacity:has?1:0.38}}>
                      <td style={{...tdStyle("left"),color:"#111",fontWeight:500}}>{m}</td>
                      <td style={{...tdStyle(),color:"#333"}}>{lr!==null?$(lr):"—"}</td>
                      <td style={{...tdStyle(),color:"#999"}}>{$(lf)}</td>
                      <td style={tdStyle()}><Bdg v={lp}/></td>
                      <td style={tdStyle()}><Bdg v={ly} mode="yoy"/></td>
                      <td style={{...tdStyle(),color:"#333"}}>{hr!==null?$(hr):"—"}</td>
                      <td style={{...tdStyle(),color:"#999"}}>{$(hf)}</td>
                      <td style={tdStyle()}><Bdg v={hp}/></td>
                      <td style={tdStyle()}><Bdg v={hy} mode="yoy"/></td>
                    </tr>;
                  })}
                  <tr style={{background:"#fafaf8"}}>
                    <td style={{...tdStyle("left"),fontWeight:600,color:"#111",borderTop:"1px solid #ddd"}}>YTD</td>
                    <td style={{...tdStyle(),fontWeight:600,color:"#111",borderTop:"1px solid #ddd"}}>{$(lbR)}</td>
                    <td style={{...tdStyle(),fontWeight:600,color:"#999",borderTop:"1px solid #ddd"}}>{$(lbF)}</td>
                    <td style={{...tdStyle(),borderTop:"1px solid #ddd"}}><Bdg v={lbF>0?lbR/lbF*100:null}/></td>
                    <td style={{...tdStyle(),borderTop:"1px solid #ddd"}}>—</td>
                    <td style={{...tdStyle(),fontWeight:600,color:"#111",borderTop:"1px solid #ddd"}}>{$(hbR)}</td>
                    <td style={{...tdStyle(),fontWeight:600,color:"#999",borderTop:"1px solid #ddd"}}>{$(hbF)}</td>
                    <td style={{...tdStyle(),borderTop:"1px solid #ddd"}}><Bdg v={hbF>0?hbR/hbF*100:null}/></td>
                    <td style={{...tdStyle(),borderTop:"1px solid #ddd"}}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>}

        {/* LB */}
        {tab==="lb"&&lbI>=0&&<div>
          <div style={sLabel}>KPIs mes en curso — {MESES[lbI]} 2026</div>
          <div style={grid4}>
            <KCard label={`Net Sale ${MESES[lbI]}`} value={$(lb.real[lbI])} sub={`FCT: ${$(lb.fct[lbI])}`} badge={lb.fct[lbI]>0?lb.real[lbI]/lb.fct[lbI]*100:null}/>
            <KCard label="Deuda FCT mes" value={<span style={{color:lb.real[lbI]>=lb.fct[lbI]?"#1a5c2e":"#6b1c1c"}}>{$(lb.real[lbI]-lb.fct[lbI])}</span>} sub="Real vs meta mensual"/>
            <KCard label={`Histórico ${MESES[lbI]} 2025`} value={$(lb.hist[lbI])} sub="YoY" badge={lb.yoy[lbI]} bMode="yoy"/>
            <KCard label="% Cumpl. FCT" value={<span style={{color:lb.fct[lbI]>0?(lb.real[lbI]/lb.fct[lbI]>=1?"#1a5c2e":lb.real[lbI]/lb.fct[lbI]>=0.7?"#7a3e00":"#6b1c1c"):"#999"}}>{lb.fct[lbI]>0?pct(lb.real[lbI]/lb.fct[lbI]*100):"—"}</span>} sub={lb.fct[lbI]>0&&lb.real[lbI]/lb.fct[lbI]>1?`+${pct(lb.real[lbI]/lb.fct[lbI]*100-100)} sobre meta`:""}/>
          </div>
          <PBar real={lb.real[lbI]} target={lb.fct[lbI]} hist={lb.hist[lbI]} mes={MESES[lbI]}/>
          <div style={{marginBottom:"1rem"}}/>
          <div style={card}>
            <div style={{fontSize:12,fontWeight:600,color:"#111",marginBottom:"1rem",paddingBottom:6,borderBottom:"2px solid #e8e8e6"}}>Luxury Brands — detalle mensual 2026</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#fafaf8"}}>
                  {["Mes","Net Sale","FCT","% FCT","Hist 2025","YoY","Deuda FCT","Pauta"].map((h,i)=>(
                    <th key={h} style={{...thStyle,textAlign:i===0?"left":"right"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {MESES.map((m,i)=>{
                    const r=lb.real[i],f=lb.fct[i],h=lb.hist[i],y=lb.yoy[i],p=lb.pauta[i];
                    const cp=f>0&&r!==null?r/f*100:null;
                    return <tr key={m} style={{opacity:r!==null?1:0.38,background:i===lbI?"#f8fdf8":"transparent"}}>
                      <td style={{...tdStyle("left"),color:"#111",fontWeight:i===lbI?600:500}}>{m}{i===lbI?" ◀":""}</td>
                      <td style={{...tdStyle(),color:"#333",fontWeight:r!==null?500:400}}>{r!==null?$(r):"—"}</td>
                      <td style={{...tdStyle(),color:"#999"}}>{$(f)}</td>
                      <td style={tdStyle()}><Bdg v={cp}/></td>
                      <td style={{...tdStyle(),color:"#999"}}>{$(h)}</td>
                      <td style={tdStyle()}><Bdg v={y} mode="yoy"/></td>
                      <td style={tdStyle()}>{r!==null?<Bdg v={r-f} mode="yoy"/>:"—"}</td>
                      <td style={{...tdStyle(),color:"#999"}}>{p?$(p):"—"}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>}

        {/* HB */}
        {tab==="hb"&&hbI>=0&&<div>
          <div style={sLabel}>KPIs mes en curso — {MESES[hbI]} 2026</div>
          <div style={grid4}>
            <KCard label={`Net Sale ${MESES[hbI]}`} value={$(hb.real[hbI])} sub={`FCT: ${$(hb.fct[hbI])}`} badge={hb.fct[hbI]>0?hb.real[hbI]/hb.fct[hbI]*100:null}/>
            <KCard label="Deuda FCT mes" value={<span style={{color:hb.real[hbI]>=hb.fct[hbI]?"#1a5c2e":"#6b1c1c"}}>{$(hb.real[hbI]-hb.fct[hbI])}</span>} sub="Real vs meta mensual"/>
            <KCard label={`Histórico ${MESES[hbI]} 2025`} value={$(hb.hist[hbI])} sub="YoY" badge={hb.yoy[hbI]} bMode="yoy"/>
            <KCard label="% Cumpl. FCT" value={<span style={{color:hb.fct[hbI]>0?(hb.real[hbI]/hb.fct[hbI]>=1?"#1a5c2e":hb.real[hbI]/hb.fct[hbI]>=0.7?"#7a3e00":"#6b1c1c"):"#999"}}>{hb.fct[hbI]>0?pct(hb.real[hbI]/hb.fct[hbI]*100):"—"}</span>} sub={hb.fct[hbI]>0&&hb.real[hbI]/hb.fct[hbI]>1?`+${pct(hb.real[hbI]/hb.fct[hbI]*100-100)} sobre meta`:""}/>
          </div>
          <PBar real={hb.real[hbI]} target={hb.fct[hbI]} hist={hb.hist[hbI]} mes={MESES[hbI]}/>
          <div style={{marginBottom:"1rem"}}/>
          <div style={card}>
            <div style={{fontSize:12,fontWeight:600,color:"#111",marginBottom:"1rem",paddingBottom:6,borderBottom:"2px solid #e8e8e6"}}>HugoBoss.pe — detalle mensual 2026</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#fafaf8"}}>
                  {["Mes","Net Sale","FCT","% FCT","Hist 2025","YoY","Deuda FCT"].map((h,i)=>(
                    <th key={h} style={{...thStyle,textAlign:i===0?"left":"right"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {MESES.map((m,i)=>{
                    const r=hb.real[i],f=hb.fct[i],h=hb.hist[i],y=hb.yoy[i];
                    const cp=f>0&&r!==null?r/f*100:null;
                    return <tr key={m} style={{opacity:r!==null?1:0.38,background:i===hbI?"#f8fdf8":"transparent"}}>
                      <td style={{...tdStyle("left"),color:"#111",fontWeight:i===hbI?600:500}}>{m}{i===hbI?" ◀":""}</td>
                      <td style={{...tdStyle(),color:"#333",fontWeight:r!==null?500:400}}>{r!==null?$(r):"—"}</td>
                      <td style={{...tdStyle(),color:"#999"}}>{$(f)}</td>
                      <td style={tdStyle()}><Bdg v={cp}/></td>
                      <td style={{...tdStyle(),color:"#999"}}>{$(h)}</td>
                      <td style={tdStyle()}><Bdg v={y} mode="yoy"/></td>
                      <td style={tdStyle()}>{r!==null?<Bdg v={r-f} mode="yoy"/>:"—"}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>}

      </div>
    </div>
  );
}
