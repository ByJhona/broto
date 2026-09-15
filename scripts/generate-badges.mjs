import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const SIZE = 32;

function makeCanvas() {
  return { palette: [null], colorIndex: new Map(), pixels: new Array(SIZE * SIZE).fill(0) };
}

function colorIdx(canvas, hex) {
  if (!canvas.colorIndex.has(hex)) {
    canvas.colorIndex.set(hex, canvas.palette.length);
    canvas.palette.push(hex);
  }
  return canvas.colorIndex.get(hex);
}

function setPx(canvas, x, y, hex) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || xi >= SIZE || yi < 0 || yi >= SIZE) return;
  canvas.pixels[yi * SIZE + xi] = colorIdx(canvas, hex);
}

function fillEllipse(c, cx, cy, rx, ry, color) {
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) setPx(c, cx + x, cy + y, color);
    }
  }
}

function fillColumn(c, x, yTop, yBottom, width, color) {
  const half = Math.floor(width / 2);
  for (let y = yTop; y <= yBottom; y++) {
    for (let dx = -half; dx <= width - half - 1; dx++) setPx(c, x + dx, y, color);
  }
}

function drawBlade(c, baseX, baseY, height, widthTop, lean, color) {
  for (let i = 0; i < height; i++) {
    const t = i / height;
    const w = Math.max(1, Math.round(widthTop * (1 - t * 0.65)));
    const x = baseX + lean * t;
    const y = baseY - i;
    for (let dx = -Math.floor(w / 2); dx <= Math.floor(w / 2); dx++) setPx(c, x + dx, y, color);
  }
}

function drawSpike(c, baseX, baseY, length, angleDeg, width, baseColor, tipColor) {
  const angle = (angleDeg * Math.PI) / 180;
  const nx = Math.cos(angle + Math.PI / 2);
  const ny = -Math.sin(angle + Math.PI / 2);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const w = Math.max(1, Math.round(width * (1 - t * 0.8)));
    const x = baseX + Math.cos(angle) * i;
    const y = baseY - Math.sin(angle) * i;
    const color = tipColor && t > 0.85 ? tipColor : baseColor;
    for (let o = -Math.floor(w / 2); o <= Math.floor(w / 2); o++) {
      setPx(c, x + nx * o, y + ny * o, color);
    }
  }
}

function drawFlower5(c, cx, cy, r, petalColor, centerColor) {
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 * Math.PI) / 180;
    const px = cx + Math.cos(angle) * r;
    const py = cy - Math.sin(angle) * r;
    fillEllipse(c, px, py, 1, 1, petalColor);
  }
  setPx(c, cx, cy, centerColor);
}

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const POT_PALETTES = [
  { base: '#C56B4A', shadow: '#9C4F32', rim: '#DE8B65' },
  { base: '#F0ECE3', shadow: '#CFC7B8', rim: '#FFFFFF' },
  { base: '#2B2B2E', shadow: '#17171A', rim: '#45454A' },
  { base: '#2F5D8A', shadow: '#1F4066', rim: '#4E7FAE' },
  { base: '#7C9473', shadow: '#5E7257', rim: '#9DB295' },
  { base: '#D98A96', shadow: '#B96877', rim: '#ECAAB4' },
  { base: '#D4A94B', shadow: '#B08A34', rim: '#E8C878' },
  { base: '#9C9C94', shadow: '#7C7C74', rim: '#B8B8B0' },
  { base: '#2E6E6A', shadow: '#1F4F4C', rim: '#4D908C' },
  { base: '#8A5A3C', shadow: '#6B4229', rim: '#A5714E' },
];

const SOIL = '#4A3222';
const POT_TOP_Y = 23, POT_BOTTOM_Y = 30, POT_TOP_HALF = 8, POT_BOTTOM_HALF = 5, POT_CX = 16;

function potEdgeX(side, y) {
  const t = Math.max(0, Math.min(1, (y - POT_TOP_Y) / (POT_BOTTOM_Y - POT_TOP_Y)));
  const half = POT_TOP_HALF + (POT_BOTTOM_HALF - POT_TOP_HALF) * t;
  return POT_CX + side * half;
}

