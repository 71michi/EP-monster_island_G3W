
// STEP 4 – HORDE LIST PANEL

const ADMIN_PASSWORD="admin123";
let isAdmin=sessionStorage.getItem("isAdmin")==="true";
let currentType="land";

const HORDE_MAX_KILLS=4;
const HORDE_CD=12*60*60*1000;

let scale=1;
let origin={x:0,y:0};

let hexMap=JSON.parse(localStorage.getItem("hexMap")||"[]");
let hordeData=JSON.parse(localStorage.getItem("hordeData")||"{}");

const loginBtn=document.getElementById("loginBtn");
const logoutBtn=document.getElementById("logoutBtn");
const toolbar=document.getElementById("toolbar");
const mapSvg=document.getElementById("mapSvg");
const popup=document.getElementById("hordePopup");
const flagsLayer=document.getElementById("flags");
const gridLayer=document.getElementById("grid");
const hexLayer=document.getElementById("hexLayer");
const hordeItems=document.getElementById("hordeItems");

/* ADMIN */
function buildToolbar(){
 toolbar.innerHTML=`
  <button data-t="land">Land</button>
  <button data-t="water">Water</button>
  <button data-t="void">Void</button>
  <button data-t="special">Baza</button>
  <button data-t="horde">Horde</button>
  <button data-t="titan">Titan</button>
  <button id="exportBtn">Export</button>
  <label style="cursor:pointer">Import<input type="file" id="importInput" hidden></label>
 `;
 toolbar.style.display="flex";
 toolbar.querySelectorAll("button[data-t]").forEach(b=>b.onclick=()=>currentType=b.dataset.t);
 document.getElementById("exportBtn").onclick=exportMap;
 document.getElementById("importInput").onchange=importMap;
}
function enterAdmin(){
 isAdmin=true;
 sessionStorage.setItem("isAdmin","true");
 buildToolbar();
 loginBtn.style.display="none";
 logoutBtn.style.display="inline-block";
}
function exitAdmin(){
 isAdmin=false;
 sessionStorage.removeItem("isAdmin");
 toolbar.style.display="none";
 loginBtn.style.display="inline-block";
 logoutBtn.style.display="none";
 popup.classList.add("hidden");
}
loginBtn.onclick=()=>{const p=prompt("Hasło administratora:");if(p===ADMIN_PASSWORD) enterAdmin();};
logoutBtn.onclick=exitAdmin;
if(isAdmin) enterAdmin();

/* MAP + GRID (skrócone – identyczne jak STEP 3.5) */
const COLS=50,ROWS=50,R=14,W=Math.sqrt(3)*R,H=2*R,PAD=60,SECTIONS=9;
const MAP_W=COLS*W+W+PAD*2;
const MAP_H=ROWS*H*0.75+H+PAD*2;
mapSvg.setAttribute("viewBox",`0 0 ${MAP_W} ${MAP_H}`);

function hexPoints(cx,cy){
 const a=[30,90,150,210,270,330];
 return a.map(x=>(cx+R*Math.cos(x*Math.PI/180)).toFixed(2)+","+(cy+R*Math.sin(x*Math.PI/180)).toFixed(2)).join(" ");
}

// grid lines + labels omitted here for brevity (unchanged logic)

for(let r=0;r<ROWS;r++){
 for(let c=0;c<COLS;c++){
  const shift=r%2===0?W/2:0;
  const cx=PAD+W+c*W+shift;
  const cy=PAD+H/2+r*H*0.75;
  const p=document.createElementNS("http://www.w3.org/2000/svg","polygon");
  p.setAttribute("points",hexPoints(cx,cy));
  p.setAttribute("class","hex land");
  p.dataset.col=c;p.dataset.row=r;
  hexLayer.appendChild(p);
 }
}

function applyMap(){
 document.querySelectorAll(".hex").forEach(h=>{
  const d=hexMap.find(x=>x.c==h.dataset.col&&x.r==h.dataset.row);
  if(d) h.setAttribute("class","hex "+d.t);
 });
}
applyMap();

/* HORDE STATUS */
function isAlive(d){
 if(!d) return true;
 if(d.kills>=HORDE_MAX_KILLS) return false;
 if(!d.last) return true;
 return Date.now()-d.last>=HORDE_CD;
}
function remain(d){
 if(!d||!d.last) return 0;
 return Math.max(0,HORDE_CD-(Date.now()-d.last));
}
function fmt(ms){
 const s=Math.floor(ms/1000);
 const h=Math.floor(s/3600);
 const m=Math.floor((s%3600)/60);
 const sec=s%60;
 return `${h}h ${m}m ${sec}s`;
}

