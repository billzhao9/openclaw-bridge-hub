export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><title>OpenClaw Hub Manager</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh}
a{color:#58a6ff}
h1{font-size:22px;font-weight:700;color:#58a6ff}
h2{font-size:15px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
.hidden{display:none!important}

/* Login */
#login-view{display:flex;align-items:center;justify-content:center;min-height:100vh}
.login-box{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:40px 36px;width:340px}
.login-box h1{margin-bottom:24px;text-align:center}
.field{margin-bottom:16px}
.field label{display:block;font-size:13px;color:#8b949e;margin-bottom:6px}
.field input{width:100%;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:9px 12px;color:#c9d1d9;font-size:14px;outline:none}
.field input:focus{border-color:#58a6ff}
.btn{padding:9px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:opacity .15s}
.btn:hover{opacity:.85}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-primary{background:#238636;color:#fff}
.btn-danger{background:#da3633;color:#fff}
.btn-warn{background:#9e6a03;color:#fff}
.btn-muted{background:#21262d;color:#c9d1d9;border:1px solid #30363d}
.btn-blue{background:#1f6feb;color:#fff}
.btn-full{width:100%}
#login-error{color:#f85149;font-size:13px;margin-top:12px;text-align:center;min-height:18px}

/* Dashboard */
#dashboard-view{padding:24px;max-width:1400px;margin:0 auto}
.top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #21262d}
.top-bar-right{display:flex;gap:10px;align-items:center}
.refresh-info{font-size:12px;color:#8b949e}

/* Grid */
.section{margin-bottom:32px}
.machine-group{margin-bottom:20px}
.machine-label{font-size:12px;color:#8b949e;margin-bottom:8px;padding:4px 8px;background:#161b22;border-radius:4px;display:inline-block}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:14px;transition:border-color .2s}
.card:hover{border-color:#58a6ff44}
.card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.card-name{font-size:15px;font-weight:600;color:#e6edf3}
.card-id{font-size:11px;color:#8b949e;margin-top:2px}
.status-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.status-dot.online{background:#3fb950}
.status-dot.offline{background:#f85149}
.badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.badge{font-size:11px;padding:2px 8px;border-radius:6px;white-space:nowrap}
.badge.ok{background:#1a3a2a;color:#3fb950;border:1px solid #2ea04333}
.badge.err{background:#3a1a1a;color:#f85149;border:1px solid #f8514933}
.badge.warn{background:#3a2a00;color:#d29922;border:1px solid #d2992233}
.badge.info{background:#1a2a3a;color:#58a6ff;border:1px solid #58a6ff33}
.card-stats{font-size:12px;color:#8b949e;margin-bottom:10px;line-height:1.7}
.card-stats span{color:#c9d1d9}
.card-actions{display:flex;gap:6px;flex-wrap:wrap}
.card-actions .btn{padding:6px 12px;font-size:12px}

/* Chat panel */
.chat-panel{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px}
.chat-controls{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.chat-controls select{flex:1;min-width:160px;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:8px 10px;color:#c9d1d9;font-size:13px;outline:none}
.chat-controls select:focus{border-color:#58a6ff}
.chat-input-row{display:flex;gap:8px}
.chat-input-row input{flex:1;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:8px 12px;color:#c9d1d9;font-size:13px;outline:none}
.chat-input-row input:focus{border-color:#58a6ff}
#chat-history{background:#0d1117;border-radius:8px;padding:12px;min-height:120px;max-height:280px;overflow-y:auto;font-family:monospace;font-size:12px;line-height:1.6;margin-top:10px}
.chat-msg{margin-bottom:8px}
.chat-msg .who{color:#58a6ff;font-weight:600}
.chat-msg .reply{color:#3fb950}
.chat-msg .err-msg{color:#f85149}
.chat-msg .ts{color:#484f58;font-size:11px;margin-left:6px}
.typing-dots{color:#8b949e;font-style:italic}
.typing-dots span{animation:blink 1.4s infinite both}
.typing-dots span:nth-child(2){animation-delay:.2s}
.typing-dots span:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,80%,100%{opacity:0}40%{opacity:1}}
.manager-warn{background:#9e6a03;color:#fff;padding:8px 14px;border-radius:6px;margin-bottom:12px;font-size:13px}
.file-upload-btn{cursor:pointer;font-size:16px;padding:6px 10px;display:inline-flex;align-items:center}
.file-preview{padding:8px;margin-top:6px;background:#161b22;border:1px solid #30363d;border-radius:6px;position:relative}
.file-preview img{max-height:100px;border-radius:4px}
.file-preview .remove-file{position:absolute;top:4px;right:8px;cursor:pointer;color:#f85149;font-weight:bold}
.hidden{display:none !important}

/* Activity log */
#log{background:#0d1117;border-radius:8px;padding:12px;max-height:180px;overflow-y:auto;font-family:monospace;font-size:12px;line-height:1.6;color:#8b949e}
.log-line{margin-bottom:2px}
.log-line .log-ts{color:#484f58}
.log-line .log-ok{color:#3fb950}
.log-line .log-err{color:#f85149}
.log-line .log-info{color:#58a6ff}

/* Spinner */
.spinner{display:inline-block;width:12px;height:12px;border:2px solid #30363d;border-top-color:#58a6ff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:4px}
@keyframes spin{to{transform:rotate(360deg)}}

/* Log modal */
.log-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:1000;display:flex;align-items:center;justify-content:center}
.log-modal{background:#161b22;border:1px solid #58a6ff;border-radius:10px;padding:20px;width:90%;max-width:800px;max-height:80vh;display:flex;flex-direction:column}
.log-modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.log-modal-header h3{font-size:15px;color:#e6edf3;margin:0}
.log-modal-close{color:#8b949e;cursor:pointer;font-size:20px;background:none;border:none;padding:4px 8px}
.log-modal-close:hover{color:#f85149}
.log-modal-actions{display:flex;gap:8px;align-items:center;margin-bottom:10px}
.log-modal-actions .meta{font-size:11px;color:#8b949e}
.log-content{background:#0d1117;border-radius:8px;padding:12px;font-family:monospace;font-size:12px;line-height:1.7;overflow-y:auto;flex:1;white-space:pre-wrap;color:#8b949e}
</style>
</head><body>

<div id="login-view">
  <div class="login-box">
    <h1>Hub Manager</h1>
    <div class="field">
      <label>Username</label>
      <input type="text" id="login-user" placeholder="admin" autocomplete="username">
    </div>
    <div class="field">
      <label>Password</label>
      <input type="password" id="login-pass" placeholder="password" autocomplete="current-password">
    </div>
    <button class="btn btn-primary btn-full" onclick="doLogin()" id="login-btn">Sign in</button>
    <div id="login-error"></div>
  </div>
</div>

<div id="dashboard-view" class="hidden">
  <div class="top-bar">
    <h1>OpenClaw Hub Manager</h1>
    <div class="top-bar-right">
      <span class="refresh-info" id="refresh-info">Refreshing every 10s</span>
      <button class="btn btn-muted" onclick="refreshDashboard()">Refresh</button>
      <button class="btn btn-danger" onclick="doLogout()">Logout</button>
    </div>
  </div>

  <div class="section">
    <h2>Agents</h2>
    <div id="agent-grid" class="grid"></div>
    <div id="no-agents" class="hidden" style="color:#8b949e;font-size:14px;padding:12px 0">No agents registered.</div>
  </div>

  <div class="section">
    <h2>Chat</h2>
    <div class="chat-panel">
      <div class="chat-controls">
        <select id="chat-agent" onchange="updateFileUploadTooltip()"><option value="">-- select agent --</option></select>
        <button class="btn btn-muted" onclick="clearChat()" title="Clear chat history">Clear</button>
      </div>
      <div class="chat-input-row">
        <label class="file-upload-btn btn btn-muted" title="Attach image">
          <input type="file" id="chat-file" accept="image/*" onchange="previewFile(this)" hidden>
          📎
        </label>
        <input type="text" id="chat-msg" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendChat()">
        <button class="btn btn-blue" onclick="sendChat()" id="chat-btn">Send</button>
      </div>
      <div id="chat-file-preview" class="file-preview hidden"></div>
      <div id="chat-history"></div>
    </div>
  </div>

  <div class="section">
    <h2>Activity Log</h2>
    <div id="log"></div>
  </div>
</div>

<script>
var _dashData = null;

function doLogin() {
  var user = document.getElementById('login-user').value;
  var pass = document.getElementById('login-pass').value;
  var btn = document.getElementById('login-btn');
  var err = document.getElementById('login-error');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Signing in...';
  err.textContent = '';
  fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user: user, pass: pass})
  }).then(function(r) {
    if (r.ok) {
      showDashboard();
      refreshDashboard();
    } else {
      r.json().then(function(d) {
        err.textContent = d.error || 'Login failed';
      });
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  }).catch(function(e) {
    err.textContent = 'Network error: ' + e.message;
    btn.disabled = false;
    btn.textContent = 'Sign in';
  });
}

function doLogout() {
  fetch('/api/logout', {method: 'POST'}).then(function() {
    showLogin();
  });
}

function showLogin() {
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('dashboard-view').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
}

function refreshDashboard() {
  document.getElementById('refresh-info').innerHTML = '<span class="spinner"></span>Loading...';
  fetch('/api/dashboard').then(function(r) {
    if (r.status === 401) { showLogin(); return null; }
    return r.json();
  }).then(function(data) {
    if (!data) return;
    _dashData = data;
    renderDashboard(data);
    document.getElementById('refresh-info').textContent = 'Last refresh: ' + new Date().toLocaleTimeString();
  }).catch(function(e) {
    document.getElementById('refresh-info').textContent = 'Refresh error: ' + e.message;
  });
}

function renderDashboard(data) {
  var agents = data.agents || [];
  var hubConnected = data.hubConnected || [];
  var managerStatuses = data.managerStatuses || {};
  var grid = document.getElementById('agent-grid');
  var noAgents = document.getElementById('no-agents');
  var chatSel = document.getElementById('chat-agent');
  var prevChat = chatSel.value;

  // Show warning if machines have no Local Manager
  var machines = {};
  agents.forEach(function(a) { if (a.machineId) machines[a.machineId] = true; });
  var connectedManagers = managerStatuses.map ? managerStatuses.map(function(m) { return m.machineId; }) : [];
  var disconnectedMachines = Object.keys(machines).filter(function(m) { return connectedManagers.indexOf(m) === -1; });
  var warnEl = document.getElementById('manager-warning');
  if (!warnEl) {
    warnEl = document.createElement('div');
    warnEl.id = 'manager-warning';
    grid.parentNode.insertBefore(warnEl, grid);
  }
  if (disconnectedMachines.length > 0) {
    warnEl.innerHTML = '<div class="manager-warn">Local Manager not connected for: <b>' + disconnectedMachines.join(', ') + '</b>. Remote control (restart/stop) will not work until you start the Local Manager on those machines.</div>';
  } else {
    warnEl.innerHTML = '';
  }

  if (agents.length === 0) {
    grid.innerHTML = '';
    noAgents.classList.remove('hidden');
  } else {
    noAgents.classList.add('hidden');
    grid.innerHTML = agents.map(function(a) {
      var hubOnline = hubConnected.indexOf(a.agentId) !== -1;
      var discordOnline = a.discordStatus === 'online' || a.discordId;
      var mem = a.memMB ? a.memMB + 'MB' : '-';
      var hb = a.lastHeartbeat ? new Date(a.lastHeartbeat).toLocaleTimeString() : '-';
      var machineId = a.machineId || '';
      var mgrStatus = machineId ? managerStatuses[machineId] : null;
      return '<div class="card">' +
        '<div class="card-header">' +
          '<div>' +
            '<div class="card-name">' + esc(a.agentName || a.label || a.agentId) + ' <span style="font-size:11px;color:#8b949e;font-weight:400">(' + esc(a.agentId) + ')</span></div>' +
            (a.description ? '<div style="font-size:12px;color:#8b949e;margin-top:2px">' + esc(a.description) + '</div>' : '') +
            '<div class="card-id">' + (machineId ? esc(machineId) : '') + '</div>' +
          '</div>' +
          '<div class="status-dot ' + (hubOnline ? 'online' : 'offline') + '"></div>' +
        '</div>' +
        '<div class="badges">' +
          '<span class="badge ' + (hubOnline ? 'ok' : 'err') + '">' + (hubOnline ? 'Hub Connected' : 'Hub Offline') + '</span>' +
          '<span class="badge ' + (discordOnline ? 'ok' : 'err') + '">' + (discordOnline ? 'Discord OK' : 'No Discord') + '</span>' +
          (mgrStatus ? '<span class="badge info">Manager: ' + esc(mgrStatus) + '</span>' : '') +
        '</div>' +
        '<div class="card-stats">' +
          'Memory: <span>' + mem + '</span> &nbsp; Heartbeat: <span>' + hb + '</span>' +
          (a.role ? ' &nbsp; Role: <span>' + esc(a.role) + '</span>' : '') +
        '</div>' +
        '<div class="card-actions">' +
          (hubOnline ? '<button class="btn btn-blue" data-agent="' + esc(a.agentId) + '" onclick="chatWith(this.dataset.agent)">Chat</button>' : '') +
          '<button class="btn btn-muted" data-agent="' + esc(a.agentId) + '" data-name="' + esc(a.agentName || a.agentId) + '" onclick="showLogs(this.dataset.agent, this.dataset.name)">Logs</button>' +
          '<button class="btn btn-warn" data-machine="' + esc(machineId || '') + '" data-agent="' + esc(a.agentId) + '" data-action="restart" onclick="controlBtn(this)">Restart</button>' +
          '<button class="btn btn-danger" data-machine="' + esc(machineId || '') + '" data-agent="' + esc(a.agentId) + '" data-action="stop" onclick="controlBtn(this)">Stop</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // Update chat agent selector
  chatSel.innerHTML = '<option value="">-- select agent --</option>' +
    agents.filter(function(a) { return hubConnected.indexOf(a.agentId) !== -1; })
      .map(function(a) {
        return '<option value="' + esc(a.agentId) + '"' + (a.agentId === prevChat ? ' selected' : '') + '>' + esc(a.label || a.agentId) + '</option>';
      }).join('');
}

function controlBtn(el) {
  control(el.dataset.machine, el.dataset.agent, el.dataset.action);
}

function clearChat() {
  document.getElementById('chat-history').innerHTML = '';
  log('Chat history cleared', 'info');
}

var _pendingImage = null; // base64 data URL

function previewFile(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    _pendingImage = e.target.result;
    var preview = document.getElementById('chat-file-preview');
    preview.classList.remove('hidden');
    preview.innerHTML = '<img src="' + _pendingImage + '"> <span class="remove-file" onclick="removeFile()">✕</span> <span style="font-size:12px;color:#8b949e">' + esc(file.name) + '</span>';
  };
  reader.readAsDataURL(file);
}

function removeFile() {
  _pendingImage = null;
  document.getElementById('chat-file-preview').classList.add('hidden');
  document.getElementById('chat-file-preview').innerHTML = '';
  document.getElementById('chat-file').value = '';
}

function chatWith(agentId) {
  var sel = document.getElementById('chat-agent');
  sel.value = agentId;
  document.getElementById('chat-msg').focus();
  // Scroll chat panel into view
  sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Track agent states for restart detection
var _prevAgentStates = {};

function control(machineId, agentId, action) {
  if (!machineId) { log('No machineId for ' + agentId, 'err'); return; }

  // Check if machine has a connected Local Manager
  var ms = _dashData ? (_dashData.managerStatuses || []) : [];
  var hasManager = ms.some(function(m) { return m.machineId === machineId; });
  if (!hasManager) {
    log('Machine "' + machineId + '" has no Local Manager connected. Start the Local Manager on that machine first.', 'err');
    return;
  }

  log('Sending ' + action + ' for ' + agentId + ' on ' + machineId + '...', 'info');
  fetch('/api/control', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({machineId: machineId, action: action, target: agentId})
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.error) {
      log(action + ' failed: ' + d.error, 'err');
    } else {
      log(action + ' command sent to ' + agentId + '. Waiting for result...', 'info');
      // Track state for verification
      if (action === 'restart') {
        _prevAgentStates[agentId] = { action: 'restart', sentAt: Date.now() };
      }
      setTimeout(function() {
        refreshDashboard();
        // Check result after refresh
        setTimeout(function() {
          if (_prevAgentStates[agentId]) {
            log(agentId + ' restart completed successfully', 'ok');
            delete _prevAgentStates[agentId];
          }
        }, 2000);
      }, 5000);
    }
  }).catch(function(e) { log('Control failed: ' + e.message, 'err'); });
}

function sendChat() {
  var agentId = document.getElementById('chat-agent').value;
  var msg = document.getElementById('chat-msg').value.trim();
  if (!agentId) { log('Select an agent first', 'err'); return; }
  if (!msg) return;
  var btn = document.getElementById('chat-btn');
  btn.disabled = true;
  document.getElementById('chat-msg').value = '';
  var hasImage = !!_pendingImage;
  var displayMsg = msg + (hasImage ? ' [+ image]' : '');
  appendChat(agentId, displayMsg, null);
  if (hasImage) {
    var h2 = document.getElementById('chat-history');
    h2.innerHTML += '<div class="chat-msg"><img src="' + _pendingImage + '" style="max-height:80px;border-radius:4px;margin:4px 0"></div>';
  }
  // Show typing indicator
  var typingId = 'typing-' + Date.now();
  var h = document.getElementById('chat-history');
  h.innerHTML += '<div id="' + typingId + '" class="chat-msg typing"><span class="who reply">' + esc(agentId) + '</span> <span class="typing-dots">is thinking<span>.</span><span>.</span><span>.</span></span></div>';
  h.scrollTop = h.scrollHeight;
  var chatBody = {agentId: agentId, message: msg};
  if (hasImage) chatBody.image = _pendingImage;
  removeFile();
  fetch('/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(chatBody)
  }).then(function(r) { return r.json(); }).then(function(d) {
    var el = document.getElementById(typingId); if (el) el.remove();
    appendChat(agentId, null, d.response);
    btn.disabled = false;
  }).catch(function(e) {
    var el = document.getElementById(typingId); if (el) el.remove();
    appendChat(agentId, null, 'Error: ' + e.message);
    btn.disabled = false;
  });
}

function appendChat(agentId, sent, received) {
  var h = document.getElementById('chat-history');
  var ts = new Date().toLocaleTimeString();
  if (sent !== null) {
    h.innerHTML += '<div class="chat-msg"><span class="who">manager → ' + esc(agentId) + '</span><span class="ts">' + ts + '</span><br>' + esc(sent) + '</div>';
  }
  if (received !== null) {
    var cls = (received && received.startsWith('Error:')) ? 'err-msg' : 'reply';
    h.innerHTML += '<div class="chat-msg"><span class="who reply">' + esc(agentId) + ' → manager</span><span class="ts">' + ts + '</span><br><span class="' + cls + '">' + esc(received) + '</span></div>';
  }
  h.scrollTop = h.scrollHeight;
}

function log(msg, type) {
  var l = document.getElementById('log');
  var ts = new Date().toLocaleTimeString();
  var cls = type === 'ok' ? 'log-ok' : type === 'err' ? 'log-err' : 'log-info';
  l.innerHTML += '<div class="log-line"><span class="log-ts">[' + ts + ']</span> <span class="' + cls + '">' + esc(msg) + '</span></div>';
  l.scrollTop = l.scrollHeight;
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showLogs(agentId, agentName) {
  var overlay = document.createElement('div');
  overlay.className = 'log-overlay';
  overlay.id = 'log-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) closeLogs(); };
  overlay.innerHTML = '<div class="log-modal">' +
    '<div class="log-modal-header"><h3>' + esc(agentName) + ' (' + esc(agentId) + ') \u2014 Logs</h3>' +
    '<button class="log-modal-close" onclick="closeLogs()">\u2715</button></div>' +
    '<div class="log-modal-actions"><button class="btn btn-primary" onclick="refreshLogs(&quot;' + esc(agentId) + '&quot;)">Refresh</button>' +
    '<span class="meta" id="log-meta">Loading...</span></div>' +
    '<div class="log-content" id="log-content">Loading logs...</div></div>';
  document.body.appendChild(overlay);
  refreshLogs(agentId);
}

function closeLogs() {
  var el = document.getElementById('log-overlay');
  if (el) el.remove();
}

function refreshLogs(agentId) {
  var content = document.getElementById('log-content');
  var meta = document.getElementById('log-meta');
  if (meta) meta.textContent = 'Loading...';
  fetch('/api/logs/' + agentId).then(function(r) { return r.json(); }).then(function(d) {
    if (d.error) { content.textContent = 'Error: ' + d.error; return; }
    content.innerHTML = colorizeLogs(d.logs || '(no logs available)');
    content.scrollTop = content.scrollHeight;
    if (meta) meta.textContent = 'Last 100 lines \u00b7 via Local Manager \u00b7 ' + new Date().toLocaleTimeString();
  }).catch(function(e) { content.textContent = 'Failed to load logs: ' + e.message; });
}

function colorizeLogs(text) {
  return text.split(String.fromCharCode(10)).map(function(line) {
    if (/error|Error|ERR|fatal|FATAL/i.test(line)) return '<span style="color:#f85149">' + esc(line) + '</span>';
    if (/warn|Warning|WARN/i.test(line)) return '<span style="color:#d29922">' + esc(line) + '</span>';
    if (/start|Start|ready|Ready|listen|connected/i.test(line)) return '<span style="color:#3fb950">' + esc(line) + '</span>';
    if (/info|Info|loaded|plugin/i.test(line)) return '<span style="color:#58a6ff">' + esc(line) + '</span>';
    return esc(line);
  }).join(String.fromCharCode(10));
}

function updateFileUploadTooltip() {
  var agentId = document.getElementById('chat-agent').value;
  var label = document.querySelector('.file-upload-btn');
  if (!agentId || !_dashData) { label.title = 'Attach image'; return; }
  var agent = (_dashData.agents || []).find(function(a) { return a.agentId === agentId; });
  if (agent && agent.supportsVision) {
    label.title = 'Image will be sent to model';
  } else {
    label.title = 'Image will be saved to agent workspace';
  }
}

// On load: try dashboard to see if already authenticated
fetch('/api/dashboard').then(function(r) {
  if (r.ok) {
    return r.json().then(function(data) {
      _dashData = data;
      showDashboard();
      renderDashboard(data);
    });
  }
  // Not authenticated, stay on login
}).catch(function() {});

// Auto-refresh every 10 seconds when dashboard is visible
setInterval(function() {
  if (!document.getElementById('dashboard-view').classList.contains('hidden')) {
    refreshDashboard();
  }
}, 10000);

// Allow Enter key on login form
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('login-pass').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('login-user').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('login-pass').focus();
  });
});
</script>
</body></html>`;
}
