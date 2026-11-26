const byId = id => document.getElementById(id);
const mode = byId('mode');
function showMode() {
  const night = root.dataset.mode === 'night';
  mode.textContent = night ? '☀  قراءة نهارية' : '☾  قراءة ليلية';
  mode.setAttribute('aria-pressed', String(night));
}
showMode();
mode.onclick = () => {
  root.dataset.mode = root.dataset.mode === 'night' ? 'day' : 'night';
  settings.write('mode', root.dataset.mode);
  showMode();
};
const resume = byId('resume-book');
const last = settings.read('last');
if (resume && last) {
  const bookPage = /^pachita-[0-9]+[.]html$/.test(last) ? 'pachita-0.html' : last;
  const name = Array.from(document.querySelectorAll('.bookname')).find(link => link.getAttribute('href') === bookPage);
  if (name) {
    resume.href = last;
    resume.textContent = 'أكمل قراءة ' + name.textContent;
    resume.hidden = false;
  }
}
const toc = byId('toc');
if (toc) {
  const book = document.querySelector('main.reader').dataset.book;
  if (book) {
    const lastAnchor = location.hash;
    if ([...toc.options].some(option => option.value === lastAnchor)) toc.value = lastAnchor;
  }
  toc.onchange = () => location.assign(toc.value);
  const resize = delta => {
    size = Math.min(32, Math.max(16, size + delta));
    root.style.setProperty('--size', (size / 16) + 'rem');
    settings.write('size', size);
    byId('plus').disabled = size >= 32;
    byId('minus').disabled = size <= 16;
  };
  byId('plus').onclick = () => resize(2);
  byId('minus').onclick = () => resize(-2);
  resize(0);
  settings.write('last', book ? book + '.html' : toc.value);
  const key = 'position.' + (book || toc.value);
  const saved = Number(settings.read(key)) || 0;
  let ready = false;
  document.fonts.ready.then(() => {
    if (saved > 0 && !location.hash) window.scrollTo(0, saved);
    ready = true;
  });
  let pending;
  const remember = () => { if (ready) settings.write(key, String(Math.round(window.scrollY))); };
  addEventListener('scroll', () => { clearTimeout(pending); pending = setTimeout(remember, 120); }, {passive:true});
  addEventListener('pagehide', remember);
}