function drawTrailingVine(c, side, fromY, toY, colorA, colorB) {
  for (let y = fromY; y <= toY; y++) {
    const blobHalf = 7 + (POT_TOP_HALF - 7) * Math.min(1, (y - fromY) / (POT_TOP_Y - fromY));
    const x = y < POT_TOP_Y ? POT_CX + side * blobHalf : potEdgeX(side, y);
    if ((y - fromY) % 2 === 0) fillEllipse(c, x, y, 1, 1, (y - fromY) % 4 === 0 ? colorA : colorB);
  }
}

function drawPot(c, pot) {
  const topY = 23, bottomY = 30, topHalf = 8, bottomHalf = 5, cx = 16;
  for (let y = topY; y <= bottomY; y++) {
    const t = (y - topY) / (bottomY - topY);
    const half = topHalf + (bottomHalf - topHalf) * t;
    const left = Math.round(cx - half);
    const right = Math.round(cx + half);
    for (let x = left; x < right; x++) {
      let color = pot.base;
      if (x === left || x === right - 1) color = pot.shadow;
      if (y === topY) color = pot.rim;
      setPx(c, x, y, color);
    }
  }
  for (let x = cx - topHalf; x < cx + topHalf; x++) setPx(c, x, topY - 1, SOIL);
}

function finalize(canvas) {
  return { size: SIZE, palette: canvas.palette, pixels: canvas.pixels };
}

const badges = [];

function addBadge(index, id, name, description, draw) {
  const canvas = makeCanvas();
  const pot = POT_PALETTES[index % POT_PALETTES.length];
  drawPot(canvas, pot);
  draw(canvas, pot);
  badges.push({ id, name, description, pixelArt: finalize(canvas) });
}

addBadge(0, 'monstera-deliciosa', 'Costela-de-adao',
  'Identifique uma Costela-de-adao para desbloquear este emblema.',
  (c) => {
    fillEllipse(c, 20, 12, 7, 6, '#1F4A2E');
    fillEllipse(c, 12, 10, 7, 6, '#2F6B3F');
    fillEllipse(c, 16, 6, 6, 5, '#4E9A5F');
    for (const [hx, hy] of [[13, 8], [19, 10], [16, 5], [22, 13]]) fillEllipse(c, hx, hy, 1, 1, null);
  });

addBadge(1, 'epipremnum-aureum', 'Jiboia',
  'Identifique uma Jiboia para desbloquear este emblema.',
  (c) => {
    fillEllipse(c, 16, 11, 8, 6, '#2E7D45');
    fillEllipse(c, 13, 8, 3, 2, '#C9D94A');
    fillEllipse(c, 20, 13, 3, 2, '#C9D94A');
    fillEllipse(c, 17, 6, 2, 2, '#6FBF6B');
    drawTrailingVine(c, -1, 15, 27, '#2E7D45', '#C9D94A');
    drawTrailingVine(c, 1, 15, 27, '#2E7D45', '#C9D94A');
  });

addBadge(2, 'dracaena-trifasciata', 'Espada-de-sao-jorge',
  'Identifique uma Espada-de-sao-jorge para desbloquear este emblema.',
  (c) => {
    const heights = [16, 20, 14, 18, 12];
    const offsets = [-6, -3, 0, 3, 6];
    const leans = [-1, 0, 1, 0, -1];
    heights.forEach((h, i) => {
      const color = i % 2 === 0 ? '#1B4D2E' : '#2E7A4A';
      drawBlade(c, 16 + offsets[i], 22, h, 3, leans[i], color);
      for (let y = 22 - h; y < 22 - h + 3; y++) setPx(c, 16 + offsets[i], y, '#D9C24A');
    });
  });

addBadge(3, 'syngonium-podophyllum', 'Singonio',
  'Identifique um Singonio para desbloquear este emblema.',
  (c) => {
    fillEllipse(c, 12, 12, 5, 4, '#3E8C52');
    fillEllipse(c, 20, 11, 5, 4, '#3E8C52');
    fillEllipse(c, 16, 7, 5, 4, '#6FBF6B');
    fillEllipse(c, 12, 12, 2, 1, '#BFE6A8');
    fillEllipse(c, 20, 11, 2, 1, '#BFE6A8');
    fillEllipse(c, 16, 7, 2, 1, '#BFE6A8');
  });

