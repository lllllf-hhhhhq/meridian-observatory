/* ============================================================
   Meridian — the planisphere
   The sky is drawn, not painted. Named stars are plotted from
   catalogued positions (right ascension and declination, J2000);
   the constellation figures are line sets drawn between them,
   not the modern boundaries, and the faint field stars are
   generated for texture.
   ============================================================ */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var canvas = document.getElementById("sky");
  if (!canvas) return;

  /* ---------------------------------------------------------
     Star catalogue.
     [name, RA hours, Dec degrees, V magnitude, catalogued]

     catalogued = true means the position and magnitude come from
     the Yale Bright Star Catalog (VizieR V/50) as given in SIMBAD.
     The remaining figure stars carry approximate positions, rounded
     to a hundredth of an hour and a hundredth of a degree, and are
     marked false so the readout never claims more than it has.
     --------------------------------------------------------- */
  var CONSTELLATIONS = [
    {
      name: "Ursa Major",
      stars: [
        ["Dubhe", 11.06, 61.75, 1.79, false],
        ["Merak", 11.03, 56.38, 2.37, false],
        ["Phecda", 11.90, 53.69, 2.44, false],
        ["Megrez", 12.26, 57.03, 3.31, false],
        ["Alioth", 12.90, 55.96, 1.77, false],
        ["Mizar", 13.40, 54.93, 2.23, false],
        ["Alkaid", 13.79, 49.31, 1.86, false]
      ],
      lines: [
        ["Dubhe", "Merak"], ["Merak", "Phecda"], ["Phecda", "Megrez"],
        ["Megrez", "Dubhe"], ["Megrez", "Alioth"], ["Alioth", "Mizar"],
        ["Mizar", "Alkaid"]
      ]
    },
    {
      name: "Orion",
      stars: [
        ["Betelgeuse", 5.91953,   7.40694,  0.50, true],
        ["Bellatrix",  5.42,      6.35,     1.64, false],
        ["Mintaka",    5.53,     -0.30,     2.23, false],
        ["Alnilam",    5.60,     -1.20,     1.69, false],
        ["Alnitak",    5.68,     -1.94,     1.77, false],
        ["Saiph",      5.80,     -9.67,     2.06, false],
        ["Rigel",      5.24231,  -8.20167,  0.13, true],
        ["Meissa",     5.59,      9.93,     3.33, false]
      ],
      lines: [
        ["Betelgeuse", "Bellatrix"], ["Bellatrix", "Mintaka"],
        ["Mintaka", "Alnilam"], ["Alnilam", "Alnitak"],
        ["Alnitak", "Betelgeuse"], ["Alnitak", "Saiph"],
        ["Saiph", "Rigel"], ["Rigel", "Mintaka"],
        ["Betelgeuse", "Meissa"], ["Bellatrix", "Meissa"]
      ]
    },
    {
      name: "Cassiopeia",
      stars: [
        ["Caph", 0.15, 59.15, 2.27, false],
        ["Schedar", 0.68, 56.54, 2.24, false],
        ["Gamma Cas", 0.95, 60.72, 2.47, false],
        ["Ruchbah", 1.43, 60.24, 2.68, false],
        ["Segin", 1.91, 63.67, 3.35, false]
      ],
      lines: [
        ["Caph", "Schedar"], ["Schedar", "Gamma Cas"],
        ["Gamma Cas", "Ruchbah"], ["Ruchbah", "Segin"]
      ]
    },
    {
      name: "Cygnus",
      stars: [
        ["Deneb", 20.69053, 45.28028, 1.25, true],
        ["Sadr", 20.37, 40.26, 2.23, false],
        ["Gienah", 20.77, 33.97, 2.46, false],
        ["Delta Cyg", 19.75, 45.13, 2.87, false],
        ["Albireo", 19.51, 27.96, 3.09, false]
      ],
      lines: [
        ["Deneb", "Sadr"], ["Sadr", "Albireo"],
        ["Sadr", "Gienah"], ["Sadr", "Delta Cyg"]
      ]
    },
    {
      name: "Lyra",
      stars: [
        ["Vega", 18.61564, 38.78361, 0.03, true],
        ["Zeta Lyr", 18.75, 37.61, 4.34, false],
        ["Delta Lyr", 18.90, 36.90, 4.30, false],
        ["Sheliak", 18.83, 33.36, 3.52, false],
        ["Sulafat", 18.98, 32.69, 3.25, false]
      ],
      lines: [
        ["Vega", "Zeta Lyr"], ["Zeta Lyr", "Delta Lyr"],
        ["Delta Lyr", "Sulafat"], ["Sulafat", "Sheliak"],
        ["Sheliak", "Zeta Lyr"]
      ]
    },
    {
      name: "Scorpius",
      stars: [
        ["Graffias", 16.09, -19.81, 2.62, false],
        ["Dschubba", 16.01, -22.62, 2.29, false],
        ["Pi Sco", 15.98, -26.11, 2.89, false],
        ["Antares", 16.49014, -26.43194, 1.06, true],
        ["Sargas", 17.62, -43.00, 1.86, false],
        ["Shaula", 17.56, -37.10, 1.62, false],
        ["Lesath", 17.51, -37.30, 2.70, false]
      ],
      lines: [
        ["Graffias", "Pi Sco"], ["Graffias", "Dschubba"],
        ["Dschubba", "Antares"], ["Antares", "Sargas"],
        ["Sargas", "Shaula"], ["Shaula", "Lesath"], ["Lesath", "Sargas"]
      ]
    },
    {
      /* the pole star, standing alone: no figure is drawn for it */
      name: "Ursa Minor",
      stars: [
        ["Polaris", 2.53031, 89.26417, 1.98, true]
      ],
      lines: []
    }
  ];

  /* Field stars: deterministic, so the sky is the same every visit.
     They carry no designation and are never named in the readout. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var STARS = [];
  var CONST_BY_NAME = [];

  CONSTELLATIONS.forEach(function (c) {
    var map = {};
    c.stars.forEach(function (s) {
      var star = {
        name: s[0],
        ra: s[1],
        dec: s[2],
        mag: s[3],
        catalogued: s[4],
        constellation: c.name
      };
      STARS.push(star);
      map[s[0]] = star;
    });
    CONST_BY_NAME.push({ constellation: c, map: map });
  });

  (function addFieldStars() {
    var rnd = mulberry32(20261012);
    for (var i = 0; i < 43; i++) {
      STARS.push({
        name: null,
        ra: Math.round(rnd() * 2400) / 100,
        dec: Math.round((-42 + rnd() * 126) * 100) / 100,
        mag: 3.4 + rnd() * 2.1,
        catalogued: false,
        constellation: null
      });
    }
  })();

  /* ---------------------------------------------------------
     Canvas setup
     --------------------------------------------------------- */
  var ctx = canvas.getContext("2d");
  var TAU = Math.PI * 2;
  var DEC_MAX = 90;
  var DEC_MIN = -45;

  var view = { w: 0, h: 0, cx: 0, cy: 0, R: 0, scale: 1 };

  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    return {
      void: cs.getPropertyValue("--void").trim() || "#0B0F1A",
      deep: cs.getPropertyValue("--deep").trim() || "#0E1526",
      ink: cs.getPropertyValue("--ink").trim() || "#E8ECF6",
      muted: cs.getPropertyValue("--muted").trim() || "#A7B0C6",
      faint: cs.getPropertyValue("--faint").trim() || "#6E7893",
      accent: cs.getPropertyValue("--accent").trim() || "#E9A13B"
    };
  }
  var PAL = readPalette();

  function geometry() {
    var w = view.w, h = view.h;
    if (w < 900) {
      return { cx: w * 0.5, cy: Math.min(h * 0.34, 300), R: Math.min(w * 0.46, h * 0.28) };
    }
    return { cx: w * 0.64, cy: h * 0.52, R: Math.min(w * 0.29, h * 0.45) };
  }

  var needsRender = true;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = canvas.clientWidth;
    view.h = canvas.clientHeight;
    canvas.width = Math.round(view.w * dpr);
    canvas.height = Math.round(view.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = geometry();
    view.cx = g.cx; view.cy = g.cy; view.R = g.R;
    view.scale = view.R / (DEC_MAX - DEC_MIN);
    needsRender = true;
    if (reduced) render();
  }

  /* Polar azimuthal equidistant projection about the north pole. */
  function project(ra, dec, rot) {
    var r = (DEC_MAX - dec) * view.scale;
    var a = (ra / 24) * TAU + rot;
    return { x: view.cx - r * Math.sin(a), y: view.cy - r * Math.cos(a), r: r };
  }

  /* ---------------------------------------------------------
     Motion state
     --------------------------------------------------------- */
  var TAU12 = TAU / 12;
  var motion = {
    month: 9,                 /* October index */
    monthAngle: -9 * TAU12,
    targetAngle: -9 * TAU12,
    drag: 0,
    step: 0,
    drift: 0,
    lastT: 0
  };

  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = mq.matches;
  if (mq.addEventListener) {
    mq.addEventListener("change", function (e) {
      reduced = e.matches;
      needsRender = true;
      if (reduced) { motion.drift = 0; render(); }
      else start();
    });
  }

  var running = false;
  var rafId = 0;
  var visible = true;

  function totalRotation() {
    return motion.monthAngle + motion.drag + motion.step + motion.drift;
  }

  function frame(t) {
    if (!running) return;
    if (!motion.lastT) motion.lastT = t;
    var dt = Math.min((t - motion.lastT) / 1000, 0.05);
    motion.lastT = t;

    if (!reduced) motion.drift += dt * 0.018;
    motion.monthAngle += (motion.targetAngle - motion.monthAngle) * (reduced ? 1 : 0.09);
    if (Math.abs(motion.targetAngle - motion.monthAngle) < 0.00005) motion.monthAngle = motion.targetAngle;

    render();
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced) return;
    running = true;
    motion.lastT = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* ---------------------------------------------------------
     Drawing
     --------------------------------------------------------- */
  var hitList = [];

  function render() {
    var rot = totalRotation();
    var cx = view.cx, cy = view.cy, R = view.R;

    ctx.clearRect(0, 0, view.w, view.h);

    /* ground */
    ctx.fillStyle = PAL.void;
    ctx.fillRect(0, 0, view.w, view.h);

    /* disc */
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = PAL.deep;
    ctx.fill();

    /* graticule, declination circles */
    ctx.lineWidth = 1;
    for (var dec = 75; dec >= -45; dec -= 15) {
      var rr = (DEC_MAX - dec) * view.scale;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, TAU);
      ctx.strokeStyle = dec === 0 ? "rgba(232,236,246,0.22)" : "rgba(232,236,246,0.10)";
      ctx.stroke();
    }

    /* graticule, hour lines */
    ctx.strokeStyle = "rgba(232,236,246,0.10)";
    ctx.beginPath();
    for (var hh = 0; hh < 24; hh += 2) {
      var a = (hh / 24) * TAU + rot;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - R * Math.sin(a), cy - R * Math.cos(a));
    }
    ctx.stroke();

    /* rim */
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.strokeStyle = "rgba(232,236,246,0.26)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R - 9, 0, TAU);
    ctx.strokeStyle = "rgba(232,236,246,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();

    /* ecliptic */
    var er = 90 * view.scale;
    var off = 23.44 * view.scale;
    var dir = project(6, 0, rot);
    var ux = (dir.x - cx) / (dir.r || 1);
    var uy = (dir.y - cy) / (dir.r || 1);
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.arc(cx + off * ux, cy + off * uy, er, 0, TAU);
    ctx.strokeStyle = "rgba(232,236,246,0.13)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    /* constellation lines */
    ctx.strokeStyle = "rgba(232,236,246,0.42)";
    ctx.lineWidth = 1.15;
    CONST_BY_NAME.forEach(function (entry) {
      entry.constellation.lines.forEach(function (pair) {
        var a = entry.map[pair[0]], b = entry.map[pair[1]];
        if (!a || !b) return;
        var pa = project(a.ra, a.dec, rot);
        var pb = project(b.ra, b.dec, rot);
        if (pa.r > R || pb.r > R) return;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      });
    });

    /* stars */
    hitList.length = 0;
    STARS.forEach(function (s) {
      var p = project(s.ra, s.dec, rot);
      if (p.r > R - 2) return;
      var rad = Math.max(0.85, 2.5 - s.mag * 0.34);
      var alpha = Math.max(0.32, 0.92 - s.mag * 0.09);
      var edgeFade = p.r > R - 26 ? Math.max(0, (R - p.r) / 26) : 1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, TAU);
      ctx.fillStyle = "rgba(232,236,246," + (alpha * edgeFade).toFixed(3) + ")";
      ctx.fill();

      /* a star with a catalogued position carries a faint halo ring, so a
         visitor can see which marks are measured and which are drawn */
      if (s.constellation && s.mag < 3.0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad + (s.catalogued ? 4.2 : 3.2), 0, TAU);
        ctx.strokeStyle = "rgba(232,236,246," +
          ((s.catalogued ? 0.26 : 0.13) * edgeFade).toFixed(3) + ")";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* field stars are never named, so they are not hover targets */
      if (s.name) hitList.push({ star: s, x: p.x, y: p.y, rad: rad });
    });

    /* the pole, the instrument's centre */
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, TAU);
    ctx.strokeStyle = "rgba(232,236,246,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy); ctx.lineTo(cx + 9, cy);
    ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 9);
    ctx.stroke();

    /* the sun for the chosen month: the single warm mark in the sky */
    var lam = (motion.month - 2.5) * (TAU / 12);
    var sinDec = Math.sin(0.4091) * Math.sin(lam);
    var sunDec = Math.asin(Math.max(-1, Math.min(1, sinDec))) * 180 / Math.PI;
    var sunRa = Math.atan2(Math.cos(0.4091) * Math.sin(lam), Math.cos(lam)) / TAU * 24;
    if (sunRa < 0) sunRa += 24;
    var sp = project(sunRa, sunDec, rot);
    if (sp.r <= R) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3.4, 0, TAU);
      ctx.fillStyle = PAL.accent;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 7.5, 0, TAU);
      ctx.strokeStyle = "rgba(233,161,59,0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    needsRender = false;
  }

  /* ---------------------------------------------------------
     Pointer interaction
     --------------------------------------------------------- */
  var readout = document.getElementById("sky-readout");
  var readoutName = document.getElementById("readout-name");
  var readoutCoords = document.getElementById("readout-coords");
  var hint = document.getElementById("sky-hint");
  var dragState = null;

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function fmtRA(ra) {
    var h = Math.floor(ra);
    var m = Math.round((ra - h) * 60);
    if (m === 60) { h = (h + 1) % 24; m = 0; }
    return pad(h) + "h " + pad(m) + "m";
  }
  function fmtDec(dec) {
    var sign = dec < 0 ? "\u2212" : "+";
    var d = Math.abs(dec);
    var dd = Math.floor(d);
    var mm = Math.round((d - dd) * 60);
    if (mm === 60) { dd += 1; mm = 0; }
    return sign + pad(dd) + "\u00B0 " + pad(mm) + "\u2032";
  }

  function hitTest(px, py) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < hitList.length; i++) {
      var s = hitList[i];
      var dx = s.x - px, dy = s.y - py;
      var d = dx * dx + dy * dy;
      var lim = Math.max(9, s.rad + 7);
      if (d < lim * lim && d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  function showReadout(hit) {
    if (!hit) { readout.hidden = true; return; }
    var s = hit.star;
    readoutName.textContent = s.name + (s.constellation ? " \u00B7 " + s.constellation : "");
    readoutCoords.textContent =
      "RA " + fmtRA(s.ra) + " \u00B7 Dec " + fmtDec(s.dec) +
      " \u00B7 V " + s.mag.toFixed(2) +
      (s.catalogued ? " \u00B7 catalogue" : "");
    readout.hidden = false;
  }

  canvas.addEventListener("pointerdown", function (e) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety, not a requirement */ }
    dragState = { x: e.clientX, y: e.clientY, moved: 0, base: motion.drag };
    canvas.classList.add("is-dragging");
    if (hint) hint.style.opacity = "0";
  });

  canvas.addEventListener("pointermove", function (e) {
    var rect = canvas.getBoundingClientRect();
    var px = e.clientX - rect.left, py = e.clientY - rect.top;

    if (dragState) {
      var dx = e.clientX - dragState.x;
      var dy = e.clientY - dragState.y;
      dragState.moved += Math.abs(dx) + Math.abs(dy);
      motion.drag = dragState.base + (dx + dy) * 0.006;
      needsRender = true;
      if (reduced) render();
      return;
    }
    showReadout(hitTest(px, py));
  });

  function endDrag(e) {
    if (!dragState) return;
    var wasTap = dragState.moved < 6;
    dragState = null;
    canvas.classList.remove("is-dragging");
    if (wasTap) {
      var rect = canvas.getBoundingClientRect();
      showReadout(hitTest(e.clientX - rect.left, e.clientY - rect.top));
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", function () {
    if (!dragState) readout.hidden = true;
  });

  /* ---------------------------------------------------------
     Controls
     --------------------------------------------------------- */
  var ephemeris = document.getElementById("ephemeris");
  if (ephemeris) {
    ephemeris.addEventListener("change", function () {
      var idx = parseInt(ephemeris.value, 10) || 0;
      motion.month = idx;
      motion.targetAngle = -idx * TAU12;
      needsRender = true;
      if (reduced) { motion.monthAngle = motion.targetAngle; render(); }
      else start();
    });
  }

  var rotateBtn = document.getElementById("rotate-sky");
  if (rotateBtn) {
    rotateBtn.addEventListener("click", function () {
      motion.step -= TAU / 24;
      needsRender = true;
      if (reduced) render();
      else start();
    });
  }

  /* the credit line, so the sources live in one place */
  var credit = document.getElementById("catalogue-credit");
  if (credit) {
    credit.innerHTML =
      ' Catalogued positions: ' +
      '<a href="https://vizier.cds.unistra.fr/viz-bin/VizieR?-source=V/50" target="_blank" rel="noopener">' +
      'Yale Bright Star Catalog (VizieR V/50)</a> via ' +
      '<a href="https://simbad.u-strasbg.fr/simbad/" target="_blank" rel="noopener">SIMBAD</a>.';
  }

  /* ---------------------------------------------------------
     Lifecycle
     --------------------------------------------------------- */
  resize();
  motion.monthAngle = motion.targetAngle;
  render();

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener("resize", resize);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !reduced) start(); else stop();
    }, { threshold: 0.02 }).observe(canvas);
  } else {
    start();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (visible && !reduced) start();
  });

  if (!reduced) start();

  window.addEventListener("load", function () {
    document.documentElement.classList.add("is-ready");
  });
  if (document.readyState === "complete") {
    document.documentElement.classList.add("is-ready");
  }
})();
