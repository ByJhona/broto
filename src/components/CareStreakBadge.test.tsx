import { screen } from '@testing-library/react-native';
import { i18n } from '@/i18n';
import { useCareStreak } from '@/hooks';
import { renderWithTheme } from '@/test/renderWithTheme';
import { CareStreakBadge } from './CareStreakBadge';

jest.mock('@/hooks', () => ({
  useCareStreak: jest.fn(),
  useReduceMotion: () => true,
}));

const mockedUseCareStreak = jest.mocked(useCareStreak);

function mockStreak(current: number, longest: number) {
  mockedUseCareStreak.mockReturnValue({ current, longest, isLoaded: true });
}

describe('CareStreakBadge', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pt');
  });

  it('invites the user to start when there is no streak', async () => {
    mockStreak(0, 0);
    await renderWithTheme(<CareStreakBadge />);

    expect(screen.getByText('Comece hoje')).toBeTruthy();
    expect(screen.getByLabelText('Comece sua sequência hoje. Marque uma tarefa de cuidado para começar')).toBeTruthy();
  });

  it('shows the current streak and announces the record when it is higher', async () => {
    mockStreak(5, 8);
    await renderWithTheme(<CareStreakBadge />);

    expect(screen.getByText('5 dias')).toBeTruthy();
    expect(screen.getByLabelText('5 dias cuidando. Seu recorde: 8 dias')).toBeTruthy();
  });

  it('announces a new record when the current streak is the longest', async () => {
    mockStreak(1, 1);
    await renderWithTheme(<CareStreakBadge />);

    expect(screen.getByText('1 dia')).toBeTruthy();
    expect(screen.getByLabelText('1 dia cuidando. Novo recorde!')).toBeTruthy();
  });
});
