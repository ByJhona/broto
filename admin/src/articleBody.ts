export type ArticleBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'tip'; text: string };

const WORDS_PER_MINUTE = 200;

function toBlock(chunk: string): ArticleBlock {
  if (chunk.startsWith('## ')) return { type: 'heading', text: chunk.slice(3).trim() };
  if (chunk.startsWith('>')) return { type: 'tip', text: chunk.replace(/^> ?/gm, '').trim() };
  const lines = chunk.split('\n').map((line) => line.trim());
  if (lines.every((line) => line.startsWith('- '))) return { type: 'list', items: lines.map((line) => line.slice(2).trim()) };
  return { type: 'paragraph', text: lines.join(' ') };
}

export function parseArticleBody(text: string): ArticleBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map(toBlock);
}

export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
