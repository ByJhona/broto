(function () {
  var header = document.getElementById('siteHeader');
  var onScroll = function () {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var navToggle = document.getElementById('navToggle');
  var menuIconOpen = document.getElementById('menuIconOpen');
  var menuIconClose = document.getElementById('menuIconClose');

  navToggle.addEventListener('click', function () {
    var isOpen = document.body.classList.toggle('menu-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    menuIconOpen.style.display = isOpen ? 'none' : 'block';
    menuIconClose.style.display = isOpen ? 'block' : 'none';
  });

  document.querySelectorAll('.mobile-menu a').forEach(function (link) {
    link.addEventListener('click', function () {
      document.body.classList.remove('menu-open');
      navToggle.setAttribute('aria-expanded', 'false');
      menuIconOpen.style.display = 'block';
      menuIconClose.style.display = 'none';
    });
  });

  var revealTargets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealTargets.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }
})();
