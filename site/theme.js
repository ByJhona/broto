(function () {
  var STORAGE_KEY = 'mudavaivem:theme';
  var CHOICES = ['auto', 'light', 'dark'];
  var LABELS = { auto: 'Tema automático', light: 'Tema claro', dark: 'Tema escuro' };
  var BAR_COLORS = { light: '#FAF5EB', dark: '#0F140F' };
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  var root = document.documentElement;
  var choice = readChoice();

  function readChoice() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return CHOICES.indexOf(saved) === -1 ? 'auto' : saved;
    } catch (error) {
      return 'auto';
    }
  }

  function saveChoice() {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch (error) {
      return;
    }
  }

  function apply() {
    var theme = choice === 'auto' ? (systemDark.matches ? 'dark' : 'light') : choice;
    root.dataset.theme = theme;
    root.dataset.themeChoice = choice;
    var bar = document.querySelector('meta[name="theme-color"]');
    if (bar) bar.content = BAR_COLORS[theme];
    document.querySelectorAll('.theme-toggle').forEach(function (button) {
      button.setAttribute('aria-label', LABELS[choice]);
      button.title = LABELS[choice];
    });
  }

  function cycle() {
    choice = CHOICES[(CHOICES.indexOf(choice) + 1) % CHOICES.length];
    saveChoice();
    apply();
  }

  systemDark.addEventListener('change', apply);
  apply();

  document.addEventListener('DOMContentLoaded', function () {
    apply();
    document.querySelectorAll('.theme-toggle').forEach(function (button) {
      button.addEventListener('click', cycle);
    });
  });
})();
