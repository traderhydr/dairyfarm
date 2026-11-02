// Landing page extras: reveal-on-scroll and the footer year. The page works fully without this.
(function () {
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var items = document.querySelectorAll('.reveal');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduced) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el, i) {
    el.style.transitionDelay = (i % 4) * 60 + 'ms'; // stagger neighbours in a row
    observer.observe(el);
  });
})();
