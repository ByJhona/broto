const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { COLORS, bold, semi, layoutWord, wordPath, lockup, symbol, squareSvg, wideSvg, shareImageSvg } = require('./build');

const BRAND_COLORS = [
  { name: 'Tinta', hex: COLORS.ink, use: 'Texto e letras do logo' },
  { name: 'Creme', hex: COLORS.cream, use: 'Fundo principal' },
  { name: 'Folha', hex: COLORS.leaf, use: 'Broto e destaques' },
  { name: 'Folha clara', hex: COLORS.lightLeaf, use: 'Broto sobre fundo escuro' },
  { name: 'Noite', hex: COLORS.night, use: 'Fundo escuro' },
];

const SUPPORT_COLORS = [
  { name: 'Terracota', hex: '#A3573F', use: 'Botões e chamadas' },
  { name: 'Argila', hex: '#E7B18E', use: 'Apoio quente' },
  { name: 'Sálvia', hex: '#8EA786', use: 'Apoio verde' },
];

const MUTED_TEXT = '#626757';
const SWATCH_BORDER = '#E5DCCD';

function svgFile(width, height, body, background) {
  const rect = background ? `<rect width="${width}" height="${height}" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${rect}${body}</svg>\n`;
}

function textShape(font, text, cap, fill, left, top) {
  return `<path fill="${fill}" d="${wordPath(layoutWord(font, text, cap), left, top).toPathData(2)}"/>`;
}

async function render(svg, target, width, height) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const size = height ? { width, height, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } } : { width };
  await sharp(Buffer.from(svg), { density: 600 }).resize(size).png().toFile(target);
}

