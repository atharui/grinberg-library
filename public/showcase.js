const showcase = document.getElementById('showcase');
const slides = [...showcase.querySelectorAll('.book-slide')];
const counter = document.getElementById('book-count');
const numbers = new Intl.NumberFormat('ar-EG');
let activeSlide = 0;

function moveSlide(step) {
  const previous = slides[activeSlide];
  previous.querySelector('details').open = false;
  previous.hidden = true;
  activeSlide = (activeSlide + step + slides.length) % slides.length;
  slides[activeSlide].hidden = false;
  counter.textContent = numbers.format(activeSlide + 1) + ' / ' + numbers.format(slides.length);
}
document.getElementById('prev-book').onclick = () => moveSlide(-1);
document.getElementById('next-book').onclick = () => moveSlide(1);
showcase.querySelector('.carousel-controls').hidden = false;