/* HORDE LIST */
function renderHordeList(){
 hordeItems.innerHTML="";
 document.querySelectorAll(".hex.horde").forEach(h=>{
  const k=h.dataset.col+","+h.dataset.row;
  const d=hordeData[k]||{kills:0,last:null};
  let cls="horde-alive",status="ALIVE";
  if(!isAlive(d)){
   if(d.kills>=HORDE_MAX_KILLS){cls="horde-dead";status="DEAD";}
   else{cls="horde-cooldown";status=fmt(remain(d));}
  }
  const div=document.createElement("div");
  div.className="horde-item "+cls;
  div.innerHTML=`<b>${k}</b><br>${status} (${d.kills}/4)`;
  hordeItems.appendChild(div);
 });
}

/* FLAGS – minimal */
function renderFlags(){
 flagsLayer.innerHTML="";
 document.querySelectorAll(".hex.horde").forEach(h=>{
  const k=h.dataset.col+","+h.dataset.row;
  const d=hordeData[k]||{kills:0,last:null};
  const b=h.getBBox();
  let state="alive",text=`ALIVE (${d.kills}/4)`;
  if(!isAlive(d)){
   state=d.kills>=HORDE_MAX_KILLS?"dead":"cooldown";
   text=d.kills>=HORDE_MAX_KILLS?`DEAD (4/4)`:`${fmt(remain(d))} (${d.kills}/4)`;
  }
  const g=document.createElementNS("http://www.w3.org/2000/svg","g");
  const bg=document.createElementNS("http://www.w3.org/2000/svg","rect");
  bg.setAttribute("x",b.x+b.width/2);
  bg.setAttribute("y",b.y-24);
  bg.setAttribute("width",96);
  bg.setAttribute("height",22);
  bg.setAttribute("class","flag-bg "+state);
  const t=document.createElementNS("http://www.w3.org/2000/svg","text");
  t.setAttribute("x",b.x+b.width/2+4);
  t.setAttribute("y",b.y-9);
  t.setAttribute("class","flag-text");
  t.textContent=text;
  g.append(bg,t);
  flagsLayer.appendChild(g);
 });
}

/* LOOP */
setInterval(()=>{
 renderFlags();
 renderHordeList();
},1000);

/* IMPORT / EXPORT */
function exportMap(){
 const data={hexMap,hordeData};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const a=document.createElement("a");
 a.href=URL.createObjectURL(blob);
 a.download="map_with_hordes.json";
 a.click();
}
function importMap(e){
 const f=e.target.files[0];
 if(!f)return;
 const r=new FileReader();
 r.onload=()=>{
  const d=JSON.parse(r.result);
  hexMap=d.hexMap||[];
  hordeData=d.hordeData||{};
  localStorage.setItem("hexMap",JSON.stringify(hexMap));
  localStorage.setItem("hordeData",JSON.stringify(hordeData));
  applyMap();
 };
 r.readAsText(f);
}


/* ================= PAN + ZOOM (RESTORED) ================= */
let panning = false;
let panStart = { x: 0, y: 0 };

function updateTransform(){
  mapSvg.style.transform =
    `translate(${origin.x}px, ${origin.y}px) scale(${scale})`;
}

mapSvg.addEventListener("mousedown", e => {
  if (e.button === 1 || e.button === 2) {
    panning = true;
    panStart.x = e.clientX - origin.x;
    panStart.y = e.clientY - origin.y;
  }
});

window.addEventListener("mousemove", e => {
  if (!panning) return;
  origin.x = e.clientX - panStart.x;
  origin.y = e.clientY - panStart.y;
  updateTransform();
});

window.addEventListener("mouseup", () => {
  panning = false;
});

mapSvg.addEventListener("wheel", e => {
  e.preventDefault();

  const zoomFactor = 1 - e.deltaY * 0.001;
  const newScale = Math.min(Math.max(scale * zoomFactor, 0.4), 3);

  const rect = mapSvg.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  const wx = (cx - origin.x) / scale;
  const wy = (cy - origin.y) / scale;

  scale = newScale;
  origin.x = cx - wx * scale;
  origin.y = cy - wy * scale;

  updateTransform();
}, { passive: false });

updateTransform();
/* ======================================================== */


