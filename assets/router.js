/* Hash router for the portfolio companion-app shell.
   Routes map to [data-page] sections in index.html. */
(function () {
  const ROUTES = ['landing', 'resume', 'cases', 'skills', 'about', 'blog', 'contact'];
  const META = {
    landing: ['Nº01', 'primary · landing', 'landing'],
    resume: ['Nº02', 'content · resume', 'resume / experience'],
    cases: ['Nº03', 'content · cases', 'cases / code'],
    skills: ['Nº04', 'content · skills', 'skills'],
    blog: ['Nº05', 'content · writing', 'blog'],
    about: ['Nº06', 'local · about', 'about'],
    contact: ['Nº07', 'local · contact', 'contact'],
  };
  const pages = document.querySelectorAll('[data-page]');
  const navItems = document.querySelectorAll('.nav-item[data-route]');
  const crumbEl = document.getElementById('tb-crumb');
  const main = document.getElementById('main');

  function show(route) {
    if (!ROUTES.includes(route)) route = 'landing';
    let active = false;
    pages.forEach((p) => {
      const on = p.getAttribute('data-page') === route;
      p.classList.toggle('active', on);
      if (on) active = p;
    });
    navItems.forEach((n) => {
      n.classList.toggle('active', n.getAttribute('data-route') === route);
      if (n.getAttribute('data-route') === route) n.setAttribute('aria-current', 'page');
      else n.removeAttribute('aria-current');
    });
    if (crumbEl) {
      const m = META[route];
      crumbEl.innerHTML = '<b>leo</b><span aria-hidden="true">/</span>' + m[1];
    }
    if (active && main) {
      // replay pagein animation on route change
      const inner = active.querySelector('.page-inner, .page-body, .pg-head');
      if (inner) {
        inner.style.animation = 'none';
        void inner.offsetWidth;
        inner.style.animation = '';
      }
      main.scrollTop = 0;
    }
    // reveal within the newly shown page
    requestAnimationFrame(() => {
      active.querySelectorAll('.rv').forEach((el) => {
        if ('IntersectionObserver' in window && !reduceMotion()) {
          const io = new IntersectionObserver((es) => {
            es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
          }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
          io.observe(el);
        } else {
          el.classList.add('in');
        }
      });
    });
  }
  function reduceMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

  navItems.forEach((n) => {
    n.addEventListener('click', (e) => {
      e.preventDefault();
      const r = n.getAttribute('data-route');
      if (location.hash !== '#' + r) location.hash = r;
      else show(r);
    });
  });

  window.addEventListener('hashchange', () => show(location.hash.replace('#', '')));
  show(location.hash.replace('#', '') || 'landing');
})();
