// Visual reference: https://flowerseed.io/ — luminous colors on black and a
// saturated accent against the main color. The thread rendering is original.
const maxSeed = 0xffffffff;
const recentSeedKey = 'mend-the-pattern:recent-weaves';
let seed;
let recentSeeds = [];
let strategy = new URLSearchParams(location.search).get('repair') === 'concentrate' ? 'concentrate' : 'spread';
let cloth;
let repair;

const palettes = [
  { name: 'Violet Poppy', yarns: ['#352b87', '#6054f8', '#a99bff', '#3c729e'], light: ['#f46bfa', '#67cfff'], stitch: '#ff8266' },
  { name: 'Blue Aster', yarns: ['#164766', '#368fe7', '#95d4ff', '#39aa72'], light: ['#68a3ff', '#8feaca'], stitch: '#ff659e' },
  { name: 'Lime Clover', yarns: ['#354b24', '#a2c73b', '#e3ff9b', '#5a70e7'], light: ['#ffeb8d', '#acf978'], stitch: '#8b9dff' },
  { name: 'Ivory Hellebore', yarns: ['#44492e', '#93955d', '#f5f1df', '#c9ac78'], light: ['#ffe5b3', '#d9e7cf'], stitch: '#ffae72' },
  { name: 'Coral Poppy', yarns: ['#76342e', '#ed664d', '#ffae85', '#9e4eae'], light: ['#ffb182', '#f084d5'], stitch: '#ffe185' },
  { name: 'Mint Orchid', yarns: ['#245b50', '#3bc1a0', '#a1f9d8', '#3272c1'], light: ['#f1fd9d', '#89dcff'], stitch: '#ff9de0' },
  { name: 'Pink Cosmos', yarns: ['#713258', '#d85ba1', '#ffabd8', '#7947d3'], light: ['#ffdc9c', '#f089ff'], stitch: '#aafe9f' },
  { name: 'Golden Marigold', yarns: ['#754526', '#e79926', '#ffe58c', '#da614f'], light: ['#ffe6a4', '#ffb582'], stitch: '#8ff2ea' },
];

const motifs = [
  { name: 'Diamonds', band(u, v) {
    const diamond = Math.abs(u - 0.5) + Math.abs(v - 0.5);
    if ((diamond > 0.45 && diamond < 0.56) || (v > 0.82 && v < 0.91)) return 2;
    if (diamond < 0.37 || v < 0.14) return 1;
    return diamond > 0.69 && diamond < 0.78 ? 3 : 0;
  } },
  { name: 'Herringbone', band(u, v) {
    const track = (v * 2 + Math.abs(u - 0.5) * 1.65) % 1;
    return track < 0.2 ? 2 : track < 0.42 ? 1 : track < 0.52 ? 3 : 0;
  } },
  { name: 'Basket Check', band(u, v) {
    const column = Math.floor(u * 2);
    const row = Math.floor(v * 2);
    if (u % 0.5 < 0.075 || v % 0.5 < 0.075) return 3;
    return column === row ? 2 : (column === 1 ? 1 : 0);
  } },
  { name: 'Ripple', band(u, v) {
    const wave = (v * 2 + 1 + 0.28 * Math.sin(u * Math.PI * 2)) % 1;
    return wave < 0.16 ? 2 : wave < 0.36 ? 3 : wave < 0.64 ? 1 : 0;
  } },
  { name: 'Windowpane', band(u, v) {
    const vertical = Math.min(u, 1 - u);
    const horizontal = Math.abs(v - 0.5);
    if (vertical < 0.085 || horizontal < 0.085) return 2;
    if (vertical < 0.16 || horizontal < 0.16) return 1;
    return vertical > 0.34 && horizontal > 0.29 ? 3 : 0;
  } },
  { name: 'Broken Twill', band(u, v) {
    const diagonal = (u * 2 + (u < 0.5 ? v : 1 - v)) % 1;
    if (Math.abs(u - 0.5) < 0.065) return 3;
    return diagonal < 0.21 ? 2 : diagonal < 0.48 ? 1 : 0;
  } },
];