function save(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function paletteSvg() {
  const card = 300;
  const gap = 40;
  const columns = 5;
  const rowHeight = card + 150;
  const width = columns * card + (columns + 1) * gap;
  const rows = [BRAND_COLORS, SUPPORT_COLORS];
  let body = '';
  rows.forEach((row, rowIndex) => {
    row.forEach((color, index) => {
      const x = gap + index * (card + gap);
      const y = gap + rowIndex * rowHeight;
      body += `<rect x="${x}" y="${y}" width="${card}" height="${card}" rx="28" fill="${color.hex}" stroke="${SWATCH_BORDER}" stroke-width="2"/>`;
      body += textShape(bold, color.name, 26, COLORS.ink, x, y + card + 30);
      body += textShape(semi, color.hex.toUpperCase(), 22, MUTED_TEXT, x, y + card + 80);
    });
  });
  return svgFile(width, gap + rows.length * rowHeight, body, COLORS.cream);
}

function swatchRows(colors) {
  return colors
    .map((color) => `<div class="swatch"><span style="background:${color.hex}"></span><strong>${color.name}</strong><code>${color.hex.toUpperCase()}</code><small>${color.use}</small></div>`)
    .join('');
}

function guideHtml(logo, logoDark, mark, markDark) {
  const fonts = path.join(__dirname, 'fonts').replaceAll('\\', '/');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Guia da marca Muda Vai Vem</title>
<style>
@font-face { font-family: Fredoka; font-weight: 700; src: url('file:///${fonts}/Fredoka-Bold.ttf'); }
@font-face { font-family: Fredoka; font-weight: 600; src: url('file:///${fonts}/Fredoka-SemiBold.ttf'); }
@page { size: A4; margin: 18mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: ${COLORS.ink}; font-size: 11pt; line-height: 1.5; }
h1, h2 { font-family: Fredoka; font-weight: 700; margin: 0 0 8px; }
h1 { font-size: 26pt; }
h2 { font-size: 15pt; margin-top: 26px; color: ${COLORS.leaf}; }
p { margin: 0 0 8px; }
.muted { color: ${MUTED_TEXT}; }
.slogan { font-family: Fredoka; font-weight: 600; font-size: 16pt; color: ${COLORS.leaf}; }
.pair { display: flex; gap: 12px; margin-top: 8px; }
.pair > div { flex: 1; border-radius: 12px; padding: 22px; display: flex; align-items: center; justify-content: center; border: 1px solid ${SWATCH_BORDER}; }
.pair svg { width: 100%; height: 90px; }
.pair.small svg { height: 70px; }
.light { background: ${COLORS.cream}; }
.dark { background: ${COLORS.night}; }
.swatches { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 8px; }
.swatch { display: flex; flex-direction: column; gap: 2px; font-size: 9pt; }
.swatch span { height: 48px; border-radius: 10px; border: 1px solid ${SWATCH_BORDER}; margin-bottom: 4px; }
.swatch small { color: ${MUTED_TEXT}; }
.type { font-family: Fredoka; font-size: 20pt; margin: 4px 0; }
ul { margin: 4px 0 0; padding-left: 18px; }
li { margin-bottom: 3px; }
.page-break { break-before: page; }
</style></head><body>
<h1>Guia da marca</h1>
<div class="pair"><div class="light">${logo}</div></div>
<p style="margin-top:14px"><span class="slogan">muda vai, muda vem</span></p>
<p>Muda Vai Vem é o app para quem cuida de plantas e troca mudas. O nome vem da muda que vai de uma casa e vem de outra. O broto saindo da letra mostra exatamente isso: algo que nasce e segue adiante.</p>

<h2>Logo</h2>
<p>Use a versão em cor sobre fundos claros e a versão clara sobre fundos escuros. Prefira sempre o logo completo, com MUDA à esquerda e VAI/VEM empilhados à direita.</p>
<div class="pair"><div class="light">${logo}</div><div class="dark">${logoDark}</div></div>

<h2>Símbolo</h2>
<p>O M com o broto é usado onde o logo completo não cabe: ícone do app, foto de perfil, favicon e carimbos. O caule nasce de trás do M.</p>
<div class="pair small"><div class="light">${mark}</div><div class="dark">${markDark}</div><div class="light" style="background:${COLORS.leaf}">${markDark}</div></div>

<h2 class="page-break">Cores</h2>
<p class="muted">Cores da marca</p>
<div class="swatches">${swatchRows(BRAND_COLORS)}</div>
<p class="muted" style="margin-top:14px">Cores de apoio, usadas no app e no site</p>
<div class="swatches">${swatchRows(SUPPORT_COLORS)}</div>

<h2>Tipografia</h2>
<p class="type" style="font-weight:700">Fredoka Bold</p>
<p class="type" style="font-weight:600">Fredoka SemiBold</p>
<p>Fredoka é a fonte do logo e dos títulos do site. Use Bold para títulos e SemiBold para o slogan e destaques. Para textos longos, use uma fonte simples como Inter. A Fredoka é gratuita (licença SIL OFL) e está na pasta Fontes.</p>

<h2>Bom uso</h2>
<ul>
<li>Deixe um espaço livre em volta do logo de pelo menos a altura das letras VAI.</li>
<li>Tamanho mínimo: logo completo com 96 px (ou 25 mm) de largura; símbolo com 24 px (ou 8 mm).</li>
<li>Em fundos com foto, use o logo sobre uma área lisa ou dentro de um quadro creme.</li>
</ul>

<h2>Evite</h2>
<ul>
<li>Esticar, inclinar ou girar o logo.</li>
<li>Trocar as cores por outras fora da paleta.</li>
<li>Separar o broto da letra ou mudar a posição das folhas.</li>
<li>Adicionar contorno, sombra ou efeitos.</li>
<li>Reescrever o nome com outra fonte.</li>
</ul>
</body></html>
`;
}

async function main() {
  const outDir = process.argv[2] ?? path.join(__dirname, 'identidade-visual');

  const full = lockup();
  const mark = symbol();
  const variants = {
    cor: { textFill: COLORS.ink, sproutFill: COLORS.leaf },
    claro: { textFill: COLORS.cream, sproutFill: COLORS.lightLeaf },
    branco: { textFill: COLORS.white, sproutFill: COLORS.white },
    preto: { textFill: COLORS.ink, sproutFill: COLORS.ink },
  };
  const out = (...parts) => path.join(outDir, ...parts);

  for (const [name, colors] of Object.entries(variants)) {
    const logo = wideSvg(full, colors);
    save(out('1 Logo', `Logo - ${name}.svg`), logo);
    await render(logo, out('1 Logo', `Logo - ${name}.png`), 3000);
    const markSvg = squareSvg(mark, { ...colors, fill: 0.9 });
    save(out('2 Simbolo', `Simbolo - ${name}.svg`), markSvg);
    await render(markSvg, out('2 Simbolo', `Simbolo - ${name}.png`), 2000);
  }
  await render(squareSvg(full, { ...variants.cor, background: COLORS.cream, fill: 0.8 }), out('1 Logo', 'Logo - fundo creme.png'), 2000);
  await render(squareSvg(full, { ...variants.claro, background: COLORS.leaf, fill: 0.8 }), out('1 Logo', 'Logo - fundo verde.png'), 2000);
  await render(squareSvg(full, { ...variants.claro, background: COLORS.night, fill: 0.8 }), out('1 Logo', 'Logo - fundo escuro.png'), 2000);
  await render(squareSvg(mark, { ...variants.cor, background: COLORS.cream, radius: 180, fill: 0.62 }), out('2 Simbolo', 'Simbolo - icone do app.png'), 1024);

  await render(squareSvg(mark, { ...variants.cor, background: COLORS.cream, fill: 0.5 }), out('3 Redes sociais', 'Foto de perfil - creme.png'), 1080);
  await render(squareSvg(mark, { ...variants.claro, background: COLORS.leaf, fill: 0.5 }), out('3 Redes sociais', 'Foto de perfil - verde.png'), 1080);
  await render(shareImageSvg(full), out('3 Redes sociais', 'Imagem de link compartilhado.png'), 1200, 630);
  await render(shareImageSvg(full, 1080, 1080, 760), out('3 Redes sociais', 'Post - logo e slogan.png'), 1080);

  await render(paletteSvg(), out('4 Cores', 'Paleta.png'), 1780);
  for (const file of ['Fredoka-Bold.ttf', 'Fredoka-SemiBold.ttf', 'OFL.txt']) {
    fs.mkdirSync(out('5 Fontes'), { recursive: true });
    fs.copyFileSync(path.join(__dirname, 'fonts', file), out('5 Fontes', file));
  }

  const guidePath = path.join(os.tmpdir(), 'guia-muda-vai-vem.html');
  const plainSvg = (svg) => svg.replace(/ width="\d+" height="\d+"/, '');
  save(guidePath, guideHtml(wideSvg(full, variants.cor), wideSvg(full, variants.claro), plainSvg(squareSvg(mark, { ...variants.cor, fill: 0.9 })), plainSvg(squareSvg(mark, { ...variants.claro, fill: 0.9 }))));
  console.log(`Kit gerado. Guia para imprimir em PDF: ${guidePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
