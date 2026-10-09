export type ThemeChoice = 'auto' | 'light' | 'dark';

export const THEME_CHOICES: ThemeChoice[] = ['auto', 'light', 'dark'];

const STORAGE_KEY = 'mudavaivem:theme';
const systemDark = globalThis.matchMedia('(prefers-color-scheme: dark)');

export function readThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEME_CHOICES.find((choice) => choice === saved) ?? 'auto';
  } catch {
    return 'auto';
  }
}

export function applyTheme(choice: ThemeChoice) {
  const theme = choice === 'auto' ? (systemDark.matches ? 'dark' : 'light') : choice;
  document.documentElement.dataset.theme = theme;
}

export function saveThemeChoice(choice: ThemeChoice) {
  applyTheme(choice);
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    return;
  }
}

export function followSystemTheme() {
  applyTheme(readThemeChoice());
  systemDark.addEventListener('change', () => applyTheme(readThemeChoice()));
}