function editionStyle(value) {
  // The original four-digit seeds can still replay the violet diamond editions.
  const slot = value < 10000 ? 0 : value;
  return {
    palette: palettes[slot % palettes.length],
    motif: motifs[Math.floor(slot / palettes.length) % motifs.length],
  };
}

function seedHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(recentSeedKey));
    if (Array.isArray(saved)) return saved.filter((value) => (
      Number.isInteger(value) && value >= 0 && value <= maxSeed
    ));
  } catch {
    // In-memory history still works when browser storage is disabled.
  }
  return recentSeeds;
}

function chooseFreshSeed() {
  const recentStyles = seedHistory().map(editionStyle);
  const usedPalettes = new Set(recentStyles.slice(0, palettes.length - 1).map(({ palette }) => palette));
  const usedMotifs = new Set(recentStyles.slice(0, motifs.length - 1).map(({ motif }) => motif));
  let candidate;
  let style;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
    candidate = values[0];
    style = editionStyle(candidate);
  } while (candidate < 10000 || usedPalettes.has(style.palette) || usedMotifs.has(style.motif));
  setSeed(candidate);
}

function setSeed(value) {
  seed = value;
  recentSeeds = [value, ...seedHistory()].slice(0, Math.max(palettes.length, motifs.length) - 1);
  try {
    localStorage.setItem(recentSeedKey, JSON.stringify(recentSeeds));
  } catch {
    // The current tab can still rotate through palettes and motifs.
  }
}

function setup() {
  pixelDensity(1);
  const canvas = createCanvas(loom.width, loom.height);
  canvas.parent('artwork');
  canvas.elt.setAttribute('role', 'img');
  canvas.elt.setAttribute('aria-label', 'Generative woven textile');
  canvas.elt.setAttribute('aria-describedby', 'artwork-description');
  document.querySelector('#artwork-placeholder').hidden = true;
  noLoop();
  chooseFreshSeed();
  saveStrategy();
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      chooseFreshSeed();
      redraw();
    }
  });

  const strategyPicker = document.querySelector('#strategy');
  strategyPicker.disabled = false;
  document.querySelector('#' + strategy).checked = true;
  strategyPicker.addEventListener('change', (event) => {
    strategy = event.target.value;
    saveStrategy();
    redraw();
  });

  const newTear = document.querySelector('#new-tear');
  newTear.disabled = false;
  newTear.addEventListener('click', () => {
    chooseFreshSeed();
    redraw();
  });

  const seedInput = document.querySelector('#seed');
  seedInput.disabled = false;
  seedInput.addEventListener('input', () => seedInput.setCustomValidity(''));
  document.querySelector('#apply-seed').disabled = false;
  document.querySelector('#seed-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const requested = Number(seedInput.value);
    if (!Number.isInteger(requested) || requested < 0 || requested > maxSeed) {
      seedInput.setCustomValidity('Enter a whole number between 0 and 4294967295.');
      seedInput.reportValidity();
      return;
    }
    setSeed(requested);
    redraw();
  });
  const saveButton = document.querySelector('#save-weave');
  saveButton.disabled = false;
  saveButton.addEventListener('click', () => {
    saveCanvas(canvas, 'mend-the-pattern-' + seed + '-' + strategy, 'png');
  });

  enableSoundPreviews(() => ({ cloth, repair }));
}

function draw() {
  cloth = makeCloth(seed);
  repair = planRepair(cloth, strategy);
  randomSeed(seed + 197);

  background(0);
  const pattern = {
    ...editionStyle(seed),
    columns: Math.floor(random(20, 36)),
    rows: Math.floor(random(18, 30)),
    phase: Math.floor(random(4, 19)),
    lightPhase: random(TWO_PI),
    crest: random(230, 420),
  };
  const [warm, cool] = pattern.palette.light;
  pattern.warm = color(warm);
  pattern.cool = color(cool);
  pattern.yarns = pattern.palette.yarns.map((ink) => color(ink));
  drawSwatch(cloth, pattern);
  drawRepair(repair, pattern.palette, cloth.horizontal);
  softenLight();
  updateLedger(pattern);
}

