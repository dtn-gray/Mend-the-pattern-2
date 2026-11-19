// Layout and material accounting for the p5.js sketch.
const loom = {
  width: 1080,
  height: 730,
  left: 56,
  top: 45,
  columns: 108,
  rows: 72,
  step: 9,
  bands: 12,
};

function makeCloth(seed) {
  randomSeed(seed);
  noiseSeed(seed);

  // Keep the classroom example and other original four-digit editions replayable.
  const original = seed < 10000;
  const horizontal = !original && random() < 0.5;
  const length = horizontal ? loom.columns : loom.rows;
  const breadth = horizontal ? loom.rows : loom.columns;
  const alongStart = horizontal ? loom.left : loom.top;
  const acrossStart = horizontal ? loom.top : loom.left;
  const span = (breadth - 1) * loom.step;
  const acrossEnd = acrossStart + span;
  const placement = original ? 0 : random(0.26, 0.74);
  const slant = original ? 0 : random(-0.24, 0.24);
  const phase = original ? 0 : random(0, Math.PI * 2);

  const rows = [];
  const scraps = [];
  for (let row = 0; row < length; row++) {
    const y = alongStart + row * loom.step;
    const progress = row / (length - 1);
    const base = original ? 675 - row * 3.6 : acrossStart + span * (placement + slant * (progress - 0.5));
    const roughCenter = base + 108 * (noise(row * 0.09) - 0.5)
      + 26 * Math.sin(row * 0.15 + phase);
    const halfWidth = 13 + 72 * noise(row * 0.125 + 36);
    const margin = halfWidth + 36;
    const center = original ? roughCenter
      : Math.min(acrossEnd - margin, Math.max(acrossStart + margin, roughCenter));
    const left = center - halfWidth;
    const right = center + halfWidth;
    const fibers = [];

    for (let column = 0; column < breadth; column++) {
      const x = acrossStart + column * loom.step;
      const length = Math.round(random(5, 13));
      if (x > left && x < right) {
        if (random() < 0.275) scraps.push(length);
      } else {
        fibers.push({ column, x, length });
      }
    }
    rows.push({ index: row, y, left, right, fibers });
  }

  const recovered = scraps.reduce((total, length) => total + length, 0);
  return { rows, recovered, horizontal, acrossStart, acrossEnd };
}

function makeStitch(row) {
  const slope = row.index % 4 < 2 ? -1 : 1;
  const start = { x: row.left - 18, y: row.y + 4 * slope };
  const bend = { x: row.left + (row.right - row.left) * 0.47, y: row.y + 3 * slope };
  const end = { x: row.right + 18, y: row.y - 6 * slope };
  const pathLength = Math.hypot(bend.x - start.x, bend.y - start.y)
    + Math.hypot(end.x - bend.x, end.y - bend.y);
  return {
    index: row.index,
    points: [start, bend, end],
    cost: Math.ceil(pathLength) + 14, // Allow seven units for a knot tail at each end.
  };
}

function planRepair(cloth, strategy) {
  const rows = cloth.rows.slice(1, -1);
  // Concentrate starts where the gap is widest.
  const widest = rows.reduce((best, row) => row.right - row.left > best.right - best.left ? row : best);
  const rowPerBand = cloth.rows.length / loom.bands;
  const bandOf = (index) => Math.floor(index / rowPerBand);
  const bandCenter = Math.floor((rowPerBand - 1) / 2);
  const inBandPriority = (row) => Math.abs(row.index % rowPerBand - bandCenter);
  const repairRadius = Math.round(cloth.rows.length / 6);
  const bandOrder = [0, 11, 6, 3, 9, 1, 8, 4, 10, 2, 7, 5];
  rows.sort((a, b) => {
    if (strategy === 'concentrate') {
      return Math.abs(a.index - widest.index) - Math.abs(b.index - widest.index);
    }
    return inBandPriority(a) - inBandPriority(b)
      || bandOrder.indexOf(bandOf(a.index)) - bandOrder.indexOf(bandOf(b.index));
  });

  const stitches = [];
  const coverage = Array(loom.bands).fill(false);
  let remaining = cloth.recovered;

  for (const row of rows) {
    if (strategy === 'concentrate' && Math.abs(row.index - widest.index) > repairRadius) break;
    const stitch = makeStitch(row);
    if (stitch.cost > remaining) continue;
    stitches.push(stitch);
    coverage[bandOf(row.index)] = true;
    remaining -= stitch.cost;
  }

  stitches.sort((a, b) => a.index - b.index);
  return { stitches, coverage, used: cloth.recovered - remaining, remaining };
}