/* ===== GRID RENDER (STABLE) ===== */
function renderGrid(){
  gridLayer.innerHTML="";
  const SECTIONS=9, letters="ABCDEFGHI";
  const usableW=MAP_W-2*PAD, usableH=MAP_H-2*PAD;

  for(let i=1;i<SECTIONS;i++){
    const x=PAD+i*usableW/SECTIONS;
    const y=PAD+i*usableH/SECTIONS;

    ["v","h"].forEach(t=>{
      const l=document.createElementNS("http://www.w3.org/2000/svg","line");
      if(t==="v"){
        l.setAttribute("x1",x);l.setAttribute("y1",PAD);
        l.setAttribute("x2",x);l.setAttribute("y2",MAP_H-PAD);
      }else{
        l.setAttribute("x1",PAD);l.setAttribute("y1",y);
        l.setAttribute("x2",MAP_W-PAD);l.setAttribute("y2",y);
      }
      l.setAttribute("class","section-line");
      gridLayer.appendChild(l);
    });
  }

  for(let i=0;i<SECTIONS;i++){
    const x=PAD+(i+0.5)*usableW/SECTIONS;
    const y=PAD+(i+0.5)*usableH/SECTIONS;

    [["y",PAD-15],["y",MAP_H-PAD+35]].forEach(v=>{
      const t=document.createElementNS("http://www.w3.org/2000/svg","text");
      t.textContent=letters[i];
      t.setAttribute("x",x);t.setAttribute("y",v[1]);
      t.setAttribute("class","grid-label");
      gridLayer.appendChild(t);
    });

    [["x",PAD-30],["x",MAP_W-PAD+15]].forEach(v=>{
      const t=document.createElementNS("http://www.w3.org/2000/svg","text");
      t.textContent=i+1;
      t.setAttribute("x",v[1]);t.setAttribute("y",y);
      t.setAttribute("class","grid-label");
      gridLayer.appendChild(t);
    });
  }
}
renderGrid();
/* =============================== */

/* ===== ADMIN HORDE PAINT FIX ===== */
document.querySelectorAll(".hex").forEach(h=>{
  h.addEventListener("mousedown",e=>{
    if(!isAdmin||e.button!==0)return;
    h.setAttribute("class","hex "+currentType);
    hexMap.push({c:+h.dataset.col,r:+h.dataset.row,t:currentType});
    localStorage.setItem("hexMap",JSON.stringify(hexMap));
    renderFlags();
  });
});
/* ================================= */


/* ===== HORDE POPUP (KILL EDIT) ===== */
document.querySelectorAll(".hex").forEach(h=>{
  h.addEventListener("click", e=>{
    if(!isAdmin) return;
    if(!h.classList.contains("horde")) return;

    const key = h.dataset.col + "," + h.dataset.row;
    hordeData[key] = hordeData[key] || { kills: 0, last: null };

    popup.innerHTML = `<b>Horda ${key}</b><br>`;
    for(let i=1;i<=HORDE_MAX_KILLS;i++){
      const checked = i <= hordeData[key].kills ? "checked" : "";
      popup.innerHTML +=
        `<label><input type="checkbox" data-i="${i}" ${checked}> Kill ${i}</label><br>`;
    }
    popup.innerHTML += `<button id="closePopup">Zamknij</button>`;
    popup.classList.remove("hidden");

    popup.querySelectorAll("input").forEach(cb=>{
      cb.onchange = ()=>{
        const i = +cb.dataset.i;
        if(cb.checked){
          hordeData[key].kills = Math.max(hordeData[key].kills, i);
          hordeData[key].last = Date.now();
        } else {
          hordeData[key].kills = i - 1;
        }
        localStorage.setItem("hordeData", JSON.stringify(hordeData));
        renderFlags();
      };
    });

    document.getElementById("closePopup").onclick = ()=>{
      popup.classList.add("hidden");
    };
  });
});
/* ================================== */


/* ===== IMPORT COMPAT (RAW HEX ARRAY SUPPORT) ===== */
function importMap(e){
  const f = e.target.files[0];
  if(!f) return;

  const r = new FileReader();
  r.onload = () => {
    const d = JSON.parse(r.result);

    if (Array.isArray(d)) {
      hexMap = d;
      hordeData = {};
    } else {
      hexMap = d.hexMap || [];
      hordeData = d.hordeData || {};
    }

    localStorage.setItem("hexMap", JSON.stringify(hexMap));
    localStorage.setItem("hordeData", JSON.stringify(hordeData));

    document.querySelectorAll(".hex").forEach(h=>{
      h.setAttribute("class","hex land");
    });

    hexMap.forEach(cell=>{
      const h = document.querySelector(
        `.hex[data-col="${cell.c}"][data-row="${cell.r}"]`
      );
      if(h) h.setAttribute("class","hex "+cell.t);
    });

    renderFlags();
  };
  r.readAsText(f);
}
/* ================================================ */


/* ===== SECTOR + SORTED HORDE LIST (SAFE OVERRIDE) ===== */

function sectorFromColRow(c, r){
  const colSize = COLS / 9;
  const rowSize = ROWS / 9;
  const colIdx = Math.min(8, Math.floor(c / colSize));
  const rowIdx = Math.min(8, Math.floor(r / rowSize));
  return String.fromCharCode(65 + colIdx) + (rowIdx + 1);
}