addBadge(4, 'dieffenbachia-seguine', 'Comigo-ninguem-pode',
  'Identifique uma Comigo-ninguem-pode para desbloquear este emblema.',
  (c) => {
    fillEllipse(c, 16, 11, 9, 7, '#2F6B3F');
    fillEllipse(c, 16, 9, 9, 5, '#3E8C52');
    const rng = makeRng(404);
    for (let i = 0; i < 16; i++) {
      const x = 16 + (rng() - 0.5) * 15;
      const y = 11 + (rng() - 0.5) * 11;
      if ((x - 16) ** 2 / 81 + (y - 11) ** 2 / 49 <= 1) setPx(c, x, y, '#E9E4C8');
    }
  });

addBadge(5, 'chrysalidocarpus-lutescens', 'Areca-bambu',
  'Identifique uma Areca-bambu para desbloquear este emblema.',
  (c) => {
    const angles = [55, 75, 95, 115, 135, 40, 150];
    angles.forEach((a, i) => {
      drawSpike(c, 16, 22, 15 - (i % 2), a, 2, i % 2 === 0 ? '#4C7A2A' : '#6FA83E', '#A9D96B');
    });
  });

addBadge(6, 'chamaedorea-elegans', 'Palmeira-rafia',
  'Identifique uma Palmeira-rafia para desbloquear este emblema.',
  (c) => {
    const angles = [70, 90, 110, 130, 50];
    angles.forEach((a, i) => {
      drawSpike(c, 16, 22, 13 - (i % 2) * 2, a, 2, i % 2 === 0 ? '#204F2E' : '#366B3F', null);
    });
  });

addBadge(7, 'rhaphidophora-tetrasperma', 'Costela-de-adao-mini',
  'Identifique uma Costela-de-adao-mini para desbloquear este emblema.',
  (c) => {
    fillEllipse(c, 19, 13, 6, 5, '#2F7A46');
    fillEllipse(c, 13, 11, 6, 5, '#57A868');
    fillEllipse(c, 16, 8, 5, 4, '#7ED18C');
    fillEllipse(c, 13, 11, 1, 1, null);
    fillEllipse(c, 19, 13, 1, 1, null);
  });

addBadge(8, 'scindapsus-aureus', 'Jiboia-prateada',
  'Identifique uma Jiboia-prateada para desbloquear este emblema.',
  (c) => {
    fillEllipse(c, 16, 11, 8, 6, '#5C7A63');
    fillEllipse(c, 16, 8, 6, 4, '#7C9C83');
    const rng = makeRng(808);
    for (let i = 0; i < 14; i++) {
      const x = 16 + (rng() - 0.5) * 15;
      const y = 11 + (rng() - 0.5) * 11;
      if ((x - 16) ** 2 / 64 + (y - 11) ** 2 / 36 <= 1) setPx(c, x, y, '#B9C9B8');
    }
    drawTrailingVine(c, 1, 15, 27, '#5C7A63', '#B9C9B8');
  });

addBadge(9, 'oxalis-triangularis', 'Trevo-roxo',
  'Identifique um Trevo-roxo para desbloquear este emblema.',
  (c) => {
    const stems = [[10, 12], [16, 7], [22, 12], [13, 17], [19, 17]];
    stems.forEach(([sx, sy], i) => {
      for (let y = 22; y > sy; y--) setPx(c, sx + (16 - sx) * ((22 - y) / (22 - sy)) * 0.1, y, '#3E2350');
      fillEllipse(c, sx, sy - 2, 2, 3, '#5B3466');
      fillEllipse(c, sx - 3, sy + 1, 2, 3, '#5B3466');
      fillEllipse(c, sx + 3, sy + 1, 2, 3, '#5B3466');
      fillEllipse(c, sx, sy - 2, 1, 1, '#8A5BA6');
      if (i === 1) drawFlower5(c, sx, sy - 6, 2, '#E38FC0', '#FFD966');
    });
  });