function softenLight() {
  const wovenImage = get();
  background('#050505');
  push();
  drawingContext.filter = 'blur(15px)';
  tint(255, 100);
  image(wovenImage, 0, 0);
  drawingContext.filter = 'blur(0.65px)';
  blendMode(SCREEN);
  noTint();
  image(wovenImage, 0, 0);
  pop();
}

function drawSwatch({ rows, horizontal, acrossStart, acrossEnd }, pattern) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  push();
  if (horizontal) applyMatrix(0, 1, 1, 0, 0, 0);
  noStroke();
  fill(lerpColor(pattern.yarns[0], color('#090612'), 0.65));
  beginShape();
  vertex(acrossStart - 5, first.y - 4);
  for (const row of rows) vertex(row.left, row.y);
  vertex(acrossStart - 4, last.y + 6);
  endShape(CLOSE);
  beginShape();
  vertex(acrossEnd + 5, first.y - 4);
  for (const row of rows) vertex(row.right, row.y);
  vertex(acrossEnd + 5, last.y + 6);
  endShape(CLOSE);
  pop();

  for (const row of rows) {
    for (const fiber of row.fibers) drawFiber(row, fiber, pattern, horizontal);
    drawFray(row, pattern.palette, horizontal);
  }
}

function drawFiber(row, fiber, pattern, horizontalTear) {
  const column = horizontalTear ? row.index : fiber.column;
  const level = horizontalTear ? fiber.column : row.index;
  const band = (level + pattern.phase) % pattern.rows;
  const heightPhase = band / pattern.rows;
  const widthPhase = ((column + pattern.phase) % pattern.columns) / pattern.columns;
  const tone = pattern.motif.band(widthPhase, heightPhase);

  const x = (horizontalTear ? row.y : fiber.x) + random(-1.35, 1.35);
  const y = (horizontalTear ? fiber.x : row.y) + random(-1.45, 1.45);
  const horizontal = (column + 2 * level) % 5 < 3;
  const halfLength = fiber.length / 2 + 1;
  const dx = horizontal ? halfLength : random(-0.9, 0.9);
  const dy = horizontal ? random(-0.7, 0.7) : halfLength;
  const weight = random(4.3, 6.9);
  const base = lerpColor(pattern.yarns[tone], pattern.yarns[(tone + 1) % 4], random(0, 0.23));
  // Two broad reflections travel across individual fibers, suggesting folds.
  const lightY = pattern.crest + 100 * Math.sin(x * 0.006 + pattern.lightPhase);
  const reflected = Math.exp(-Math.pow((y - lightY) / 67, 2));
  const rim = Math.exp(-Math.pow((y - lightY + 150) / 48, 2));
  const reflection = lerpColor(pattern.warm, pattern.cool, x / loom.width);
  const ink = lerpColor(base, reflection, reflected * 0.6 + rim * 0.22);

  stroke('#100b24');
  strokeWeight(weight + 2.6);
  line(x - dx, y - dy + 1.55, x + dx, y + dy + 1.55);
  stroke(ink);
  strokeWeight(weight);
  line(x - dx, y - dy, x + dx, y + dy);
  stroke(224, 213, 255, random(22, 90) + reflected * 81);
  strokeWeight(0.95);
  line(x - dx, y - dy - 1, x + dx, y + dy - 1);
}

function drawFray(row, palette, horizontal) {
  push();
  if (horizontal) applyMatrix(0, 1, 1, 0, 0, 0);
  const width = row.right - row.left;
  const length = random(3, width * 0.21);
  strokeWeight(random(0.75, 2.1));
  stroke(palette.yarns[1]);
  line(row.left - 5, row.y, row.left + length, row.y + random(-4, 4));
  stroke(palette.yarns[2]);
  line(row.right + 5, row.y + 3, row.right - length * 0.8, row.y + random(-3, 7));
  pop();
}

