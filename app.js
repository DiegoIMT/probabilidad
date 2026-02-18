// ==============================
// Probabilidad y Estadística — app.js
// Con botones de "Datos aleatorios" en todas las secciones calculables
// Datos aleatorios (general): 20..50
// Árbol multiplicativo: 20..25 por paso (para evitar crecimiento enorme)
// ==============================

// ---------- Aleatorios ----------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randCount(minCount, maxCount) {
  return randInt(minCount, maxCount);
}

function uniqueInts(count, min, max) {
  const s = new Set();
  const limit = Math.min(count, max - min + 1);
  while (s.size < limit) s.add(randInt(min, max));
  return [...s];
}

function makeRandomList(count, min = 1, max = 1000) {
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(randInt(min, max));
  return arr;
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function pickRandomFromArray(arr) {
  return arr[randInt(0, arr.length - 1)];
}

// ---------- Utilidades ----------
function parseNumbers(raw) {
  const parts = raw
    .replace(/\n/g, " ")
    .replace(/,/g, " ")
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);

  return parts.map((x) => Number(x)).filter((x) => Number.isFinite(x));
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  const n = a.length;
  if (n % 2 === 1) return a[(n - 1) / 2];
  return (a[n / 2 - 1] + a[n / 2]) / 2;
}

function mode(arr) {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  let best = null,
    bestC = 0;
  for (const [k, v] of m.entries()) {
    if (v > bestC) {
      best = k;
      bestC = v;
    }
  }
  if (bestC === 1) return null;
  return best;
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

// ---------- Intervalos ----------
function buildClasses(data, w) {
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const classes = [];
  let a = mn;
  while (a <= mx) {
    const b = a + w;
    classes.push({ a, b, fi: 0 });
    a = b;
  }
  return classes;
}

function fillFrequencies(data, classes) {
  for (const x of data) {
    for (let i = 0; i < classes.length; i++) {
      const c = classes[i];
      const isLast = i === classes.length - 1;
      const inside = x >= c.a && (x < c.b || (isLast && x <= c.b));
      if (inside) {
        c.fi++;
        break;
      }
    }
  }

  const n = data.length;
  let cum = 0,
    cumRel = 0;

  return classes.map((c) => {
    cum += c.fi;
    const fr = c.fi / n;
    cumRel += fr;
    return {
      interval: `[${c.a}-${c.b})`,
      a: c.a,
      b: c.b,
      mid: (c.a + c.b) / 2,
      fi: c.fi,
      fr,
      Fi: cum,
      Fr: cumRel,
    };
  });
}

function makeTable(freq) {
  let html =
    '<table><thead><tr>' +
    "<th>Clase</th><th>Punto medio</th><th>fi</th><th>fr</th><th>Fi</th><th>Fr</th>" +
    "</tr></thead><tbody>";

  for (const r of freq) {
    html += `
      <tr>
        <td>${r.interval}</td>
        <td>${round2(r.mid)}</td>
        <td>${r.fi}</td>
        <td>${(r.fr * 100).toFixed(2)}%</td>
        <td>${r.Fi}</td>
        <td>${(r.Fr * 100).toFixed(2)}%</td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  return html;
}
// ---------- Canvas helpers (DPR + ejes con ticks) ----------
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;

  // Tamaño CSS (lo visible)
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;

  // Tamaño real (pixeles)
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // dibujar en unidades CSS
  return ctx;
}

function niceTicks(maxValue, ticks = 5) {
  // genera valores “bonitos” 0..max con pasos redondeados
  const max = Math.max(1, maxValue);
  const rawStep = max / ticks;
  const pow10 = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.ceil(rawStep / pow10) * pow10;
  const top = Math.ceil(max / step) * step;

  const arr = [];
  for (let v = 0; v <= top; v += step) arr.push(v);
  return { top, step, values: arr };
}

function drawAxesWithTicks(ctx, opts) {
  // opts: { pad, xLabel, yLabel, xTicks:[], yMax, yTicksCount }
  const pad = opts.pad || 44;
  const w = ctx.canvas.width / (window.devicePixelRatio || 1);
  const h = ctx.canvas.height / (window.devicePixelRatio || 1);

  // Fondo limpio (por si acaso)
  ctx.clearRect(0, 0, w, h);

  // Ejes
  ctx.strokeStyle = "rgba(255,255,255,.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, 12);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(w - 12, h - pad);
  ctx.stroke();

  // Etiquetas de ejes
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.font = "12px system-ui";
  if (opts.yLabel) ctx.fillText(opts.yLabel, 10, 18);
  if (opts.xLabel) ctx.fillText(opts.xLabel, w - 60, h - 10);

  // Área de gráfica
  const plot = {
    left: pad,
    top: 12,
    right: w - 12,
    bottom: h - pad
  };

  // Ticks Y
  const yInfo = niceTicks(opts.yMax || 1, opts.yTicksCount || 5);
  ctx.strokeStyle = "rgba(255,255,255,.15)";
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.font = "11px ui-monospace, monospace";

  yInfo.values.forEach((v) => {
    const y = plot.bottom - (v / yInfo.top) * (plot.bottom - plot.top);

    // línea guía
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();

    // etiqueta
    ctx.fillText(String(v), 8, y + 4);
  });

  // Ticks X (si vienen)
  if (opts.xTicks && opts.xTicks.length) {
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.font = "11px ui-monospace, monospace";

    const n = opts.xTicks.length;
    const span = plot.right - plot.left;
    const step = n > 1 ? span / (n - 1) : span;

    for (let i = 0; i < n; i++) {
      const x = plot.left + i * step;
      // marca pequeña
      ctx.strokeStyle = "rgba(255,255,255,.25)";
      ctx.beginPath();
      ctx.moveTo(x, plot.bottom);
      ctx.lineTo(x, plot.bottom + 5);
      ctx.stroke();

      // texto
      const label = String(opts.xTicks[i]);
      ctx.fillText(label, x - 10, plot.bottom + 18);
    }
  }

  return { plot, yTop: yInfo.top };
}

// ---------- Gráficas ----------
function clearCanvas(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawAxes(ctx, pad = 40) {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  ctx.strokeStyle = "rgba(255,255,255,.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, 10);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(w - 10, h - pad);
  ctx.stroke();
  return { pad, w, h };
}

function drawHistogram(canvas, freq) {
  const ctx = setupCanvas(canvas);

  const maxFi = Math.max(...freq.map(r => r.fi), 1);
  const { plot, yTop } = drawAxesWithTicks(ctx, {
    pad: 50,
    xLabel: "X",
    yLabel: "fi",
    yMax: maxFi,
    yTicksCount: 5
  });

  const barW = (plot.right - plot.left) / freq.length;

  ctx.fillStyle = "rgba(96,165,250,.85)";
  for (let i = 0; i < freq.length; i++) {
    const r = freq[i];
    const x = plot.left + i * barW + 6;
    const bh = (r.fi / yTop) * (plot.bottom - plot.top);
    const y = plot.bottom - bh;
    ctx.fillRect(x, y, barW - 12, bh);

    // Etiquetas X (intervalo)
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(`${r.a}-${r.b}`, x, plot.bottom + 30);
    ctx.fillStyle = "rgba(96,165,250,.85)";
  }
}


function drawLineChart(canvas, xVals, yVals, yLabel) {
  const ctx = setupCanvas(canvas);

  const maxY = Math.max(...yVals, 1);

  // Para no saturar, ponemos pocas etiquetas en X
  const xTicksCount = Math.min(6, xVals.length);
  const step = Math.max(1, Math.floor(xVals.length / (xTicksCount - 1 || 1)));
  const xTicks = [];
  for (let i = 0; i < xVals.length; i += step) xTicks.push(round2(xVals[i]));
  if (xTicks[xTicks.length - 1] !== round2(xVals[xVals.length - 1])) {
    xTicks.push(round2(xVals[xVals.length - 1]));
  }

  const { plot, yTop } = drawAxesWithTicks(ctx, {
    pad: 50,
    xLabel: "X",
    yLabel: yLabel,
    yMax: maxY,
    yTicksCount: 5,
    xTicks: xTicks
  });

  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);

  const sx = x => plot.left + ((x - minX) / ((maxX - minX) || 1)) * (plot.right - plot.left);
  const sy = y => plot.bottom - (y / yTop) * (plot.bottom - plot.top);

  ctx.strokeStyle = "rgba(52,211,153,.9)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  xVals.forEach((x, i) => {
    const X = sx(x);
    const Y = sy(yVals[i]);
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.stroke();

  // puntos
  ctx.fillStyle = "rgba(52,211,153,.95)";
  xVals.forEach((x, i) => {
    const X = sx(x), Y = sy(yVals[i]);
    ctx.beginPath();
    ctx.arc(X, Y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}


function drawPareto(canvas, values) {
  const ctx = setupCanvas(canvas);

  // Ordenar desc
  const sorted = [...values].sort((a, b) => b.count - a.count);
  if (!sorted.length) return;

  const w = canvas.clientWidth || 900;
  const h = canvas.clientHeight || 300;

  const padL = 60;  // izquierda (fi)
  const padR = 60;  // derecha (%)
  const padB = 50;  // abajo (X)
  const padT = 16;  // arriba

  // Limpiar
  ctx.clearRect(0, 0, w, h);

  // Área
  const plot = {
    left: padL,
    right: w - padR,
    top: padT,
    bottom: h - padB
  };

  // Datos
  const maxFi = Math.max(...sorted.map(d => d.count), 1);
  const total = sorted.reduce((s, d) => s + d.count, 0) || 1;

  // % acumulado
  let cum = 0;
  const cumPct = sorted.map(d => {
    cum += d.count;
    return (100 * cum) / total;
  });

  // Escalas
  const barW = (plot.right - plot.left) / sorted.length;

  const sxBar = i => plot.left + i * barW;
  const syFi = v => plot.bottom - (v / maxFi) * (plot.bottom - plot.top);
  const syPct = p => plot.bottom - (p / 100) * (plot.bottom - plot.top);

  // ---- Rejilla + ejes ----
  // Eje izq (fi) y eje der (%)
  ctx.strokeStyle = "rgba(255,255,255,.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  // eje izquierdo
  ctx.moveTo(plot.left, plot.top);
  ctx.lineTo(plot.left, plot.bottom);
  // eje inferior
  ctx.lineTo(plot.right, plot.bottom);
  // eje derecho
  ctx.moveTo(plot.right, plot.top);
  ctx.lineTo(plot.right, plot.bottom);
  ctx.stroke();

  // Ticks fi (izquierda) -> enteros bonitos
  const yTicks = 5;
  const stepFi = Math.max(1, Math.ceil(maxFi / yTicks));
  const topFi = Math.ceil(maxFi / stepFi) * stepFi;

  ctx.font = "11px ui-monospace, monospace";
  for (let v = 0; v <= topFi; v += stepFi) {
    const y = plot.bottom - (v / topFi) * (plot.bottom - plot.top);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();

    // label izq
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.fillText(String(v), 10, y + 4);
  }

  // Ticks % (derecha) 0..100
  for (let p = 0; p <= 100; p += 20) {
    const y = syPct(p);
    ctx.fillStyle = "rgba(255,255,255,.65)";
    const txt = `${p}%`;
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, plot.right + 8, y + 4);
  }

  // Etiquetas de ejes
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.font = "12px system-ui";
  ctx.fillText("fi", 12, 18);
  ctx.fillText("% acum.", plot.right + 8, 18);

  // ---- Barras ----
  ctx.fillStyle = "rgba(96,165,250,.85)";
  sorted.forEach((d, i) => {
    const x = sxBar(i) + 6;
    const y = syFi(d.count);
    const bh = plot.bottom - y;
    ctx.fillRect(x, y, Math.max(2, barW - 12), bh);
  });

  // ---- Línea acumulada ----
  ctx.strokeStyle = "rgba(167,139,250,.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  cumPct.forEach((p, i) => {
    const X = sxBar(i) + barW / 2;
    const Y = syPct(p);
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.stroke();

  // puntos
  ctx.fillStyle = "rgba(167,139,250,.95)";
  cumPct.forEach((p, i) => {
    const X = sxBar(i) + barW / 2;
    const Y = syPct(p);
    ctx.beginPath();
    ctx.arc(X, Y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // ---- Etiquetas X (pocas para no encimar) ----
  const maxXTicks = 6;
  const every = Math.max(1, Math.ceil(sorted.length / maxXTicks));

  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.font = "11px ui-monospace, monospace";

  for (let i = 0; i < sorted.length; i += every) {
    const label = String(sorted[i].label);
    const X = sxBar(i) + 6;
    ctx.fillText(label, X, plot.bottom + 20);
  }

  // X label
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.font = "12px system-ui";
  ctx.fillText("X", plot.right - 10, h - 12);
}



// ---------- Tallo y hoja ----------
function stemAndLeaf(data) {
  const ints = data.map((x) => Math.round(x));
  const map = new Map();

  for (const v of ints) {
    const stem = Math.trunc(v / 10);
    const leaf = Math.abs(v % 10);
    if (!map.has(stem)) map.set(stem, []);
    map.get(stem).push(leaf);
  }

  const stems = [...map.keys()].sort((a, b) => a - b);
  let out = "Tallo | Hojas\n-------------\n";
  for (const s of stems) {
    const leaves = map
      .get(s)
      .sort((a, b) => a - b)
      .join(" ");
    out += `${String(s).padStart(5, " ")} | ${leaves}\n`;
  }
  return out;
}

// ---------- Conjuntos ----------
function parseSet(raw) {
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function setToArr(s) {
  return [...s].sort((a, b) => String(a).localeCompare(String(b)));
}

// ---------- Probabilidad empírica ----------
function countEvent(data, type, k) {
  let fav = 0;
  for (const x of data) {
    if (type === "ge" && x >= k) fav++;
    if (type === "le" && x <= k) fav++;
    if (type === "eq" && x === k) fav++;
  }
  return fav;
}

// ---------- Factorial/Perm/Comb (BigInt) ----------
function factBig(n) {
  n = BigInt(n);
  if (n < 0n) return null;
  let r = 1n;
  for (let i = 2n; i <= n; i++) r *= i;
  return r;
}

function permBig(n, r) {
  n = BigInt(n);
  r = BigInt(r);
  if (r < 0n || n < 0n || r > n) return null;
  let p = 1n;
  for (let i = 0n; i < r; i++) p *= n - i;
  return p;
}

function combBig(n, r) {
  n = BigInt(n);
  r = BigInt(r);
  if (r < 0n || n < 0n || r > n) return null;
  const p = permBig(n, r);
  const rf = factBig(r);
  return p / rf;
}

// ==============================
// Regla multiplicativa + árbol (texto)
// ==============================
function parseOptions(raw) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildTreeText(stepNames, stepsOptions, maxLines = 350) {
  const has3 = stepsOptions[2] && stepsOptions[2].length > 0;

  let out = "Inicio\n";
  let lines = 1;

  const s1 = stepsOptions[0];
  const s2 = stepsOptions[1];
  const s3 = has3 ? stepsOptions[2] : [];

  for (let i = 0; i < s1.length; i++) {
    const opt1 = s1[i];
    const isLast1 = i === s1.length - 1;

    out += `${isLast1 ? " └─" : " ├─"} ${opt1}\n`;
    lines++;
    if (lines >= maxLines) return out + `\n... (árbol recortado a ${maxLines} líneas)\n`;

    for (let j = 0; j < s2.length; j++) {
      const opt2 = s2[j];
      const isLast2 = j === s2.length - 1;
      const prefix2 = isLast1 ? "   " : " │ ";

      out += `${prefix2}${isLast2 ? " └─" : " ├─"} ${opt2}\n`;
      lines++;
      if (lines >= maxLines) return out + `\n... (árbol recortado a ${maxLines} líneas)\n`;

      if (has3) {
        for (let k = 0; k < s3.length; k++) {
          const opt3 = s3[k];
          const isLast3 = k === s3.length - 1;
          const prefix3 = prefix2 + (isLast2 ? "   " : " │ ");

          out += `${prefix3}${isLast3 ? " └─" : " ├─"} ${opt3}\n`;
          lines++;
          if (lines >= maxLines) return out + `\n... (árbol recortado a ${maxLines} líneas)\n`;
        }
      }
    }
  }

  return out;
}

function renderMultiplicative() {
  const step1Name = document.getElementById("step1Name").value.trim() || "Paso 1";
  const step2Name = document.getElementById("step2Name").value.trim() || "Paso 2";
  const step3Name = document.getElementById("step3Name").value.trim() || "Paso 3";

  const step1 = parseOptions(document.getElementById("step1Opts").value);
  const step2 = parseOptions(document.getElementById("step2Opts").value);
  const step3 = parseOptions(document.getElementById("step3Opts").value);

  if (step1.length < 1 || step2.length < 1) {
    document.getElementById("multOut").textContent =
      "Error: Debes ingresar al menos 1 opción en Paso 1 y Paso 2.";
    return;
  }

  const use3 = step3.length > 0;
  const total = use3
    ? step1.length * step2.length * step3.length
    : step1.length * step2.length;

  const formula = use3
    ? `${step1.length} × ${step2.length} × ${step3.length} = ${total}`
    : `${step1.length} × ${step2.length} = ${total}`;

  const tree = buildTreeText(
    use3 ? [step1Name, step2Name, step3Name] : [step1Name, step2Name],
    use3 ? [step1, step2, step3] : [step1, step2]
  );

  const out =
    `1) Identifica los pasos del proceso:\n` +
    `- ${step1Name}\n` +
    `- ${step2Name}\n` +
    (use3 ? `- ${step3Name}\n` : "") +
    `\n2) Cuenta opciones en cada paso:\n` +
    `- ${step1Name}: ${step1.length} opción(es)\n` +
    `- ${step2Name}: ${step2.length} opción(es)\n` +
    (use3 ? `- ${step3Name}: ${step3.length} opción(es)\n` : "") +
    `\n3) Multiplica:\nTotal = ${formula}\n\n` +
    `Diagrama de árbol (decisiones paso a paso):\n${tree}`;

  document.getElementById("multOut").textContent = out;
}

// ==============================
// Render principal
// ==============================
function renderAll() {
  const warn = document.getElementById("dataWarn");
  warn.style.display = "none";
  warn.textContent = "";

  const data = parseNumbers(document.getElementById("dataInput").value);
  const w = Number(document.getElementById("classWidth").value);

  if (data.length < 20) {
    warn.style.display = "block";
    warn.textContent = "Debes ingresar al menos 20 datos numéricos válidos.";
    return;
  }
  if (!Number.isFinite(w) || w <= 0) {
    warn.style.display = "block";
    warn.textContent = "La amplitud de clase debe ser un número > 0.";
    return;
  }

  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const n = data.length;

  document.getElementById("upsText").textContent =
    `Universo: todos los posibles valores de la variable que estudias.\n` +
    `Población: el conjunto total de elementos de interés.\n` +
    `Muestra: los ${n} datos capturados en esta web.\n\n` +
    `Tus datos van desde ${mn} hasta ${mx}.`;

  document.getElementById("censoText").textContent =
    `Censo: cuando se mide TODA la población.\n` +
    `Muestreo: cuando se toma una parte.\n\n` +
    `Aquí normalmente es muestreo (muestra de ${n}).`;

  document.getElementById("kMin").textContent = round2(mn);
  document.getElementById("kMax").textContent = round2(mx);
  document.getElementById("kRange").textContent = round2(mx - mn);
  document.getElementById("kN").textContent = n;

  const med = median(data);
  const mo = mode(data);
  document.getElementById("extraStats").textContent = `Media=${round2(
    mean(data)
  )}, Mediana=${round2(med)}, Moda=${mo === null ? "Sin moda" : mo}`;

  document.getElementById("stemLeaf").textContent = stemAndLeaf(data);

  const classes = buildClasses(data, w);
  const freq = fillFrequencies(data, classes);
  document.getElementById("freqTable").innerHTML = makeTable(freq);

  drawHistogram(document.getElementById("histCanvas"), freq);
  drawLineChart(
    document.getElementById("polyCanvas"),
    freq.map((r) => r.mid),
    freq.map((r) => r.fi),
    "fi"
  );
  drawLineChart(
    document.getElementById("ogiveCanvas"),
    freq.map((r) => r.b),
    freq.map((r) => r.Fi),
    "Fi"
  );

  const counts = new Map();
  for (const x of data) {
    const k = String(x);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const paretoVals = [...counts.entries()].map(([label, count]) => ({ label, count }));
  drawPareto(document.getElementById("paretoCanvas"), paretoVals);

  const unique = [...new Set(data)].sort((a, b) => a - b);
  document.getElementById("expText").textContent =
    `Experimento: seleccionar 1 dato al azar de la muestra.\n` +
    `Espacio muestral (valores únicos observados):\n` +
    `${unique.join(", ")}\n\n` +
    `Define un evento y calcula su probabilidad empírica.`;

  document.getElementById("probOut").textContent = "—";
}

function renderSets() {
  const A = parseSet(document.getElementById("setA").value);
  const B = parseSet(document.getElementById("setB").value);

  const union = new Set([...A, ...B]);
  const inter = new Set([...A].filter((x) => B.has(x)));
  const diffA = new Set([...A].filter((x) => !B.has(x)));
  const diffB = new Set([...B].filter((x) => !A.has(x)));

  document.getElementById("setsOut").textContent =
    `A = { ${setToArr(A).join(", ")} }\n` +
    `B = { ${setToArr(B).join(", ")} }\n\n` +
    `A ∪ B = { ${setToArr(union).join(", ")} }\n` +
    `A ∩ B = { ${setToArr(inter).join(", ")} }\n` +
    `A − B = { ${setToArr(diffA).join(", ")} }\n` +
    `B − A = { ${setToArr(diffB).join(", ")} }`;
}

function renderProb() {
  const data = parseNumbers(document.getElementById("dataInput").value);
  if (data.length < 20) return;

  const type = document.getElementById("eventType").value;
  const k = Number(document.getElementById("eventK").value);

  const fav = countEvent(data, type, k);
  const n = data.length;
  const p = fav / n;

  const symbol = type === "ge" ? "x ≥ k" : type === "le" ? "x ≤ k" : "x = k";

  document.getElementById("probOut").textContent =
    `Evento E: ${symbol} con k=${k}\n` +
    `Favorables: ${fav}\n` +
    `Total: ${n}\n` +
    `P(E) = ${fav}/${n} = ${p.toFixed(4)} (${(p * 100).toFixed(2)}%)`;
}

function renderCombi() {
  const n = Number(document.getElementById("nVal").value);
  const r = Number(document.getElementById("rVal").value);

  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    document.getElementById("combOut").textContent =
      "Inválido: n y r enteros, n≥0, r≥0 y r≤n.";
    return;
  }

  const f = factBig(n);
  const p = permBig(n, r);
  const c = combBig(n, r);

  document.getElementById("combOut").textContent =
    `${n}! = ${f.toString()}\n` +
    `P(${n},${r}) = ${p.toString()}\n` +
    `C(${n},${r}) = ${c.toString()}`;
}

// ==============================
// Randomizadores por sección
// ==============================
function randomizeMainData() {
  const count = randCount(20, 50);
  const data = makeRandomList(count, 1, 1000);
  setInputValue("dataInput", data.join(", "));

  const w = randInt(1, 200);
  setInputValue("classWidth", w);

  renderAll();
}

function randomizeSets() {
  const countA = randCount(20, 50);
  const countB = randCount(20, 50);

  const A = uniqueInts(countA, 1, 1000);
  const B = uniqueInts(countB, 1, 1000);

  setInputValue("setA", A.join(","));
  setInputValue("setB", B.join(","));

  renderSets();
}

function randomizeProbEvent() {
  const types = ["ge", "le", "eq"];
  const type = pickRandomFromArray(types);

  const data = parseNumbers(document.getElementById("dataInput").value);
  let k = randInt(1, 1000);

  if (data.length > 0) {
    const mn = Math.min(...data);
    const mx = Math.max(...data);
    k = randInt(mn, mx);
  }

  const eventTypeEl = document.getElementById("eventType");
  const eventKEl = document.getElementById("eventK");
  if (eventTypeEl) eventTypeEl.value = type;
  if (eventKEl) eventKEl.value = k;

  renderProb();
}

function randomizeMultiplicative() {
  const namePool = ["Color", "Modelo", "Talla", "Marca", "Tipo", "Ruta", "Opción", "Paquete"];
  setInputValue("step1Name", pickRandomFromArray(namePool));
  setInputValue("step2Name", pickRandomFromArray(namePool));
  setInputValue("step3Name", pickRandomFromArray(namePool));

  // IMPORTANTE: para árbol, 20..25 por paso
  const c1 = randCount(20, 25);
  const c2 = randCount(20, 25);

  // Paso 3 opcional (a veces sí, a veces no), si quieres SIEMPRE, te lo ajusto.
  const use3 = Math.random() < 0.5;
  const c3 = use3 ? randCount(20, 25) : 0;

  const o1 = uniqueInts(c1, 1, 1000).map((x) => `Op${x}`);
  const o2 = uniqueInts(c2, 1, 1000).map((x) => `Op${x}`);
  const o3 = uniqueInts(c3, 1, 1000).map((x) => `Op${x}`);

  setInputValue("step1Opts", o1.join(", "));
  setInputValue("step2Opts", o2.join(", "));
  setInputValue("step3Opts", o3.join(", "));

  renderMultiplicative();
}

function randomizeCombi() {
  // n en 20..50 (BigInt imprimible y usable)
  const n = randInt(20, 50);
  const r = randInt(0, n);

  setInputValue("nVal", n);
  setInputValue("rVal", r);

  renderCombi();
}

// ==============================
// Eventos (listeners)
// ==============================
const runBtn = document.getElementById("runBtn");
if (runBtn) {
  runBtn.addEventListener("click", () => {
    const old = runBtn.textContent;
    runBtn.textContent = "Calculando...";
    runBtn.disabled = true;

    setTimeout(() => {
      renderAll();
      runBtn.textContent = old;
      runBtn.disabled = false;
    }, 60);
  });
}

const demoBtn = document.getElementById("demoBtn");
if (demoBtn) {
  demoBtn.addEventListener("click", () => {
    document.getElementById("dataInput").value =
      "12, 13, 15, 15, 17, 21, 24, 28, 32, 35, 36, 37, 37, 39, 39, 40, 41, 44, 44, 51, 54, 56, 59, 59, 62, 64, 65, 65, 28";
    document.getElementById("classWidth").value = 8;

    renderAll();
    renderSets();
    renderCombi();
    renderMultiplicative();
  });
}

const randDataBtn = document.getElementById("randDataBtn");
if (randDataBtn) randDataBtn.addEventListener("click", randomizeMainData);

const setsBtn = document.getElementById("setsBtn");
if (setsBtn) setsBtn.addEventListener("click", renderSets);

const setsRandBtn = document.getElementById("setsRandBtn");
if (setsRandBtn) setsRandBtn.addEventListener("click", randomizeSets);

const probBtn = document.getElementById("probBtn");
if (probBtn) probBtn.addEventListener("click", renderProb);

const probRandBtn = document.getElementById("probRandBtn");
if (probRandBtn) probRandBtn.addEventListener("click", randomizeProbEvent);

const multBtn = document.getElementById("multBtn");
if (multBtn) multBtn.addEventListener("click", renderMultiplicative);

const multRandBtn = document.getElementById("multRandBtn");
if (multRandBtn) multRandBtn.addEventListener("click", randomizeMultiplicative);

const combBtn = document.getElementById("combBtn");
if (combBtn) combBtn.addEventListener("click", renderCombi);

const combRandBtn = document.getElementById("combRandBtn");
if (combRandBtn) combRandBtn.addEventListener("click", randomizeCombi);

// Primera carga
renderAll();
renderSets();
renderCombi();
renderMultiplicative();
