"""Import and verify the published reader, then make all book links local."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import quote
from urllib.request import Request, urlopen
from zipfile import ZipFile, ZIP_DEFLATED
import time

ROOT = Path('public')
ORIGINS = ['https://grinberg-arabic-reader.i2u.chatgpt.site/', 'https://grinberg-reviewed-pdf.i2u.chatgpt.site/']
manifest = json.loads(Path('migration/assets.json').read_text())

def copy_asset(item):
    name, (source, digest) = item
    for attempt in range(3):
        try:
            url = ORIGINS[source] + quote(name)
            with urlopen(Request(url, headers={'User-Agent':'grinberg-library-migration/1.0'}), timeout=60) as response:
                data = response.read()
            if sha256(data).hexdigest() != digest:
                raise ValueError(f'Content hash mismatch for {name}')
            if name.endswith(('.html', '.js', '.css')):
                for origin in ORIGINS:
                    data = data.replace((origin + '"').encode(), b'index.html"').replace(origin.encode(), b'')
            target = ROOT / name
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(data)
            return
        except Exception:
            if attempt == 2:
                print('Failed to import',name,flush=True)
                raise
            time.sleep(attempt + 1)

if not (ROOT / 'index.html').exists():
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(copy_asset,manifest['files'].items()))

with ZipFile('grinberg-arabic-books.zip','w',ZIP_DEFLATED) as archive:
    for name, digest in manifest['books'].items():
        number = int(name.split(' ')[0])
        pdf_path = ROOT / f'book-{number}.pdf'
        if not pdf_path.exists():
            parts = sorted((ROOT / 'pdf-parts').glob(f'book-{number}-*.bin'))
            pdf_path.write_bytes(b''.join(part.read_bytes() for part in parts))
            for part in parts:
                part.unlink()
        if sha256(pdf_path.read_bytes()).hexdigest() != digest:
            raise ValueError(f'Final PDF hash mismatch: {name}')
        archive.write(pdf_path, name)
# Direct PDF responses allow mobile readers and native browser range requests.
for page in ROOT.glob('*.html'):
    data = page.read_text()
    for number in range(1,9):
        data = data.replace(f'book-{number}-pdf.html',f'book-{number}.pdf')
    if page.name in {f'book-{n}-pdf.html' for n in range(1,9)}:
        pdf = page.name.replace('-pdf.html','.pdf')
        data = f'<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url={pdf}"><title>PDF</title><a href="{pdf}">فتح الكتاب</a></html>'
    page.write_text(data)
(ROOT/'.nojekyll').touch()
print('Verified all eight Arabic PDFs and prepared the site.')
