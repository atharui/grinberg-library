const showcase = document.getElementById('showcase');
const slides = Array.from(showcase.querySelectorAll('.book-slide'));
const controls = showcase.querySelector('.carousel-controls');
const counter = document.getElementById('book-count');
const toggle = document.getElementById('autoplay');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let activeSlide = 0;
let playing = !reduceMotion.matches;
let timer;
const numbers = new Intl.NumberFormat('ar-EG');
function move(step) {
  slides[activeSlide].hidden = true;
  activeSlide = (activeSlide + step + slides.length) % slides.length;
  slides[activeSlide].hidden = false;
  counter.textContent = numbers.format(activeSlide + 1) + ' / ' + numbers.format(slides.length);
}
function schedule() {
  clearInterval(timer);
  toggle.textContent = playing ? 'إيقاف التبديل' : 'تشغيل التبديل';
  if (playing && !document.hidden) timer = setInterval(() => move(1), 5000);
}
function manual(step) {
  playing = false;
  move(step);
  schedule();
}
document.getElementById('prev-book').onclick = () => manual(-1);
document.getElementById('next-book').onclick = () => manual(1);
toggle.onclick = () => { playing = !playing; schedule(); };
showcase.addEventListener('focusin', event => {
  if (event.target.closest('.book-slide')) { playing = false; schedule(); }
});
document.addEventListener('visibilitychange', schedule);
reduceMotion.addEventListener('change', event => { if (event.matches) { playing = false; schedule(); } });
controls.hidden = false;
schedule();
