// Stakan Liga — online server.
// Serves the game page and relays messages between players in 4-letter rooms.
// The room owner's browser runs the match; this server only passes messages along.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 4;
const INDEX_PATH = path.join(__dirname, 'public', 'index.html');

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  if (url !== '/' && url !== '/index.html') { res.writeHead(302, { Location: '/' }); res.end(); return; }
  fs.readFile(INDEX_PATH, (err, data) => {
    if (err) { res.writeHead(500); res.end('index.html topilmadi'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    let html = data.toString('utf8');
    // the page file is a body fragment (it is also published as a Claude artifact): give it a full document shell
    if (!/^\s*<!doctype/i.test(html)) {
      html = '<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + html + '</body></html>';
    }
    res.end(html);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
const rooms = new Map();
let nextId = 1;

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  let c;
  do { c = ''; for (let i = 0; i < 4; i++) c += LETTERS[Math.floor(Math.random() * LETTERS.length)]; } while (rooms.has(c));
  return c;
}
function cleanName(s) {
  const n = String(s || '').replace(/[^\p{L}\p{N} _'.-]/gu, '').trim().slice(0, 12);
  return n || "O'yinchi";
}
function send(ws, obj) {
  if (ws.readyState === 1) ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj));
}
function members(room) {
  return [...room.members.values()].map(m => ({ id: m.id, name: m.name, team: m.team }));
}
function broadcastLobby(room) {
  const msg = JSON.stringify({ t: 'lobby', code: room.code, host: room.host, sport: room.sport, diff: room.diff, started: room.started, members: members(room) });
  for (const m of room.members.values()) send(m.ws, msg);
}

wss.on('connection', ws => {
  const me = { id: nextId++, ws, name: '', team: 0, room: null };
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', buf => {
    let m;
    try { m = JSON.parse(buf); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    const room = me.room;

    switch (m.t) {
      case 'create': {
        if (room) return;
        me.name = cleanName(m.name);
        const r = { code: newCode(), host: me.id, members: new Map(), sport: 'vb', diff: 'orta', started: false };
        r.members.set(me.id, me); me.room = r; me.team = 0;
        rooms.set(r.code, r);
        send(ws, { t: 'joined', you: me.id, code: r.code });
        broadcastLobby(r);
        break;
      }
      case 'join': {
        if (room) return;
        const r = rooms.get(String(m.code || '').toUpperCase());
        if (!r) { send(ws, { t: 'err', m: 'Bunday xona topilmadi. Kodni tekshiring.' }); return; }
        if (r.members.size >= MAX_PLAYERS) { send(ws, { t: 'err', m: "Xona to'la (4 kishi)." }); return; }
        if (r.started) { send(ws, { t: 'err', m: "O'yin allaqachon boshlangan. Tugashini kuting." }); return; }
        me.name = cleanName(m.name);
        const teamA = [...r.members.values()].filter(x => x.team === 0).length;
        me.team = teamA > r.members.size - teamA ? 1 : 0;
        r.members.set(me.id, me); me.room = r;
        send(ws, { t: 'joined', you: me.id, code: r.code });
        broadcastLobby(r);
        break;
      }
      case 'team':
        if (room && !room.started) { me.team = m.team ? 1 : 0; broadcastLobby(room); }
        break;
      case 'cfg':
        if (room && room.host === me.id && !room.started) {
          if (['vb', 'bm', 'tt', 'bb'].includes(m.sport)) room.sport = m.sport;
          if (['oson', 'orta', 'qiyin'].includes(m.diff)) room.diff = m.diff;
          broadcastLobby(room);
        }
        break;
      case 'start':
        if (room && room.host === me.id && !room.started) {
          room.started = true;
          const msg = JSON.stringify({ t: 'start', sport: room.sport, diff: room.diff, members: members(room) });
          for (const x of room.members.values()) send(x.ws, msg);
          broadcastLobby(room);
        }
        break;
      case 'end':
        if (room && room.host === me.id) { room.started = false; broadcastLobby(room); }
        break;
      case 'in': // a player's own movement and clicks -> room owner
        if (room && room.started && room.host !== me.id) {
          const host = room.members.get(room.host);
          if (host) { m.from = me.id; send(host.ws, m); }
        }
        break;
      case 'st': // the room owner's match snapshot -> everyone else
        if (room && room.host === me.id) {
          const s = JSON.stringify(m);
          for (const x of room.members.values()) if (x.id !== me.id) send(x.ws, s);
        }
        break;
    }
  });

  ws.on('close', () => {
    const r = me.room;
    if (!r) return;
    r.members.delete(me.id);
    if (r.host === me.id || r.members.size === 0) {
      for (const x of r.members.values()) { send(x.ws, { t: 'closed' }); x.room = null; }
      rooms.delete(r.code);
      return;
    }
    for (const x of r.members.values()) send(x.ws, { t: 'left', id: me.id });
    broadcastLobby(r);
  });
});

// drop connections that stopped answering (closed laptop, lost Wi-Fi)
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  }
}, 30000);

server.listen(PORT, () => console.log('Stakan Liga server ishlayapti: port ' + PORT));
