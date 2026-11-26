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
    resume.textContent = 'تابع القراءة · ' + name.querySelector('strong').textContent;
    resume.hidden = false;
  }
}
function readerPanel(label) {
  const details = document.createElement('details');
  details.className = 'tool-panel';
  const summary = document.createElement('summary');
  summary.textContent = label;
  const panel = document.createElement('div');
  panel.className = 'tool-content';
  details.append(summary, panel);
  return {details, panel, summary};
}

function makeIndex(select, panel) {
  const options = [...select.options];
  const detailed = options.length > 80;
  const numbers = new Intl.NumberFormat('ar-EG');
  const article = document.querySelector('.fulltext');
  const chapterNames = new Map([...article.querySelectorAll('.toc a')].map(a => [a.hash, a.textContent.trim()]));
  let pages;
  for (const option of options) {
    const title = option.text.trim();
    const entry = document.createElement('a');
    entry.href = option.value;
    entry.textContent = chapterNames.get(option.value) || title;
    if (!detailed) {
      if (!option.value.startsWith('#') && option.selected) entry.setAttribute('aria-current', 'page');
      panel.append(entry);
      continue;
    }
    const newGroup = /^(الفصل |القسم |الملحق(?: |$)|ملحق عن |المراجع$|المقدمة$|كتب أخرى للمؤلف$|كتب للمؤلف نفسه$)/.test(title)
      && !title.includes(' — ');
    if (!pages || newGroup) {
      const group = document.createElement('details');
      const heading = document.createElement('summary');
      heading.textContent = pages ? title : 'الصفحات التمهيدية';
      pages = document.createElement('div');
      group.append(heading, pages);
      panel.append(group);
    }
    const target = document.getElementById(option.value.slice(1));
    const meta = target?.querySelector('p');
    const number = meta?.textContent.match(/(?:صفحة ملف المصدر|صفحة المصدر|ملف المصدر)\s*[:：]?\s*(\d+)/)?.[1];
    if (number !== undefined) {
      entry.textContent = 'ص ' + numbers.format(Number(number)) + ' · ' + title;
    }
    pages.append(entry);
  }
}

