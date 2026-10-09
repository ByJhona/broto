const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const bold = opentype.loadSync(path.join(__dirname, 'fonts', 'Fredoka-Bold.ttf'));
const semi = opentype.loadSync(path.join(__dirname, 'fonts', 'Fredoka-SemiBold.ttf'));

const COLORS = {
  ink: '#1C1C1C',
  cream: '#FAF5EB',
  leaf: '#455F40',
  lightLeaf: '#A9C79A',
  night: '#0F140F',
  white: '#FFFFFF',
};

const CAP = 100;
const LINE_GAP_RATIO = 0.14;
const BLOCK_GAP_RATIO = 0.16;

function capHeight(font) {
  return font.tables.os2.sCapHeight;
}

function layoutWord(font, text, capPx) {
  const size = (capPx / capHeight(font)) * font.unitsPerEm;
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  let x = 0;
  const placed = glyphs.map((glyph, index) => {
    const item = { glyph, x };
    const kerning = index < glyphs.length - 1 ? font.getKerningValue(glyph, glyphs[index + 1]) : 0;
    x += (glyph.advanceWidth + kerning) * scale;
    return item;
  });
  const probe = new opentype.Path();
  placed.forEach((item) => probe.extend(item.glyph.getPath(item.x, capPx, size)));
  const box = probe.getBoundingBox();
  return { size, placed, box, width: box.x2 - box.x1, cap: capPx };
}

function glyphPath(word, index, left, top) {
  const item = word.placed[index];
  return item.glyph.getPath(left + item.x - word.box.x1, top + word.cap, word.size);
}

function wordPath(word, left, top) {
  const result = new opentype.Path();
  word.placed.forEach((_, index) => result.extend(glyphPath(word, index, left, top)));
  return result;
}

const STEM_BEND = 3;
const RIGHT_LEAF = { angle: 30, length: 46, width: 16.5, rise: 4 };
const LEFT_LEAF = { angle: 22, length: 38, width: 13.5, rise: 7 };

function leafPath(baseX, baseY, direction, leaf) {
  const radians = (leaf.angle * Math.PI) / 180;
  const along = { x: Math.cos(radians), y: -Math.sin(radians) };
  const up = { x: -Math.sin(radians), y: -Math.cos(radians) };
  const point = (x, y) => {
    const dx = x * leaf.length;
    const dy = y * leaf.width;
    return [baseX + direction * (dx * along.x + dy * up.x), baseY + dx * along.y + dy * up.y];
  };
  const shape = new opentype.Path();
  shape.moveTo(...point(0, 0));
  shape.curveTo(...point(0.12, 1.15), ...point(0.62, 1.45), ...point(1, (0.1 * leaf.length) / leaf.width));
  shape.curveTo(...point(0.86, -0.55), ...point(0.3, -0.85), ...point(0, 0));
  shape.close();
  return shape;
}

function stemPath(centerX, top, bottom, halfWidth) {
  const middle = (top + bottom) / 2;
  const topX = centerX + STEM_BEND;
  const stem = new opentype.Path();
  stem.moveTo(centerX - halfWidth, bottom - halfWidth);
  stem.quadTo(centerX - halfWidth, middle, topX - halfWidth, top + halfWidth);
  stem.quadTo(topX - halfWidth, top, topX, top);
  stem.quadTo(topX + halfWidth, top, topX + halfWidth, top + halfWidth);
  stem.quadTo(centerX + halfWidth, middle, centerX + halfWidth, bottom - halfWidth);
  stem.quadTo(centerX + halfWidth, bottom, centerX, bottom);
  stem.quadTo(centerX - halfWidth, bottom, centerX - halfWidth, bottom - halfWidth);
  stem.close();
  return stem;
}

function sprout(centerX, stemBottom) {
  const top = -12;
  const leafX = centerX + STEM_BEND;
  return [
    stemPath(centerX, top, stemBottom, 6),
    leafPath(leafX, top + LEFT_LEAF.rise, -1, LEFT_LEAF),
    leafPath(leafX, top + RIGHT_LEAF.rise, 1, RIGHT_LEAF),
  ];
}

function centerOf(pathObject) {
  const box = pathObject.getBoundingBox();
  return (box.x1 + box.x2) / 2;
}

function innerNotchTop(glyph) {
  const box = glyph.getBoundingBox();
  const center = (box.x1 + box.x2) / 2;
  const nearCenter = glyph.commands.filter((c) => c.y !== undefined && Math.abs(c.x - center) < (box.x2 - box.x1) * 0.12 && c.y > box.y1 + 1);
  return Math.min(...nearCenter.map((c) => c.y));
}

