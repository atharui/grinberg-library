const settings = {
  read(key) { try { return localStorage.getItem('grinberg.' + key); } catch { return null; } },
  write(key, value) { try { localStorage.setItem('grinberg.' + key, value); } catch {} }
};
const root = document.documentElement;
root.dataset.mode = settings.read('mode') === 'night' ? 'night' : 'day';
let size = Math.max(16, Math.min(32, Number(settings.read('size')) || 20));
root.style.setProperty('--size', (size / 16) + 'rem');