addBadge(10, 'haworthia-attenuata', 'Haworthia-zebra',
  'Identifique uma Haworthia-zebra para desbloquear este emblema.',
  (c) => {
    const angles = [20, 45, 70, 90, 110, 135, 160];
    angles.forEach((a) => {
      drawSpike(c, 16, 23, 7, a, 3, '#1F4A33', null);
    });
    const rng = makeRng(1010);
    for (let i = 0; i < 10; i++) {
      const x = 16 + (rng() - 0.5) * 14;
      const y = 23 - rng() * 8;
      setPx(c, x, y, '#DCE8DE');
    }
  });

addBadge(11, 'beaucarnea-recurvata', 'Pata-de-elefante',
  'Identifique uma Pata-de-elefante para desbloquear este emblema.',
  (c) => {
    fillEllipse(c, 16, 19, 6, 5, '#C9A876');
    fillEllipse(c, 13, 20, 3, 4, '#A8865A');
    const angles = [20, 40, 60, 80, 100, 120, 140, 160, 30, 150];
    angles.forEach((a, i) => {
      drawSpike(c, 16, 14, 11 - (i % 3), a, 1, '#2E6B3E', null);
    });
  });

addBadge(12, 'agave-americana', 'Agave',
  'Identifique uma Agave para desbloquear este emblema.',
  (c) => {
    const angles = [15, 40, 65, 90, 115, 140, 165];
    angles.forEach((a, i) => {
      drawSpike(c, 16, 23, 13 - (i % 2), a, 4, i % 2 === 0 ? '#6E8F94' : '#8AA9AC', '#D9E6E8');
    });
  });

addBadge(13, 'portulacaria-afra', 'Onze-horas',
  'Identifique uma Onze-horas para desbloquear este emblema.',
  (c) => {
    setPx(c, 15, 20, '#8A4A34');
    setPx(c, 15, 21, '#8A4A34');
    setPx(c, 17, 19, '#8A4A34');
    setPx(c, 17, 20, '#8A4A34');
    const rng = makeRng(1313);
    for (let i = 0; i < 40; i++) {
      const x = 16 + (rng() - 0.5) * 15;
      const y = 12 + (rng() - 0.5) * 15;
      if ((x - 16) ** 2 / 64 + (y - 13) ** 2 / 64 <= 1) {
        fillEllipse(c, x, y, 1, 1, i % 3 === 0 ? '#7CC98A' : '#4C8C5A');
      }
    }
  });

addBadge(14, 'adenium-obesum', 'Rosa-do-deserto',
  'Identifique uma Rosa-do-deserto para desbloquear este emblema.',
  (c) => {
    fillEllipse(c, 16, 20, 5, 4, '#C9A876');
    fillEllipse(c, 13, 21, 2, 3, '#A8865A');
    fillEllipse(c, 12, 15, 4, 3, '#2E6B3F');
    fillEllipse(c, 20, 15, 4, 3, '#2E6B3F');
    drawFlower5(c, 12, 10, 2, '#E85D8A', '#FFD966');
    drawFlower5(c, 19, 9, 2, '#E85D8A', '#FFD966');
    drawFlower5(c, 16, 6, 2, '#F2789E', '#FFD966');
  });

addBadge(15, 'hibiscus-rosa-sinensis', 'Hibisco',
  'Identifique um Hibisco para desbloquear este emblema.',
  (c) => {
    fillEllipse(c, 14, 13, 6, 6, '#2F6B3F');
    fillEllipse(c, 20, 11, 5, 5, '#4E9A5F');
    drawFlower5(c, 20, 7, 3, '#D8354A', '#F2C230');
    setPx(c, 20, 4, '#F2C230');
    drawFlower5(c, 11, 8, 3, '#E85D6E', '#F2C230');
    setPx(c, 11, 5, '#F2C230');
  });

addBadge(16, 'guzmania-lingulata', 'Bromelia',
  'Identifique uma Bromelia para desbloquear este emblema.',
  (c) => {
    const angles = [25, 50, 75, 105, 130, 155];
    angles.forEach((a) => {
      drawSpike(c, 16, 23, 10, a, 3, '#2F6B4A', null);
    });
    fillEllipse(c, 16, 12, 2, 5, '#E8562E');
    fillEllipse(c, 16, 8, 2, 3, '#F2823E');
  });

