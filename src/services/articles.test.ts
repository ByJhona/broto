import { mapArticleSummaryRow, toArticleLocale } from './articles';

describe('toArticleLocale', () => {
  it('uses english only for the english interface and portuguese otherwise', () => {
    expect(toArticleLocale('en')).toBe('en');
    expect(toArticleLocale('pt')).toBe('pt');
    expect(toArticleLocale('es')).toBe('pt');
  });
});

describe('mapArticleSummaryRow', () => {
  it('maps database columns to the app shape', () => {
    const summary = mapArticleSummaryRow({
      id: 'a1',
      slug: 'what-every-plant-needs',
      category: 'Primeiros passos',
      title: 'Título',
      dek: 'Linha fina',
      cover_url: null,
      reading_minutes: 3,
      is_featured: true,
      published_at: '2026-09-28T12:00:00Z',
    });

    expect(summary).toEqual({
      id: 'a1',
      slug: 'what-every-plant-needs',
      category: 'Primeiros passos',
      title: 'Título',
      dek: 'Linha fina',
      coverUrl: null,
      readingMinutes: 3,
      isFeatured: true,
      publishedAt: '2026-09-28T12:00:00Z',
    });
  });
});