function unionBox(paths) {
  const boxes = paths.map((p) => p.getBoundingBox());
  return {
    x1: Math.min(...boxes.map((b) => b.x1)),
    y1: Math.min(...boxes.map((b) => b.y1)),
    x2: Math.max(...boxes.map((b) => b.x2)),
    y2: Math.max(...boxes.map((b) => b.y2)),
  };
}

function lockup() {
  const lineGap = CAP * LINE_GAP_RATIO;
  const lineCap = (CAP - lineGap) / 2;
  const muda = layoutWord(bold, 'MUDA', CAP);
  const vai = layoutWord(semi, 'VAI', lineCap);
  const vem = layoutWord(semi, 'VEM', lineCap);
  const rightX = muda.width + CAP * BLOCK_GAP_RATIO;
  const text = new opentype.Path();
  [wordPath(muda, 0, 0), wordPath(vai, rightX, 0), wordPath(vem, rightX, lineCap + lineGap)].forEach((p) => text.extend(p));
  const sproutParts = sprout(centerOf(glyphPath(muda, 1, 0, 0)), 55);
  return { text, sprout: sproutParts, sproutBehind: false, box: unionBox([text, ...sproutParts]) };
}

function symbol() {
  const m = layoutWord(bold, 'M', CAP);
  const text = wordPath(m, 0, 0);
  const sproutParts = sprout(centerOf(text), innerNotchTop(text) + 16);
  return { text, sprout: sproutParts, sproutBehind: true, box: unionBox([text, ...sproutParts]) };
}

function shapes(mark, textFill, sproutFill) {
  const textShape = `<path fill="${textFill}" d="${mark.text.toPathData(2)}"/>`;
  const sproutShapes = mark.sprout.map((part) => `<path fill="${sproutFill}" d="${part.toPathData(2)}"/>`).join('');
  return mark.sproutBehind ? sproutShapes + textShape : textShape + sproutShapes;
}

function placed(mark, size, maxWidth, maxHeight) {
  const width = mark.box.x2 - mark.box.x1;
  const height = mark.box.y2 - mark.box.y1;
  const scale = Math.min(maxWidth / width, maxHeight / height);
  const tx = (size - width * scale) / 2 - mark.box.x1 * scale;
  const ty = (size - height * scale) / 2 - mark.box.y1 * scale;
  return `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})`;
}

function squareSvg(mark, { textFill, sproutFill, background, radius = 0, fill = 0.86 }) {
  const size = 1000;
  const rect = background ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>` : '';
  const transform = placed(mark, size, size * fill, size * fill);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Muda Vai Vem">${rect}<g transform="${transform}">${shapes(mark, textFill, sproutFill)}</g></svg>\n`;
}

function wideSvg(mark, { textFill, sproutFill, padding = 4 }) {
  const width = mark.box.x2 - mark.box.x1 + padding * 2;
  const height = mark.box.y2 - mark.box.y1 + padding * 2;
  const transform = `translate(${(padding - mark.box.x1).toFixed(2)} ${(padding - mark.box.y1).toFixed(2)})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}" role="img" aria-label="Muda Vai Vem"><g transform="${transform}">${shapes(mark, textFill, sproutFill)}</g></svg>\n`;
}

function write(relativePath, content) {
  const target = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
}

async function png(svgText, relativePath, width, height = width) {
  const target = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await sharp(Buffer.from(svgText), { density: 300 }).resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(target);
}

