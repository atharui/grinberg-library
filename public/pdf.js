async function openReviewedPDF() {
  const panel = document.querySelector('.pdfview');
  const status = document.getElementById('pdfstatus');
  const chunks = [];
  const paths = JSON.parse(panel.dataset.parts);
  const formatter = new Intl.NumberFormat('ar', {style:'percent'});
  try {
    for (const path of paths) {
      const response = await fetch(path);
      if (!response.ok) throw new Error('File part unavailable');
      chunks.push(await response.arrayBuffer());
      status.textContent = 'تحميل ملف PDF ' + formatter.format(chunks.length / paths.length);
    }
    const pdf = new Blob(chunks, {type:'application/pdf'});
    chunks.length = 0;
    const digest = await crypto.subtle.digest('SHA-256', await pdf.arrayBuffer());
    const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
    if (hex !== panel.dataset.sha) throw new Error('File verification failed');
    const url = URL.createObjectURL(pdf);
    for (const id of ['openfile','download']) {
      const link = document.getElementById(id);
      link.href = url;
      link.hidden = false;
      if (id === 'download') link.download = panel.dataset.name + '.pdf';
    }
    const frame = document.createElement('iframe');
    frame.title = panel.dataset.name + ' — نسخة PDF';
    frame.src = url;
    document.getElementById('viewer').append(frame);
    status.textContent = '';
  } catch {
    status.textContent = 'تعذّر فتح الملف. ';
    const retry = document.createElement('button');
    retry.textContent = 'إعادة المحاولة';
    retry.onclick = () => location.reload();
    status.append(retry);
  }
}
openReviewedPDF();