function enhanceReader(select) {
  const reader = select.closest('main');
  const article = reader.querySelector('article');
  article.classList.add('fulltext');
  const tools = select.closest('.tools');
  const book = reader.dataset.book;
  const page = location.pathname.split('/').pop();
  const fileKey = book || page;
  if (!article.querySelector('h1')) {
    const heading = document.createElement('h1');
    heading.textContent = document.title.split('|')[0].trim();
    article.prepend(heading);
  }
  const index = readerPanel('فهرس الكتاب');
  const font = readerPanel('حجم الخط');
  const copies = readerPanel('النسخ');
  makeIndex(select, index.panel);
  const plus = byId('plus');
  const minus = byId('minus');
  const value = document.createElement('output');
  value.setAttribute('aria-label', 'حجم الخط بالبكسل');
  font.panel.append(minus, value, plus);
  copies.panel.append(...tools.querySelectorAll('a'));
  tools.replaceChildren(index.details, font.details, copies.details);
  tools.classList.add('compact-tools');
  const panels = [index, font, copies];
  for (const {details} of panels) {
    details.addEventListener('toggle', () => {
      if (details.open) for (const other of panels) if (other.details !== details) other.details.open = false;
    });
  }
  document.addEventListener('click', e => {
    for (const {details} of panels) if (!details.contains(e.target)) details.open = false;
  });
  tools.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const current = panels.find(item => item.details.open);
    if (current) { current.details.open = false; current.summary.focus(); }
  });
  index.panel.addEventListener('click', e => {
    if (e.target.closest('a')) { index.details.open = false; index.summary.focus(); }
  });
  function resize(delta) {
    size = Math.min(32, Math.max(16, size + delta));
    root.style.setProperty('--size', (size / 16) + 'rem');
    settings.write('size', size);
    value.textContent = new Intl.NumberFormat('ar-EG').format(size);
    plus.disabled = size >= 32;
    minus.disabled = size <= 16;
  }
  plus.onclick = () => resize(2);
  minus.onclick = () => resize(-2);
  resize(0);

  for (const link of reader.querySelectorAll('.prevnext a')) {
    const option = [...select.options].find(opt => opt.value === link.getAttribute('href'));
    if (option) link.textContent += ' · ' + option.text;
  }
  if (book === 'book-1') {
    for (const p of article.querySelectorAll('p')) {
      if (p.textContent.includes('صفحة ملف المصدر') && p.textContent.startsWith('المجلد')) p.classList.add('meta');
      if (p.textContent.startsWith('ملاحظة تحريرية')) p.classList.add('note');
    }
  }
  settings.write('last', page);
  const key = 'position.' + fileKey;
  const sections = [...article.querySelectorAll('section[id]')];
  let ready = false;
  let pending;
  function remember() {
    if (!ready) return;
    const scroll = Math.round(scrollY);
    settings.write(key, String(scroll));
    // A section and relative offset survive changes in font size and screen width.
    const top = tools.parentElement.offsetHeight;
    let low = 0, high = sections.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (sections[mid].getBoundingClientRect().top <= top) low = mid + 1;
      else high = mid;
    }
    const current = sections[low - 1];
    const rect = current?.getBoundingClientRect();
    const bookmark = rect && rect.height && top <= rect.bottom ? [current.id, (top - rect.top) / rect.height] : null;
    settings.write(key + '.anchor', JSON.stringify(bookmark));
  }
  document.fonts.ready.then(() => {
    if (!location.hash) {
      let saved;
      try { saved = JSON.parse(settings.read(key + '.anchor')); } catch {}
      const section = Array.isArray(saved) && document.getElementById(saved[0]);
      if (section && Number.isFinite(saved[1])) {
        const rect = section.getBoundingClientRect();
        scrollTo(0, scrollY + rect.top + rect.height * saved[1] - tools.parentElement.offsetHeight);
      } else {
        const pixel = Number(settings.read(key));
        if (pixel > 0) scrollTo(0, pixel);
      }
    }
    ready = true;
  });
  addEventListener('scroll', () => { clearTimeout(pending); pending = setTimeout(remember, 150); }, {passive: true});
  addEventListener('pagehide', remember);
}
const toc = byId('toc');
if (toc) enhanceReader(toc);

const pdfPreview = document.querySelector('.pdf-preview');
if (pdfPreview) {
  const compactView = matchMedia('(max-width: 600px)');
  const updatePreview = () => { pdfPreview.open = !compactView.matches; };
  compactView.addEventListener('change', updatePreview);
  updatePreview();
}

