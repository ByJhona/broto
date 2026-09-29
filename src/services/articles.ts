import { supabase } from './supabase';
import type { Article, ArticleBlock, ArticleSummary } from '@/types';

export type ArticleLocale = 'pt' | 'en';

const SUMMARY_COLUMNS = 'id, slug, category, title, dek, cover_url, reading_minutes, is_featured, published_at';

type ArticleSummaryRow = {
  id: string;
  slug: string;
  category: string;
  title: string;
  dek: string;
  cover_url: string | null;
  reading_minutes: number;
  is_featured: boolean;
  published_at: string;
};

type ArticleRow = ArticleSummaryRow & {
  body: ArticleBlock[];
};

export function toArticleLocale(language: string): ArticleLocale {
  return language === 'en' ? 'en' : 'pt';
}

export function mapArticleSummaryRow(row: ArticleSummaryRow): ArticleSummary {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    title: row.title,
    dek: row.dek,
    coverUrl: row.cover_url,
    readingMinutes: row.reading_minutes,
    isFeatured: row.is_featured,
    publishedAt: row.published_at,
  };
}

export async function getArticleSummaries(locale: ArticleLocale): Promise<ArticleSummary[]> {
  const { data, error } = await supabase
    .from('articles')
    .select(SUMMARY_COLUMNS)
    .eq('locale', locale)
    .order('published_at', { ascending: false });

  if (error) {
    console.warn('Não foi possível buscar as matérias:', error);
    return [];
  }

  return (data as ArticleSummaryRow[]).map(mapArticleSummaryRow);
}

export async function getArticle(slug: string, locale: ArticleLocale): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select(`${SUMMARY_COLUMNS}, body`)
    .eq('locale', locale)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.warn('Não foi possível buscar a matéria:', error);
    return null;
  }
  if (!data) return null;

  const row = data as ArticleRow;
  return { ...mapArticleSummaryRow(row), body: row.body };
}
