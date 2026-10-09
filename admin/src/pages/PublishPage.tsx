import { useState, type ChangeEvent, type FormEvent } from 'react';
import { createPost, type PostType } from '../api';
import { PageHeader, useToast } from '../components';
import { errorMessage } from '../format';

const MAX_IMAGES = 5;

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'dica', label: 'Dica' },
  { value: 'duvida', label: 'Dúvida' },
  { value: 'conquista', label: 'Conquista' },
];

export function PublishPage({ userId }: Readonly<{ userId: string }>) {
  const showToast = useToast();
  const [caption, setCaption] = useState('');
  const [postType, setPostType] = useState<PostType | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const canPublish = (caption.trim().length > 0 || images.length > 0) && !isPublishing;

  const handleImages = (event: ChangeEvent<HTMLInputElement>) => {
    setImages(Array.from(event.target.files ?? []).slice(0, MAX_IMAGES));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setIsPublishing(true);
    try {
      await createPost(userId, caption.trim(), postType, images);
      showToast('Post publicado na Comunidade.');
      setCaption('');
      setPostType(null);
      setImages([]);
      form.reset();
    } catch (error) {
      showToast(errorMessage('Não foi possível publicar o post.', error), true);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="content">
      <PageHeader title="Publicar" subtitle="O post aparece na Comunidade do app com a sua conta como autora." />
      <form className="card" onSubmit={handleSubmit}>
        <label className="field" htmlFor="post-caption">
          Texto
          <textarea id="post-caption" className="input" rows={6} value={caption} onChange={(event) => setCaption(event.target.value)} />
        </label>
        <div className="chips" role="group" aria-label="Tipo do post">
          {POST_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              className="chip"
              aria-pressed={postType === option.value}
              onClick={() => setPostType(postType === option.value ? null : option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="field" htmlFor="post-images">
          Fotos (até {MAX_IMAGES})
          <input id="post-images" className="input" type="file" accept="image/*" multiple onChange={handleImages} />
        </label>
        <div className="row">
          <button type="submit" className="button button-primary" disabled={!canPublish}>
            {isPublishing ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </form>
    </div>
  );
}
