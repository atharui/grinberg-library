(() => {
  const index = document.querySelector('.bio-index');
  const narrow = matchMedia('(max-width: 700px)');
  function setLayout() { index.open = !narrow.matches; }
  narrow.addEventListener('change', setLayout);
  setLayout();
  const entries = [...index.querySelectorAll('a')].map(link => ({
    link, section: document.getElementById(link.hash.slice(1))
  }));
  let pending = false;
  function highlight() {
    let current = null;
    for (const entry of entries) {
      if (entry.section.getBoundingClientRect().top <= 120) current = entry;
    }
    for (const entry of entries) {
      if (entry === current) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    }
    pending = false;
  }
  addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(highlight); }
  }, {passive: true});
  highlight();
  index.addEventListener('click', event => {
    if (narrow.matches && event.target.closest('a')) index.open = false;
  });
  document.addEventListener('click', event => {
    const citation = event.target.closest('a[id^="cite-"]');
    if (!citation) return;
    const reference = document.getElementById(citation.hash.slice(1));
    reference.querySelector('.return-note').href = '#' + citation.id;
  });
})();
