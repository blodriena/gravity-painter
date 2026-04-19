const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W, H, tool = 'planet';
let bodies = [];
let particles = [];
let animId = null;
let holding = false, holdX = 0, holdY = 0;
let hintVisible = true;

const PALS = [
  { name:'cosmos', colors:['#a78bfa','#818cf8','#38bdf8','#34d399','#f472b6'] },
  { name:'fire',   colors:['#f97316','#fb923c','#fbbf24','#f43f5e','#ff6b6b'] },
  { name:'ocean',  colors:['#06b6d4','#0ea5e9','#6366f1','#8b5cf6','#a5f3fc'] },
  { name:'forest', colors:['#4ade80','#86efac','#a3e635','#34d399','#6ee7b7'] },
  { name:'mono',   colors:['#ffffff','#e2e8f0','#94a3b8','#64748b','#cbd5e1'] },
];
let curPal = PALS[0];

function buildPalBtns() {
  const c = document.getElementById('palettes');
  PALS.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'pal-btn' + (i === 0 ? ' on' : '');
    el.style.background = `linear-gradient(135deg,${p.colors[0]},${p.colors[2]})`;
    el.title = p.name;
    el.onclick = () => {
      curPal = p;
      document.querySelectorAll('.pal-btn').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      particles.forEach(p => p.color = randColor());
    };
    c.appendChild(el);
  });
}
buildPalBtns();

function sliderBind(id, outId, cb) {
  const el = document.getElementById(id);
  el.oninput = () => {
    document.getElementById(outId).textContent = el.value;
    if (cb) cb(+el.value);
  };
}
sliderBind('psize','psize-v');
sliderBind('spd','spd-v');
sliderBind('trail','trail-v');
sliderBind('grav','grav-v');
sliderBind('pcount','pcount-v', v => respawnParticles());

function setTool(t, el) {
  tool = t;
  document.querySelectorAll('#ui .btn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
}



function resize() {
  const wrap = document.getElementById('canvas-wrap');
  W = canvas.width = wrap.clientWidth;
  H = canvas.height = wrap.clientHeight;
}
resize();
window.addEventListener('resize', () => { resize(); respawnParticles(); });

function randColor() { return curPal.colors[Math.floor(Math.random() * curPal.colors.length)]; }

function makeParticle() {
  return {
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
    color: randColor(),
    alpha: 0.5 + Math.random() * 0.5,
    trail: [],
  };
}

function respawnParticles() {
  const n = +document.getElementById('pcount').value;
  particles = [];
  for (let i = 0; i < n; i++) particles.push(makeParticle());
}
respawnParticles();

function clearAll() { bodies = []; respawnParticles(); }

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
}

function placeBody(x, y) {
  const r = +document.getElementById('psize').value;
  if (tool === 'erase') {
    bodies = bodies.filter(b => Math.hypot(b.x - x, b.y - y) > b.r + 12);
    return;
  }
  const type = tool;
  const mass = type === 'black' ? r*r*10 : type === 'repel' ? -(r*r*5) : r*r*3;
  bodies.push({ x, y, mass, type, r });
  if (hintVisible) {
    document.getElementById('hint').style.opacity = '0';
    hintVisible = false;
  }
}

canvas.addEventListener('mousedown', e => { const p = getPos(e); holding = true; holdX = p.x; holdY = p.y; });
canvas.addEventListener('mouseup',   e => { if (!holding) return; holding = false; placeBody(holdX, holdY); });
canvas.addEventListener('mousemove', e => { if (holding) { const p = getPos(e); holdX = p.x; holdY = p.y; } });
canvas.addEventListener('touchstart', e => { e.preventDefault(); const p = getPos(e); holding = true; holdX = p.x; holdY = p.y; }, { passive: false });
canvas.addEventListener('touchend',   e => { e.preventDefault(); if (!holding) return; holding = false; placeBody(holdX, holdY); }, { passive: false });
canvas.addEventListener('touchmove',  e => { e.preventDefault(); const p = getPos(e); holdX = p.x; holdY = p.y; }, { passive: false });

function toggleFS() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    document.getElementById('fs-btn').textContent = 'Exit fullscreen';
  } else {
    document.exitFullscreen();
    document.getElementById('fs-btn').textContent = 'Fullscreen';
  }
}

function drawBody(b) {
  ctx.save();
  if (b.type === 'black') {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 3 + ring * 7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139,92,246,${0.6 - ring * 0.18})`;
      ctx.lineWidth = 2 - ring * 0.5;
      ctx.stroke();
    }
  } else if (b.type === 'repel') {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251,146,60,0.1)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(251,146,60,0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(251,146,60,0.2)';
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    const grad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
    grad.addColorStop(0, 'rgba(220,200,255,0.95)');
    grad.addColorStop(0.5, 'rgba(130,100,210,0.65)');
    grad.addColorStop(1, 'rgba(60,40,120,0.2)');
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(190,170,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function loop() {
  animId = requestAnimationFrame(loop);
  const spd   = +document.getElementById('spd').value / 4;
  const grav  = +document.getElementById('grav').value;
  const tLen  = +document.getElementById('trail').value;

  ctx.fillStyle = 'rgba(6,6,15,0.2)';
  ctx.fillRect(0, 0, W, H);

  bodies.forEach(drawBody);

  particles.forEach(p => {
    bodies.forEach(b => {
      const dx = b.x - p.x, dy = b.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < b.r + 1) {
        Object.assign(p, makeParticle());
        return;
      }
      const force = grav * b.mass / (dist * dist + 200);
      p.vx += force * (dx / dist) * spd;
      p.vy += force * (dy / dist) * spd;
    });

    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const max = 5 + spd * 2;
    if (speed > max) { p.vx = p.vx / speed * max; p.vy = p.vy / speed * max; }

    p.x += p.vx * spd; p.y += p.vy * spd;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > tLen) p.trail.shift();

    if (p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = p.alpha * 0.65;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  if (holding) {
    const r = +document.getElementById('psize').value;
    ctx.beginPath();
    ctx.arc(holdX, holdY, r, 0, Math.PI * 2);
    ctx.strokeStyle = tool === 'black' ? 'rgba(139,92,246,0.8)' : tool === 'repel' ? 'rgba(251,146,60,0.8)' : 'rgba(200,180,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  document.getElementById('stats').textContent = `${particles.length} particles · ${bodies.length} bodies`;
}
loop();