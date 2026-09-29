import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n';
import { getArticle, getArticleSummaries, toArticleLocale } from '@/services';

const ARTICLES_STALE_TIME = 10 * 60_000;

export function useArticles() {
  const { language } = useLanguage();
  const locale = toArticleLocale(language);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles', locale],
    queryFn: () => getArticleSummaries(locale),
    staleTime: ARTICLES_STALE_TIME,
  });

  const featured = articles.find((article) => article.isFeatured) ?? articles[0] ?? null;
  const others = articles.filter((article) => article.id !== featured?.id);

  return { featured, others, isLoading };
}

export function useArticle(slug: string | undefined) {
  const { language } = useLanguage();
  const locale = toArticleLocale(language);

  const { data: article = null, isLoading } = useQuery({
    queryKey: ['article', locale, slug],
    queryFn: () => getArticle(slug!, locale),
    enabled: !!slug,
    staleTime: ARTICLES_STALE_TIME,
  });

  return { article, isLoading };
}