function shareImageSvg(mark, width = 1200, height = 630, markWidth = 640) {
  const scale = markWidth / (mark.box.x2 - mark.box.x1);
  const markHeight = (mark.box.y2 - mark.box.y1) * scale;
  const slogan = wordPath(layoutWord(semi, 'muda vai, muda vem', (34 * markWidth) / 640), 0, 0);
  const sloganBox = slogan.getBoundingBox();
  const gap = (56 * markWidth) / 640;
  const top = (height - markHeight - gap - (sloganBox.y2 - sloganBox.y1)) / 2;
  const markX = (width - markWidth) / 2 - mark.box.x1 * scale;
  const markY = top - mark.box.y1 * scale;
  const sloganX = (width - (sloganBox.x2 - sloganBox.x1)) / 2 - sloganBox.x1;
  const sloganY = top + markHeight + gap - sloganBox.y1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${COLORS.cream}"/><g transform="translate(${markX.toFixed(2)} ${markY.toFixed(2)}) scale(${scale.toFixed(4)})">${shapes(mark, COLORS.ink, COLORS.leaf)}</g><path fill="${COLORS.leaf}" transform="translate(${sloganX.toFixed(2)} ${sloganY.toFixed(2)})" d="${slogan.toPathData(2)}"/></svg>
`;
}

function typescriptModule(mark) {
  const width = mark.box.x2 - mark.box.x1;
  const height = mark.box.y2 - mark.box.y1;
  const moved = (p) => {
    const copy = new opentype.Path();
    p.commands.forEach((c) => copy.commands.push({ ...c, x: c.x - mark.box.x1, y: c.y - mark.box.y1, x1: c.x1 - mark.box.x1, y1: c.y1 - mark.box.y1, x2: c.x2 - mark.box.x1, y2: c.y2 - mark.box.y1 }));
    return copy.toPathData(2);
  };
  return [
    `export const BRAND_LOGO_WIDTH = ${width.toFixed(2)};`,
    `export const BRAND_LOGO_HEIGHT = ${height.toFixed(2)};`,
    `export const BRAND_LOGO_TEXT_PATH = '${moved(mark.text)}';`,
    `export const BRAND_LOGO_SPROUT_PATHS = [${mark.sprout.map((p) => `'${moved(p)}'`).join(', ')}];`,
    '',
  ].join('\n');
}

async function main() {
  const full = lockup();
  const mark = symbol();

  const logoLight = wideSvg(full, { textFill: COLORS.ink, sproutFill: COLORS.leaf });
  const logoDark = wideSvg(full, { textFill: COLORS.cream, sproutFill: COLORS.lightLeaf });
  write('brand/logo/muda-vai-vem.svg', logoLight);
  write('brand/logo/muda-vai-vem-claro.svg', logoDark);
  write('brand/logo/muda-vai-vem-quadrado.svg', squareSvg(full, { textFill: COLORS.ink, sproutFill: COLORS.leaf, background: COLORS.cream, radius: 180 }));
  write('brand/logo/muda-vai-vem-quadrado-verde.svg', squareSvg(full, { textFill: COLORS.cream, sproutFill: COLORS.lightLeaf, background: COLORS.leaf, radius: 180 }));
  write('brand/logo/muda-vai-vem-quadrado-sem-fundo.svg', squareSvg(full, { textFill: COLORS.ink, sproutFill: COLORS.leaf }));
  const symbolSvg = squareSvg(mark, { textFill: COLORS.ink, sproutFill: COLORS.leaf, background: COLORS.cream, radius: 180, fill: 0.62 });
  write('brand/logo/simbolo.svg', symbolSvg);

  await png(squareSvg(mark, { textFill: COLORS.ink, sproutFill: COLORS.leaf, background: COLORS.cream, fill: 0.6 }), 'assets/images/icon.png', 1024);
  await png(squareSvg(mark, { textFill: COLORS.ink, sproutFill: COLORS.leaf, fill: 0.5 }), 'assets/images/android-icon-foreground.png', 1024);
  await png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="${COLORS.cream}"/></svg>`, 'assets/images/android-icon-background.png', 1024);
  await png(squareSvg(mark, { textFill: COLORS.white, sproutFill: COLORS.white, fill: 0.5 }), 'assets/images/android-icon-monochrome.png', 1024);
  await png(squareSvg(mark, { textFill: COLORS.white, sproutFill: COLORS.white, fill: 0.84 }), 'assets/images/notification-icon.png', 96);
  await png(squareSvg(mark, { textFill: COLORS.ink, sproutFill: COLORS.leaf, fill: 0.62 }), 'assets/images/splash-icon.png', 1024);
  await png(squareSvg(mark, { textFill: COLORS.cream, sproutFill: COLORS.lightLeaf, fill: 0.62 }), 'assets/images/splash-icon-dark.png', 1024);
  await png(symbolSvg, 'assets/images/favicon.png', 196);

  write('site/assets/logo.svg', logoLight);
  write('site/assets/logo-dark.svg', logoDark);
  await png(shareImageSvg(full), 'site/assets/og-image.png', 1200, 630);
  await png(symbolSvg, 'site/assets/favicon.png', 196);
  write('admin/public/logo.svg', logoLight);
  write('admin/public/logo-dark.svg', logoDark);
  await png(symbolSvg, 'admin/public/favicon.png', 196);

  write('src/components/brandLogoPaths.ts', typescriptModule(full));
  console.log('Marca gerada.');
}

module.exports = { COLORS, bold, semi, layoutWord, wordPath, lockup, symbol, shapes, squareSvg, wideSvg, shareImageSvg };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
