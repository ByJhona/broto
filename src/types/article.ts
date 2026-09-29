export type ArticleBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'tip'; text: string }
  | { type: 'image'; url: string; caption?: string };

export type ArticleSummary = {
  id: string;
  slug: string;
  category: string;
  title: string;
  dek: string;
  coverUrl: string | null;
  readingMinutes: number;
  isFeatured: boolean;
  publishedAt: string;
};

export type Article = ArticleSummary & {
  body: ArticleBlock[];
};