function drawRepair({ stitches }, palette, horizontal) {
  push();
  if (horizontal) applyMatrix(0, 1, 1, 0, 0, 0);
  const stitchColor = color(palette.stitch);
  const highlight = lerpColor(stitchColor, color('#fff5e9'), 0.61);
  for (const stitch of stitches) {
    const [start, bend, end] = stitch.points;
    const tone = lerpColor(stitchColor, highlight, random(0, 0.3));
    const weight = random(6.3, 8.1);
    noFill();
    stroke('#181817');
    strokeWeight(weight + 4);
    line(start.x, start.y + 2, bend.x, bend.y + 2);
    line(bend.x, bend.y + 2, end.x, end.y + 2);
    stroke(red(tone), green(tone), blue(tone), 66);
    strokeWeight(weight + 9);
    line(start.x, start.y, bend.x, bend.y);
    line(bend.x, bend.y, end.x, end.y);
    stroke(tone);
    strokeWeight(weight);
    line(start.x, start.y, bend.x, bend.y);
    line(bend.x, bend.y, end.x, end.y);
    stroke(highlight);
    strokeWeight(1.4);
    line(start.x, start.y - 1, bend.x, bend.y - 1);
    line(bend.x, bend.y - 1, end.x, end.y - 1);

    fill(tone);
    stroke(lerpColor(stitchColor, color('#130c15'), 0.68));
    strokeWeight(1.4);
    ellipse(start.x, start.y, 9, 6);
    ellipse(end.x, end.y, 9, 6);
    stroke(tone);
    strokeWeight(1.5);
    line(start.x, start.y, start.x - 6, start.y - 3);
    line(end.x, end.y, end.x + 6, end.y + 3);
    stroke(highlight);
    strokeWeight(2.4);
    point(start.x - 1, start.y - 1);
    point(end.x - 1, end.y - 1);
  }
  pop();
}

function saveStrategy() {
  if (location.protocol === 'file:') return;
  const url = new URL(location.href);
  url.searchParams.delete('seed');
  url.searchParams.set('repair', strategy);
  history.replaceState(null, '', url);
}

function updateLedger({ palette, motif }) {
  const covered = repair.coverage.filter(Boolean).length;
  document.querySelector('#seed').value = String(seed).padStart(4, '0');
  document.querySelector('#weave-style').textContent = palette.name + ' / ' + motif.name;
  document.querySelector('.gallery').style.setProperty('--weave-accent', palette.stitch);
  document.querySelector('#recovered').textContent = cloth.recovered.toLocaleString('en-US');
  document.querySelector('#used').textContent = repair.used.toLocaleString('en-US');
  document.querySelector('#remaining').textContent = repair.remaining.toLocaleString('en-US');
  document.querySelector('#used-bar').style.width = 100 * repair.used / Math.max(1, cloth.recovered) + '%';
  document.querySelector('#reach').textContent = covered + ' / ' + loom.bands;
  const blocks = repair.coverage.map((reached) => {
    const block = document.createElement('span');
    block.classList.toggle('reached', reached);
    return block;
  });
  document.querySelector('#seam-map').replaceChildren(...blocks);

  const strategyName = strategy === 'concentrate' ? 'Concentrate' : 'Spread';
  document.querySelector('#artwork-description').textContent =
    'Edition ' + seed + '. ' + palette.name + ' palette, ' + motif.name + ' weave with an irregular '
    + (cloth.horizontal ? 'horizontal' : 'vertical') + ' tear. '
    + strategyName + ' places ' + repair.stitches.length + ' contrasting stitches across '
    + covered + ' of ' + loom.bands + ' bands. ' + repair.remaining + ' thread units remain.';
}