(() => {
  const images = document.querySelectorAll('.fulltext img');
  if (!images.length) return;

  // Short alternatives for the plates in الدماغ والشامانات. The complete translated
  // explanations, scales, figure numbers and original caveats stay beside the scans.
  const brainPlates = {
    brain_figure_1_1: 'تسجيلات الجهود التي يستثيرها خط عمودي حين يُعرض ضمن أعداد أو حروف',
    brain_figure_1_2: 'مقارنة موجات الدماغ واختبار الفروق عند عرض حروف تختلف في الشكل أو المعنى',
    brain_table_1: 'جدول يقارن ارتباط تخطيط الدماغ بالتقرير اللفظي لكل عينة',
    brain_figures_1_3_1_4: 'تسجيلان لتخطيط الدماغ، الارتباط منخفض في الأعلى ومرتفع في الأسفل',
    brain_p23_1: 'رسمان للعلاقة بين مستوى التواصل وتماسك التسجيلات الدماغية',
    brain_p24_1: 'رسوم تقارن تماسك المناطق الدماغية المركزية لدى مشاركين أثناء التواصل',
    brain_p25_1: 'تغيّر مستوى التواصل ونشاط المنطقة الجبهية اليسرى لدى مشاركين بمرور الزمن',
    brain_p27_1: 'تخطيط الدماغ أثناء التنشيط وتوقيت إبلاغ المشاركين بتغيّر الحالة',
    brain_p29_1: 'تقديرات مراقبين لتشابه الإفادات اللفظية خلال أربع جلسات',
    brain_p30_1: 'تماسك تخطيط الدماغ والإفادات اللفظية في جلسة ظهر فيها ارتباط',
    brain_p31_1: 'تماسك تخطيط الدماغ والإفادات اللفظية في جلسة غاب فيها الارتباط',
    brain_p32_1: 'أمثلة لتجمّع قيم التماسك فوق ٥٠ وحولها',
    brain_p33_1: 'مثال لقيم التماسك المتجمعة تحت ٥٠',
    brain_p34_1: 'جدول تقديرات مراقبين للقيم المرسومة ومعاملات الارتباط',
    brain_p39_1: 'نمطا الارتباط بين نصفي الدماغ لدى مشاركين وتوقيت إشارات كل منهما في جلسة تواصل',
    brain_p40_1: 'أنماط الارتباط بين نصفي الدماغ لدى مشاركين خلال ست فترات من جلسة تواصل',
    brain_p41_1: 'أعمدة متوسطات الارتباط بين نصفي الدماغ وانحرافاتها المعيارية خلال ست فترات',
    brain_p42_1: 'مقارنة أنماط الارتباط بين نصفي الدماغ عند العزلة والتواصل المباشر',
    brain_p43_1: 'أنماط الارتباط لدى مشاركين في حالة الضبط وأثناء التواصل المباشر',
    brain_p44_1: 'أنماط التوافق بين مشاركين خلال التواصل الثنائي والجماعي وفترات الضبط',
    brain_p45_1: 'عينات تخطيط الدماغ قبل التواصل الثنائي وأثناءه وبعده',
    brain_p48_1: 'مقطع في الحجرة الصامتة يبيّن الجدران والعوازل وقفص فاراداي ومحوّل القياس',
    brain_p50_1: 'عدد مرات الظهور خلال مئة ثانية بحسب عدد الجلسات',
    brain_p51_1: 'جدول قياسات الضبط والتجربة ورسم للتماسك الدماغي ونشاط محوّل القياس',
    brain_p58_1: 'رسم هندسي يبيّن تغيّر زاوية رؤية الشيء مع المسافة',
    brain_p84_1: 'دون أنطونيو من تشينالهو يجس نبض المؤلف',
    brain_p85_1: 'زوجات قادة التشامولا في الأعلى وصورة القديسة مارتا في سان خوان تشامولا في الأسفل',
    brain_p98_1: 'جهود كهربائية مسجلة في النواة المذنبة والمهاد تحت شروط مختلفة للتنبيه والاشتراط',
    brain_p100_1: 'رسوم للاستجابات السلوكية والجهود الكهربائية أثناء اكتساب استجابة شرطية وانطفائها',
    brain_p101_1: 'اللوحتان الأولى والثانية من الشكل الذي يقارن الاستجابة الشرطية بالجهد الكهربائي',
    brain_p102_1: 'ثلاث لوحات تقارن الاستجابة السلوكية بالجهود الكهربائية في مراحل الاشتراط',
    brain_p103_1: 'الجهود التي يستثيرها الصوت في النواة المذنبة والمهاد خلال جلسات الاشتراط الثلاث الأولى',
    brain_p104_1: 'نسخة مكررة من صورة الشكل ١٫٥ كما ظهرت مع تعليق الشكل ١٫٦ في المصدر',
    brain_p105_1: 'رسوم الاستجابة الشرطية للضوء والصوت خلال الاكتساب والتثبيط',
    brain_p106_1: 'صور وتسجيلات للجهود الكهربائية خلال انطفاء الاستجابة للضوء واكتساب الاستجابة للصوت'
  };

  function imageCaption(image, wrapper, source) {
    if (wrapper?.lastElementChild?.matches('figcaption, p')) return wrapper.lastElementChild;
    if (source.includes('book-1-images/')) {
      // In this volume the printed caption can follow intervening body paragraphs.
      const note = [...image.closest('section').querySelectorAll('p')].find(
        p => /^ملاحظة تحريرية.*العيوب/.test(p.textContent.trim())
      );
      return note?.previousElementSibling?.matches('p') ? note.previousElementSibling : null;
    }
    if (source.includes('book-8-images/')) return null;
    const next = wrapper?.nextElementSibling;
    return next?.matches('p') ? next : null;
  }

  let viewer;
  function makeViewer() {
    const dialog = document.createElement('dialog');
    dialog.className = 'scan-viewer';
    dialog.setAttribute('aria-labelledby', 'scan-viewer-title');
    dialog.innerHTML = '<div class="scan-bar"><span id="scan-viewer-title"></span><button type="button" class="scan-zoom" aria-pressed="false">تكبير الصورة</button><button type="button" class="scan-close" autofocus>إغلاق</button></div><div class="scan-stage" tabindex="0" role="region" aria-label="عرض الصورة"><img alt=""></div>';
    document.body.append(dialog);
    const zoom = dialog.querySelector('.scan-zoom');
    const stage = dialog.querySelector('.scan-stage');
    const enlarged = stage.querySelector('img');
    const title = dialog.querySelector('#scan-viewer-title');

    function resize() {
      const zoomed = zoom.getAttribute('aria-pressed') === 'true';
      if (zoomed) {
        const fitWidth = enlarged.naturalWidth ? Math.min(stage.clientWidth,
          stage.clientHeight * enlarged.naturalWidth / enlarged.naturalHeight) : stage.clientWidth;
        enlarged.style.width = Math.max(enlarged.naturalWidth, fitWidth * 2) + 'px';
      } else {
        enlarged.style.removeProperty('width');
      }
      stage.classList.toggle('scan-enlarged', zoomed);
    }

    function toggleZoom() {
      const zoomed = zoom.getAttribute('aria-pressed') !== 'true';
      zoom.setAttribute('aria-pressed', String(zoomed));
      zoom.textContent = zoomed ? 'ملاءمة للشاشة' : 'تكبير الصورة';
      resize();
      if (zoomed) stage.focus({preventScroll: true});
    }

    zoom.addEventListener('click', toggleZoom);
    enlarged.addEventListener('click', toggleZoom);
    enlarged.addEventListener('load', resize);
    dialog.querySelector('.scan-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('scan-viewing');
      window.removeEventListener('resize', resize);
    });
    return (image) => {
      title.textContent = image.alt;
      enlarged.alt = image.alt;
      enlarged.src = image.currentSrc || image.src;
      zoom.setAttribute('aria-pressed', 'false');
      zoom.textContent = 'تكبير الصورة';
      dialog.showModal();
      document.documentElement.classList.add('scan-viewing');
      resize();
      stage.scrollTo(0, 0);
      window.addEventListener('resize', resize);
    };
  }

  for (const image of images) {
    const source = image.getAttribute('src') || '';
    const key = source.split('/').pop().replace(/\.[^.]+$/, '');
    const wrapper = image.closest('figure, .figure');
    const caption = imageCaption(image, wrapper, source);
    const isCover = /\/photo1\.png$|\/source-0\.png$/.test(source);
    let description = brainPlates[key] || caption?.textContent.trim() || image.alt;
    if (isCover) description = 'غلاف «' + document.title.split('|')[0].trim() + '» في النسخة الأصلية';
    if (source.endsWith('/syntergic_author.png')) description = 'جاكوبو غرينبرغ زيلبرباوم كما يظهر في النسخة الرقمية من «النظرية السينترجية»';
    image.alt = description;

    const figure = wrapper?.matches('figure') ? wrapper : document.createElement('figure');
    if (figure !== wrapper) (wrapper || image).before(figure);
    figure.classList.add('scan-figure');
    const link = document.createElement('a');
    link.href = image.src;
    link.className = 'scan-open';
    link.setAttribute('aria-label', 'عرض الصورة بحجم أكبر — ' + description);
    figure.prepend(link);
    link.append(image);

    const label = caption?.matches('figcaption') ? caption : document.createElement('figcaption');
    if (caption && caption !== label) label.append(caption);
    if (!caption) label.textContent = description;
    figure.append(label);
    if (label.textContent.length > 175) label.classList.add('scan-long-caption');
    if (wrapper && wrapper !== figure) wrapper.remove();

    if (typeof HTMLDialogElement !== 'undefined' && HTMLDialogElement.prototype.showModal) {
      link.setAttribute('aria-haspopup', 'dialog');
      link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        viewer ||= makeViewer();
        viewer(image);
      });
    }
  }
})();
