import { screen } from '@testing-library/react-native';
import { i18n } from '@/i18n';
import type { ArticleBlock } from '@/types';
import { renderWithTheme } from '@/test/renderWithTheme';
import { ArticleBody } from './ArticleBody';

describe('ArticleBody', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pt');
  });

  it('renders every supported block type in order', async () => {
    const blocks: ArticleBlock[] = [
      { type: 'heading', text: 'Luz indireta forte' },
      { type: 'paragraph', text: 'Perto de uma janela clara.' },
      { type: 'list', items: ['Luz', 'Água'] },
      { type: 'tip', text: 'O vaso precisa de furo.' },
      { type: 'image', url: 'https://example.com/foto.jpg', caption: 'Uma maranta' },
    ];

    await renderWithTheme(<ArticleBody blocks={blocks} />);

    expect(screen.getByText('Luz indireta forte')).toBeTruthy();
    expect(screen.getByText('Perto de uma janela clara.')).toBeTruthy();
    expect(screen.getByText('Luz')).toBeTruthy();
    expect(screen.getByText('Água')).toBeTruthy();
    expect(screen.getByText('Dica')).toBeTruthy();
    expect(screen.getByText('O vaso precisa de furo.')).toBeTruthy();
    expect(screen.getByText('Uma maranta')).toBeTruthy();
  });

  it('skips block types it does not know yet', async () => {
    const blocks = [{ type: 'video', url: 'x' }, { type: 'paragraph', text: 'Continua.' }] as unknown as ArticleBlock[];

    await renderWithTheme(<ArticleBody blocks={blocks} />);

    expect(screen.getByText('Continua.')).toBeTruthy();
  });
});