// override list renderer
function renderHordeList(){
  hordeItems.innerHTML = "";

  const hordes = [];

  document.querySelectorAll(".hex.horde").forEach(h=>{
    const c = +h.dataset.col;
    const r = +h.dataset.row;
    const key = c + "," + r;
    const d = hordeData[key] || { kills: 0, last: null };

    const alive = isAlive(d);
    const remaining = alive ? 0 : remain(d);

    hordes.push({
      sector: sectorFromColRow(c, r),
      kills: d.kills,
      alive,
      remaining
    });
  });

  hordes.sort((a,b)=>{
    if(a.alive && !b.alive) return -1;
    if(!a.alive && b.alive) return 1;
    return a.remaining - b.remaining;
  });

  hordes.forEach(h=>{
    let cls = "horde-alive";
    let status = "ALIVE";

    if(!h.alive){
      if(h.kills >= HORDE_MAX_KILLS){
        cls = "horde-dead";
        status = "DEAD";
      } else {
        cls = "horde-cooldown";
        status = fmt(h.remaining);
      }
    }

    const div = document.createElement("div");
    div.className = "horde-item " + cls;
    div.innerHTML = `<b>${h.sector}</b><br>${status} (${h.kills}/4)`;
    hordeItems.appendChild(div);
  });
}

/* ===================================================== */


/* ===== HORDE LIST SORT PRIORITY FIX ===== */
function renderHordeList(){
  hordeItems.innerHTML = "";

  const hordes = [];

  document.querySelectorAll(".hex.horde").forEach(h=>{
    const c = +h.dataset.col;
    const r = +h.dataset.row;
    const key = c + "," + r;
    const d = hordeData[key] || { kills: 0, last: null };

    const alive = isAlive(d);
    const dead = d.kills >= HORDE_MAX_KILLS;
    const remaining = (!alive && !dead) ? remain(d) : 0;

    // priority: 0=cooldown, 1=alive, 2=dead
    let priority = 1;
    if(!alive && !dead) priority = 0;
    if(dead) priority = 2;

    hordes.push({
      sector: sectorFromColRow(c, r),
      kills: d.kills,
      alive,
      dead,
      remaining,
      priority
    });
  });

  hordes.sort((a,b)=>{
    if(a.priority !== b.priority) return a.priority - b.priority;
    if(a.priority === 0) return a.remaining - b.remaining; // cooldown: soonest first
    return 0;
  });

  hordes.forEach(h=>{
    let cls = "horde-alive";
    let status = "ALIVE";

    if(h.priority === 0){
      cls = "horde-cooldown";
      status = fmt(h.remaining);
    } else if(h.priority === 2){
      cls = "horde-dead";
      status = "DEAD";
    }

    const div = document.createElement("div");
    div.className = "horde-item " + cls;
    div.innerHTML = `<b>${h.sector}</b><br>${status} (${h.kills}/4)`;
    hordeItems.appendChild(div);
  });
}
/* ====================================== */


/* ===== SECTOR HOVER LOGIC ===== */
const sectorOverlays = {};

function buildSectorOverlays(){
  const usableW = MAP_W - 2 * PAD;
  const usableH = MAP_H - 2 * PAD;

  for(let col=0; col<9; col++){
    for(let row=0; row<9; row++){
      const x = PAD + col * usableW / 9;
      const y = PAD + row * usableH / 9;
      const w = usableW / 9;
      const h = usableH / 9;

      const r = document.createElementNS("http://www.w3.org/2000/svg","rect");
      r.setAttribute("x", x);
      r.setAttribute("y", y);
      r.setAttribute("width", w);
      r.setAttribute("height", h);
      r.setAttribute("class", "sector-highlight");
      r.style.display = "none";

      const key = String.fromCharCode(65 + col) + (row + 1);
      sectorOverlays[key] = r;
      gridLayer.appendChild(r);
    }
  }
}

buildSectorOverlays();

const _renderHordeList = renderHordeList;
renderHordeList = function(){
  _renderHordeList();

  document.querySelectorAll("#hordeItems .horde-item").forEach(item => {
    const sector = item.querySelector("b")?.innerText;
    if(!sector) return;

    item.addEventListener("mouseenter", () => {
      if(sectorOverlays[sector]) sectorOverlays[sector].style.display = "block";
    });

    item.addEventListener("mouseleave", () => {
      if(sectorOverlays[sector]) sectorOverlays[sector].style.display = "none";
    });
  });
};
/* ================================ */


// === AUTO LOAD DEFAULT MAP (GitHub Pages safe) ===
document.addEventListener("DOMContentLoaded", () => {
  fetch("map.json")
    .then(r => r.json())
    .then(data => {
      if (typeof renderMapFromJson === "function") {
        renderMapFromJson(data);
      } else {
        console.error("renderMapFromJson() not found");
      }
    })
    .catch(err => console.error("Map load error:", err));
});
