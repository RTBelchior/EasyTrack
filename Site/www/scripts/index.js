(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FMAX = 195, svgNS = "http://www.w3.org/2000/svg";
  var ZONES = [
    { id: "Z1", name: "Recuperação", hi: .6, c: "var(--z1)", hex: "#6f7f93" },
    { id: "Z2", name: "Leve",        hi: .7, c: "var(--z2)", hex: "#3fb8af" },
    { id: "Z3", name: "Aeróbico",    hi: .8, c: "var(--z3)", hex: "#7ed957" },
    { id: "Z4", name: "Limiar",      hi: .9, c: "var(--z4)", hex: "#f5a524" },
    { id: "Z5", name: "Máximo",      hi: 2,  c: "var(--z5)", hex: "#ff4d4d" }
  ];
  function zoneOf(b) { var p = b / FMAX; for (var i = 0; i < 5; i++) if (p < ZONES[i].hi) return i; return 4; }
  function el(n, a) { var e = document.createElementNS(svgNS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
  function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }

  /* ---------- gráfico da partida ---------- */
  var series = [], t;
  for (t = 0; t <= 67; t++) {
    var v = 132 + 36 * Math.sin(Math.min(t, 16) / 16 * Math.PI / 2) + Math.sin(t / 2.7) * 7 + (t > 45 ? 6 : 0) + (t >= 45 && t <= 48 ? -34 : 0);
    if (t === 22 || t === 41 || t === 58 || t === 65) v += 18;
    if (t === 23 || t === 42 || t === 59 || t === 66) v -= 10;
    series.push(Math.round(Math.max(110, Math.min(194, v))));
  }
  var X0 = 44, X1 = 624, Y0 = 22, Y1 = 250, VMIN = 110, VMAX = 195;
  function sx(i) { return X0 + i / 67 * (X1 - X0); }
  function sy(val) { return Y1 - (val - VMIN) / (VMAX - VMIN) * (Y1 - Y0); }
  var bands = document.getElementById("cbands");
  [[.9, 1, "#ff4d4d"], [.8, .9, "#f5a524"], [.7, .8, "#7ed957"], [.6, .7, "#3fb8af"]].forEach(function (b) {
    var top = Math.max(Y0, sy(b[1] * FMAX)), bot = Math.min(Y1, sy(b[0] * FMAX));
    bands.appendChild(el("rect", { class: "zb", x: X0, y: top, width: X1 - X0, height: Math.max(0, bot - top), fill: b[2] }));
  });
  var g = document.getElementById("cgrid");
  [110, 130, 150, 170, 190].forEach(function (val) {
    g.appendChild(el("line", { x1: X0, x2: X1, y1: sy(val), y2: sy(val) }));
    var tx = el("text", { x: 36, y: sy(val) + 4, "text-anchor": "end" }); tx.textContent = val; g.appendChild(tx);
  });
  [0, 15, 30, 45, 60].forEach(function (m) {
    var tx = el("text", { x: sx(m), y: 276, "text-anchor": "middle" }); tx.textContent = m + "'"; g.appendChild(tx);
  });
  var d = series.map(function (val, i) { return (i ? "L" : "M") + sx(i).toFixed(1) + " " + sy(val).toFixed(1); }).join(" ");
  document.getElementById("cline").setAttribute("d", d);
  document.getElementById("carea").setAttribute("d", d + " L" + X1 + " " + Y1 + " L" + X0 + " " + Y1 + " Z");
  ["cend", "cring"].forEach(function (id) { var e = document.getElementById(id); e.setAttribute("cx", sx(67)); e.setAttribute("cy", sy(series[67])); });


  /* ---------- eventos ---------- */
  var events = [
    { c: "var(--z5)", t: "FC máxima: 191 bpm", d: "Pico em sprint de contra-ataque.", h: "58'" },
    { c: "var(--z4)", t: "Tempo acima da meta: 3 min", d: "Pressão alta após a troca de lado.", h: "41'" },
    { c: "var(--z3)", t: "Entrada em campo", d: "FC de aquecimento 118 bpm. Pulseira sincronizada.", h: "0'" }
  ];
  document.getElementById("alerts").innerHTML = events.map(function (a, i) {
    return '<div class="alert" style="--c:' + a.c + ';animation-delay:' + (i * 90) + 'ms"><span class="dot"></span><div><b>' + a.t + '</b><p>' + a.d + '</p></div><time>' + a.h + '</time></div>';
  }).join("");

  /* ---------- faixa dos últimos 60 s ---------- */
  var SX0 = 44, SX1 = 624, SY0 = 8, SY1 = 172, SMIN = 120, SMAX = 195;
  function ssy(val) { return SY1 - (val - SMIN) / (SMAX - SMIN) * (SY1 - SY0); }
  var sg = document.getElementById("sgrid");
  [120, 150, 165, 195].forEach(function (val) {
    sg.appendChild(el("line", { class: val === 150 || val === 165 ? "tl" : "gl", x1: SX0, x2: SX1, y1: ssy(val), y2: ssy(val) }));
    var tx = el("text", { x: 36, y: ssy(val) + 4, "text-anchor": "end" }); tx.textContent = val; sg.appendChild(tx);
  });
  [["-60 s", SX0], ["-30 s", (SX0 + SX1) / 2], ["agora", SX1]].forEach(function (a) {
    var tx = el("text", { x: a[1], y: 194, "text-anchor": a[1] === SX0 ? "start" : a[1] === SX1 ? "end" : "middle" }); tx.textContent = a[0]; sg.appendChild(tx);
  });
  var stz = document.getElementById("stz"); stz.setAttribute("y", ssy(165)); stz.setAttribute("height", ssy(150) - ssy(165));
  var hist = [], bpm = 168, i0;
  for (i0 = 0; i0 < 60; i0++) hist.push(168 + Math.round(Math.sin(i0 / 6) * 5 + (Math.random() - .5) * 4));
  function drawStrip() {
    document.getElementById("sline").setAttribute("points", hist.map(function (val, i) { return (SX0 + i / 59 * (SX1 - SX0)).toFixed(1) + "," + ssy(val).toFixed(1); }).join(" "));
  }
  drawStrip();


  /* ---------- ao vivo ---------- */
  var running = true, secs = 67 * 60 + 12, ticks = 0, sum = 168 * 4020, count = 4020, maxB = 191;
  var bpmEl = document.getElementById("bpm");
  document.getElementById("pause").addEventListener("click", function () { running = !running; this.textContent = running ? "Pausar" : "Retomar"; });
  function tick() {
    if (!running) return;
    secs++; ticks++;
    document.getElementById("clock").textContent = fmt(secs);
    var goal = 168 + Math.sin(ticks / 14) * 14 + (ticks % 40 > 30 ? 8 : 0);
    bpm = Math.round(Math.max(100, Math.min(194, bpm + (goal - bpm) * .22 + (Math.random() - .5) * 5)));
    hist.push(bpm); hist.shift(); drawStrip();
    sum += bpm; count++; if (bpm > maxB) maxB = bpm;
    var z = ZONES[zoneOf(bpm)];
    bpmEl.textContent = bpm;
    document.getElementById("zoneTxt").textContent = "Zona " + z.id.slice(1) + " · " + z.name.toLowerCase();
    document.getElementById("zonePill").style.setProperty("--c", z.c);
    document.getElementById("pctTxt").textContent = Math.round(bpm / FMAX * 100) + "% da FC máx.";
    document.getElementById("kAvg").textContent = Math.round(sum / count);
    document.getElementById("kMax").textContent = maxB;
  }
  if (!reduce) setInterval(tick, 1000);

  /* count-up */
  if (!reduce) document.querySelectorAll("[data-count]").forEach(function (e) {
    var to = +e.dataset.count, t0 = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - t0) / 1100), q = 1 - Math.pow(1 - k, 3);
      e.textContent = Math.round(to * q);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  });
})();
