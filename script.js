// ---------- Nav ----------
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});
links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => links.classList.remove("open"))
);

// Highlight the section in view
const navAnchors = [...links.querySelectorAll("a")];
const sections = navAnchors
  .map((a) => document.querySelector(a.getAttribute("href")))
  .filter(Boolean);
const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        navAnchors.forEach((a) =>
          a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)
        );
      }
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
sections.forEach((s) => spy.observe(s));

// ---------- Reveal on scroll ----------
const revealTargets = document.querySelectorAll(
  ".info-card, .card-stack, .step, .field-card, .flow-node, .outcome, .tool, .tier, .member, .obj-grid li, .primary-obj, .table-wrap, .calc > *"
);
revealTargets.forEach((el) => el.classList.add("reveal"));
const revealer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
revealTargets.forEach((el) => revealer.observe(el));

// ---------- Interactive network sketch ----------
const canvas = document.getElementById("netCanvas");
const ctx = canvas.getContext("2d");
const nPoints = document.getElementById("nPoints");
const capInput = document.getElementById("cap");
const nPointsVal = document.getElementById("nPointsVal");
const capVal = document.getElementById("capVal");
const mapStats = document.getElementById("mapStats");
const ROUTE_COLORS = ["#1f8a4c", "#2c6e8f", "#7a4fa3", "#c8553d", "#b07a1e", "#2a9d8f", "#d16ba5"];

let points = [];
const W = canvas.width, H = canvas.height;
const hub = { x: W * 0.42, y: H * 0.5 };
const recycler = { x: W * 0.93, y: H * 0.5 };

function genPoints(n) {
  points = [];
  let tries = 0;
  while (points.length < n && tries < 5000) {
    tries++;
    const p = { x: 30 + Math.random() * (W * 0.72), y: 30 + Math.random() * (H - 60) };
    const farFromHub = Math.hypot(p.x - hub.x, p.y - hub.y) > 40;
    const spaced = points.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 34);
    if (farFromHub && spaced) points.push(p);
  }
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Nearest-neighbour heuristic, split into trips by vehicle capacity (stops per run)
function buildRoutes(cap) {
  const left = points.slice();
  const routes = [];
  while (left.length) {
    const route = [];
    let cur = hub;
    while (route.length < cap && left.length) {
      let bi = 0;
      for (let i = 1; i < left.length; i++) if (dist(cur, left[i]) < dist(cur, left[bi])) bi = i;
      cur = left.splice(bi, 1)[0];
      route.push(cur);
    }
    routes.push(route);
  }
  return routes;
}

function drawSquare(p, color, size, label) {
  ctx.fillStyle = color;
  ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  ctx.fillStyle = "#17231c";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, p.x, p.y + size / 2 + 16);
}

function draw() {
  const n = +nPoints.value, cap = +capInput.value;
  nPointsVal.textContent = n;
  capVal.textContent = cap;
  if (points.length !== n) genPoints(n);

  ctx.clearRect(0, 0, W, H);
  // grid
  ctx.strokeStyle = "rgba(31,138,76,0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const routes = buildRoutes(cap);
  let total = 0;
  routes.forEach((r, i) => {
    ctx.strokeStyle = ROUTE_COLORS[i % ROUTE_COLORS.length];
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(hub.x, hub.y);
    let prev = hub;
    r.forEach((p) => { ctx.lineTo(p.x, p.y); total += dist(prev, p); prev = p; });
    ctx.lineTo(hub.x, hub.y);
    total += dist(prev, hub);
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // hub -> recycler trunk line (full truck load)
  ctx.strokeStyle = "#8a3b2c";
  ctx.lineWidth = 5;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.moveTo(hub.x, hub.y);
  ctx.lineTo(recycler.x, recycler.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#8a3b2c";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Full truck load", (hub.x + recycler.x) / 2 + 40, hub.y - 10);

  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#1f8a4c";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  drawSquare(hub, "#b07a1e", 24, "Hub");
  drawSquare(recycler, "#8a3b2c", 26, "Recycler");

  // Units: 1 canvas px ≈ 0.05 km (illustrative scale only)
  mapStats.textContent = `${routes.length} milk run${routes.length > 1 ? "s" : ""} · ~${(total * 0.05).toFixed(1)} km total (illustrative scale)`;
}

nPoints.addEventListener("input", draw);
capInput.addEventListener("input", draw);
document.getElementById("shuffle").addEventListener("click", () => { points = []; draw(); });
draw();

// ---------- Cost-per-kg calculator ----------
const ids = ["trips", "dist", "load", "cpk", "fix"];
const val = (pre, k) => Math.max(0, parseFloat(document.getElementById(`${pre}_${k}`).value) || 0);
const rs = (x) => "Rs " + x.toLocaleString("en-IN", { maximumFractionDigits: 2 });

function scenario(pre) {
  const trips = val(pre, "trips"), d = val(pre, "dist"), load = val(pre, "load");
  const cpk = val(pre, "cpk"), fix = val(pre, "fix");
  const cost = trips * (d * cpk + fix);
  const kg = trips * load;
  return { cost, kg, km: trips * d, perKg: kg > 0 ? cost / kg : NaN };
}

function calc() {
  const a = scenario("a"), p = scenario("p");
  const saving = a.perKg > 0 && isFinite(p.perKg) ? ((a.perKg - p.perKg) / a.perKg) * 100 : NaN;
  const out = document.getElementById("calcOut");
  const fmt = (x) => (isFinite(x) ? rs(x) : "–");
  out.innerHTML = `
    <h3>Comparison (per month)</h3>
    <div class="kv"><span>As-is: kg collected</span><b>${a.kg.toLocaleString("en-IN")} kg</b></div>
    <div class="kv"><span>As-is: total cost</span><b>${fmt(a.cost)}</b></div>
    <div class="kv"><span>As-is: cost per kg</span><b>${fmt(a.perKg)}</b></div>
    <div class="kv"><span>Planned: kg collected</span><b>${p.kg.toLocaleString("en-IN")} kg</b></div>
    <div class="kv"><span>Planned: total cost</span><b>${fmt(p.cost)}</b></div>
    <div class="kv"><span>Planned: cost per kg</span><b>${fmt(p.perKg)}</b></div>
    <div class="kv"><span>Distance: as-is vs planned</span><b>${a.km.toFixed(0)} / ${p.km.toFixed(0)} km</b></div>
    <div class="big ${saving < 0 ? "bad" : ""}">${isFinite(saving) ? (saving >= 0 ? "↓ " : "↑ ") + Math.abs(saving).toFixed(1) + "%" : "–"}</div>
    <div style="opacity:.8;font-size:.88rem">${isFinite(saving) ? (saving >= 0 ? "lower" : "higher") + " cost per kg with the planned milk run" : "Enter loads above zero to compare"}</div>
  `;
}
["a", "p"].forEach((pre) => ids.forEach((k) => document.getElementById(`${pre}_${k}`).addEventListener("input", calc)));
calc();