addBadge(17, 'gymnocalycium-mihanovichii', 'Cacto-bola',
  'Identifique um Cacto-bola para desbloquear este emblema.',
  (c) => {
    fillEllipse(c, 16, 19, 6, 5, '#2F6B3F');
    fillEllipse(c, 16, 12, 4, 3, '#E23F7A');
    for (let dx = -5; dx <= 5; dx += 2) setPx(c, 16 + dx, 19, '#4E9A5F');
    for (let dx = -3; dx <= 3; dx += 2) setPx(c, 16 + dx, 12, '#F27AA0');
    setPx(c, 14, 10, '#F2E6A8');
    setPx(c, 18, 10, '#F2E6A8');
  });

addBadge(18, 'mammillaria-elongata', 'Cacto-coluna',
  'Identifique um Cacto-coluna para desbloquear este emblema.',
  (c) => {
    const cols = [[9, 12], [13, 10], [17, 9], [21, 11], [24, 13]];
    const rng = makeRng(1818);
    cols.forEach(([x, h], i) => {
      fillColumn(c, x, 23 - h, 22, 3, i % 2 === 0 ? '#3E8C52' : '#6FBF6B');
      for (let y = 23 - h; y < 22; y += 2) {
        setPx(c, x - 2, y, '#E8C24A');
        setPx(c, x + 2, y, '#E8C24A');
      }
      if (rng() > 0.5) drawFlower5(c, x, 23 - h - 2, 1, '#E85D8A', '#FFD966');
    });
  });

addBadge(19, 'dionaea-muscipula', 'Dionea',
  'Identifique uma Dionea para desbloquear este emblema.',
  (c) => {
    const stalks = [[9, 7], [16, 10], [23, 7]];
    stalks.forEach(([x, h]) => {
      fillColumn(c, x, 23 - h, 22, 1, '#2E6B3F');
      const top = 23 - h;
      fillEllipse(c, x - 3, top - 1, 3, 2, '#3E8C52');
      fillEllipse(c, x + 3, top - 1, 3, 2, '#3E8C52');
      fillEllipse(c, x, top - 1, 2, 1, '#C9273D');
      for (let t = -1; t <= 1; t++) {
        setPx(c, x - 5 + t, top - 2, '#E8D9A8');
        setPx(c, x + 5 - t, top - 2, '#E8D9A8');
      }
    });
  });

if (badges.length !== 20) throw new Error(`expected 20 badges, got ${badges.length}`);

writeFileSync(
  new URL('./badges-data.json', import.meta.url),
  JSON.stringify(badges, null, 2)
);

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let cc = n;
      for (let k = 0; k < 8; k++) cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1;
      t[n] = cc >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

const SCALE = 8;
const CELL = SIZE * SCALE;
const GAP = 10;
const COLS = 5;
const ROWS = 4;
const bgRgb = [230, 230, 226];
const width = COLS * CELL + (COLS + 1) * GAP;
const height = ROWS * CELL + (ROWS + 1) * GAP;
const rgba = Buffer.alloc(width * height * 4);

for (let py = 0; py < height; py++) {
  for (let px = 0; px < width; px++) {
    const idx = (py * width + px) * 4;
    rgba[idx] = bgRgb[0]; rgba[idx + 1] = bgRgb[1]; rgba[idx + 2] = bgRgb[2]; rgba[idx + 3] = 255;
  }
}

badges.forEach((badge, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const originX = GAP + col * (CELL + GAP);
  const originY = GAP + row * (CELL + GAP);
  const { palette, pixels } = badge.pixelArt;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const colorHex = palette[pixels[y * SIZE + x]];
      if (!colorHex) continue;
      const [r, g, b] = hexToRgb(colorHex);
      for (let sy = 0; sy < SCALE; sy++) {
        for (let sx = 0; sx < SCALE; sx++) {
          const px = originX + x * SCALE + sx;
          const py = originY + y * SCALE + sy;
          const idx = (py * width + px) * 4;
          rgba[idx] = r; rgba[idx + 1] = g; rgba[idx + 2] = b; rgba[idx + 3] = 255;
        }
      }
    }
  }
});

const png = encodePNG(width, height, rgba);
writeFileSync(new URL('./badges-preview.png', import.meta.url), png);

console.log(badges.map((b, i) => `${i}: ${b.id} (${b.name})`).join('\n'));
console.log(`preview: badges-preview.png (${width}x${height})`);
