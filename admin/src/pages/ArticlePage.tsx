import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createArticle, getArticleCategories, type ArticleLocale } from '../api';
import { PageHeader, useToast } from '../components';
import { errorMessage } from '../format';

const UNIQUE_VIOLATION = '23505';

const LOCALES: { value: ArticleLocale; label: string }[] = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
];

const BODY_HINT = 'Separe os parágrafos com uma linha em branco. Use "## " para subtítulo, "- " no começo de cada linha para lista e "> " para uma dica em destaque.';

function failureMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === UNIQUE_VIOLATION) return 'Já existe um artigo com esse título neste idioma.';
  return errorMessage('Não foi possível publicar o artigo.', error);
}

export function ArticlePage() {
  const showToast = useToast();
  const [locale, setLocale] = useState<ArticleLocale>('pt');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [dek, setDek] = useState('');
  const [body, setBody] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const categories = useQuery({ queryKey: ['article-categories', locale], queryFn: () => getArticleCategories(locale) });
  const canPublish = [category, title, dek, body].every((value) => value.trim().length > 0) && !isPublishing;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setIsPublishing(true);
    try {
      await createArticle({ locale, category: category.trim(), title: title.trim(), dek: dek.trim(), body, cover, isFeatured });
      showToast('Artigo publicado na aba Identificar.');
      setTitle('');
      setDek('');
      setBody('');
      setCover(null);
      setIsFeatured(false);
      form.reset();
    } catch (error) {
      showToast(failureMessage(error), true);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="content">
      <PageHeader title="Publicar artigo" subtitle="O artigo aparece na aba Identificar do app, para quem usa o idioma escolhido." />
      <form className="card" onSubmit={handleSubmit}>
        <div className="chips" role="group" aria-label="Idioma">
          {LOCALES.map((option) => (
            <button key={option.value} type="button" className="chip" aria-pressed={locale === option.value} onClick={() => setLocale(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        <label className="field" htmlFor="article-category">
          Categoria
          <input id="article-category" className="input" list="article-categories" value={category} onChange={(event) => setCategory(event.target.value)} />
          <datalist id="article-categories">
            {categories.data?.map((item) => <option key={item} value={item} />)}
          </datalist>
        </label>
        <label className="field" htmlFor="article-title">
          Título
          <input id="article-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field" htmlFor="article-dek">
          Resumo
          <textarea id="article-dek" className="input" rows={2} value={dek} onChange={(event) => setDek(event.target.value)} />
        </label>
        <label className="field" htmlFor="article-cover">
          Capa
          <input id="article-cover" className="input" type="file" accept="image/*" onChange={(event) => setCover(event.target.files?.[0] ?? null)} />
        </label>
        <label className="field" htmlFor="article-body">
          Texto
          <textarea id="article-body" className="input" rows={14} value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <p className="muted small">{BODY_HINT}</p>
        <label className="checkbox" htmlFor="article-featured">
          <input id="article-featured" type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} />
          Destacar no topo da aba Identificar
        </label>
        <div className="row">
          <button type="submit" className="button button-primary" disabled={!canPublish}>
            {isPublishing ? 'Publicando...' : 'Publicar artigo'}
          </button>
        </div>
      </form>
    </div>
  );
}
