import { Router } from "express";
import { prisma } from "../config/prisma";
import { authJwtMiddleware } from "../middlewares/authJwtMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const logViewerRoutes = Router();

logViewerRoutes.use("/api-logs", authJwtMiddleware);
logViewerRoutes.use("/logs", authJwtMiddleware);

logViewerRoutes.get("/api-logs", asyncHandler(async (_req, res) => {
  const logs = await prisma.requestLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const parsed = logs.map((l) => ({
    id: l.id,
    timestamp: l.createdAt.toISOString(),
    method: l.method,
    path: l.path,
    status: l.status,
    durationMs: l.durationMs,
    query: JSON.parse(l.query),
    body: JSON.parse(l.body),
    headers: JSON.parse(l.headers),
    responseBody: JSON.parse(l.responseBody),
  }));
  res.json(parsed);
}));

logViewerRoutes.delete("/api-logs", asyncHandler(async (_req, res) => {
  await prisma.requestLog.deleteMany();
  res.json({ ok: true });
}));

logViewerRoutes.get("/logs", (_req, res) => {
  res.removeHeader("Content-Security-Policy");
  res.setHeader("Content-Type", "text/html");
  res.send(PAGE_HTML);
});

const PAGE_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>WA Restaurant - Request Logs</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d1117;color:#c9d1d9;font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:13px}
#hdr{background:#161b22;padding:12px 20px;border-bottom:1px solid #21262d;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
#hdr h1{font-size:14px;color:#58a6ff;font-weight:600}
#hdr .controls{display:flex;gap:10px;align-items:center}
#hdr button{background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;font-family:inherit}
#hdr button:hover{background:#30363d}
.btn-danger{background:#21090d!important;border-color:#f8514950!important;color:#f85149!important}
.btn-danger:hover{background:#381818!important}
#login-overlay{display:none;position:fixed;inset:0;background:#0d1117;z-index:100;align-items:center;justify-content:center;flex-direction:column}
#login-overlay h2{color:#58a6ff;font-size:16px;margin-bottom:16px}
#login-overlay p{color:#8b949e;font-size:12px;margin-bottom:20px;max-width:400px;text-align:center;line-height:1.6}
#login-form{display:flex;flex-direction:column;gap:10px;width:360px}
#token-input{background:#161b22;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:8px 12px;font-family:inherit;font-size:13px;outline:none}
#token-input:focus{border-color:#58a6ff}
#login-form button{background:#1f6feb;color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:13px;font-family:inherit}
#login-form button:hover{background:#388bfd}
.live{display:flex;align-items:center;gap:6px;font-size:12px;color:#3fb950}
.dot{width:8px;height:8px;border-radius:50%;background:#3fb950;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
#stats{padding:8px 20px;background:#0d1117;border-bottom:1px solid #21262d;display:flex;gap:20px;font-size:11px;color:#8b949e}
#logs{padding:10px}
.entry{background:#161b22;border:1px solid #21262d;border-radius:8px;margin-bottom:8px;overflow:hidden;cursor:pointer;transition:border-color .15s}
.entry:hover{border-color:#30363d}
.entry.open{border-color:#58a6ff}
.summary{padding:10px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.method{font-weight:700;font-size:12px;padding:2px 8px;border-radius:4px;min-width:50px;text-align:center}
.GET{background:#0a2010;color:#3fb950;border:1px solid #1a4020}
.POST{background:#1a1400;color:#d29922;border:1px solid #4a3800}
.PUT{background:#0d1433;color:#58a6ff;border:1px solid #1e3a5f}
.DELETE{background:#180c0c;color:#f85149;border:1px solid #381818}
.path{color:#79c0ff;flex:1;min-width:120px}
.status{font-weight:700;padding:2px 8px;border-radius:4px;font-size:11px}
.s2xx{background:#0a2010;color:#3fb950}
.s4xx{background:#180c0c;color:#f85149}
.s5xx{background:#2d1300;color:#f0883e}
.time{color:#8b949e;font-size:11px;min-width:60px;text-align:right}
.dur{color:#8b949e;font-size:11px}
.detail{display:none;padding:0 14px 14px;border-top:1px solid #21262d}
.entry.open .detail{display:block}
.section{margin-top:10px}
.section-title{font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
pre.json{background:#010409;border:1px solid #21262d;border-radius:6px;padding:10px 12px;overflow-x:auto;font-size:12px;line-height:1.6;color:#c9d1d9;max-height:300px;overflow-y:auto}
pre.json::-webkit-scrollbar{width:4px;height:4px}
pre.json::-webkit-scrollbar-thumb{background:#30363d;border-radius:4px}
.empty{text-align:center;padding:60px 20px;color:#484f58}
.filter{display:flex;gap:6px}
.filter button.on{background:#1f6feb;border-color:#1f6feb;color:#fff}
</style>
</head>
<body>
<div id="login-overlay">
  <h2>WA Restaurant — Logs</h2>
  <p>Acesso restrito. Cole o token JWT do painel admin<br>ou acesse via <code style="color:#79c0ff">/logs?token=SEU_JWT</code></p>
  <form id="login-form">
    <input id="token-input" type="password" placeholder="Cole o JWT token aqui..." autocomplete="off" />
    <button type="submit">Entrar</button>
  </form>
</div>
<div id="hdr">
  <h1>WA Restaurant - Request Logs</h1>
  <div class="controls">
    <div class="filter">
      <button class="on" data-f="all">Todos</button>
      <button data-f="/api/">API</button>
      <button data-f="err">Erros</button>
    </div>
    <button class="btn-danger" id="btnClear">Limpar</button>
    <div class="live"><span class="dot"></span> Live</div>
  </div>
</div>
<div id="stats"></div>
<div id="logs"></div>
<script>
var allLogs=[];
var filter='all';
var pollTimer=null;

// Token resolution: URL ?token= param > localStorage wa_token (same origin) > show login form
function getTokenFromUrl(){
  var params=new URLSearchParams(window.location.search);
  return params.get('token');
}
var jwt=getTokenFromUrl()||localStorage.getItem('wa_token')||null;
if(jwt)localStorage.setItem('wa_token',jwt);
var authHeaders=jwt?{'Authorization':'Bearer '+jwt}:{};

function showLoginForm(){
  document.getElementById('hdr').style.display='none';
  document.getElementById('stats').style.display='none';
  document.getElementById('logs').innerHTML='';
  document.getElementById('login-overlay').style.display='flex';
}

function hideLoginForm(){
  document.getElementById('hdr').style.display='';
  document.getElementById('stats').style.display='';
  document.getElementById('login-overlay').style.display='none';
}

document.getElementById('login-form').onsubmit=function(e){
  e.preventDefault();
  var val=document.getElementById('token-input').value.trim();
  if(!val)return;
  jwt=val;
  localStorage.setItem('wa_token',jwt);
  authHeaders={'Authorization':'Bearer '+jwt};
  hideLoginForm();
  startPolling();
};

document.querySelectorAll('.filter button[data-f]').forEach(function(b){
  b.onclick=function(){
    document.querySelectorAll('.filter button[data-f]').forEach(function(x){x.classList.remove('on')});
    b.classList.add('on');
    filter=b.getAttribute('data-f');
    render();
  };
});

document.getElementById('btnClear').onclick=function(){
  if(!confirm('Limpar todos os logs?'))return;
  fetch('/api-logs',{method:'DELETE',headers:authHeaders}).then(function(){allLogs=[];render()});
};

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

function pretty(obj){
  try{var s=JSON.stringify(obj,null,2);return esc(s);}catch(e){return esc(String(obj))}
}

function statusClass(s){if(s>=500)return 's5xx';if(s>=400)return 's4xx';return 's2xx'}

function render(){
  var filtered=allLogs.filter(function(l){
    if(filter==='all')return true;
    if(filter==='/api/')return l.path.indexOf('/api/')>=0;
    if(filter==='err')return l.status>=400;
    return true;
  });
  var total=allLogs.length;
  var ok=allLogs.filter(function(l){return l.status<400}).length;
  var err=total-ok;
  document.getElementById('stats').innerHTML=
    '<span>Total: <b>'+total+'</b></span> '+
    '<span style="color:#3fb950">OK: <b>'+ok+'</b></span> '+
    '<span style="color:#f85149">Erros: <b>'+err+'</b></span>';
  if(filtered.length===0){
    document.getElementById('logs').innerHTML='<div class="empty"><div style="font-size:32px">Sem logs</div><div style="margin-top:6px;font-size:11px;color:#6e7681">As requisicoes vao aparecer aqui em tempo real</div></div>';
    return;
  }
  var html='';
  for(var i=0;i<filtered.length;i++){
    var l=filtered[i];
    var t=new Date(l.timestamp);
    var time=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0')+':'+String(t.getSeconds()).padStart(2,'0');
    var hasBody=l.body&&typeof l.body==='object'&&Object.keys(l.body).length>0;
    var hasQuery=l.query&&typeof l.query==='object'&&Object.keys(l.query).length>0;
    var hasResp=l.responseBody&&typeof l.responseBody==='object'&&Object.keys(l.responseBody).length>0;
    html+='<div class="entry" onclick="this.classList.toggle(\'open\')">';
    html+='<div class="summary">';
    html+='<span class="method '+l.method+'">'+l.method+'</span>';
    html+='<span class="path">'+esc(l.path)+'</span>';
    html+='<span class="status '+statusClass(l.status)+'">'+l.status+'</span>';
    html+='<span class="dur">'+l.durationMs+'ms</span>';
    html+='<span class="time">'+time+'</span>';
    html+='</div>';
    html+='<div class="detail">';
    html+='<div class="section"><div class="section-title">Headers</div><pre class="json">'+pretty(l.headers)+'</pre></div>';
    if(hasQuery) html+='<div class="section"><div class="section-title">Query Params</div><pre class="json">'+pretty(l.query)+'</pre></div>';
    if(hasBody) html+='<div class="section"><div class="section-title">Request Body</div><pre class="json">'+pretty(l.body)+'</pre></div>';
    if(hasResp) html+='<div class="section"><div class="section-title">Response</div><pre class="json">'+pretty(l.responseBody)+'</pre></div>';
    html+='</div></div>';
  }
  document.getElementById('logs').innerHTML=html;
}

function poll(){
  if(!jwt){showLoginForm();return;}
  fetch('/api-logs',{headers:authHeaders}).then(function(r){
    if(r.status===401){jwt=null;localStorage.removeItem('wa_token');authHeaders={};showLoginForm();return null;}
    if(!r.ok)throw r;
    return r.json();
  }).then(function(data){
    if(data){allLogs=data;render();}
  }).catch(function(){});
  pollTimer=setTimeout(poll,3000);
}

function startPolling(){
  if(pollTimer)clearTimeout(pollTimer);
  poll();
}

if(!jwt){showLoginForm();}else{startPolling();}
</script>
</body>
</html>`;

export { logViewerRoutes };
