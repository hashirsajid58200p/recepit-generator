const canvas = document.querySelector('#receipt'),
  ctx = canvas.getContext('2d'),
  form = document.querySelector('#details'),
  status = document.querySelector('#status');
const base = new Image(),
  logos = {},
  save = document.querySelector('#save'),
  share = document.querySelector('#share');
let ready = false,
  busy = false,
  activeTemplate = 1;
const secondBase = new Image(),
  logoSets = { 1: logos, 2: {} },
  templateDrafts = {};

const themeToggle = document.querySelector('[data-theme-toggle]');
if (themeToggle) {
  const syncThemeButton = () => {
    const isLight = document.documentElement.classList.contains('light');
    themeToggle.setAttribute('aria-pressed', String(isLight));
    const label = themeToggle.querySelector('.theme-label');
    if (label) label.textContent = isLight ? 'Dark' : 'Light';
  };
  syncThemeButton();
  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    try {
      localStorage.setItem('receipt_studio_theme', isLight ? 'light' : 'dark');
    } catch {}
    syncThemeButton();
  });
}

function text(value, x, y, size, color = '#222', weight = 400, align = 'left', width = 900, family = 'ReceiptArial') {
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(value).width > width && size > 12) {
    size--;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  ctx.fillText(value, x, y);
}

function logo(key, x, y, w, h, circle = false) {
  if (!logoSets[activeTemplate][key]) return;
  const im = logoSets[activeTemplate][key];
  ctx.save();
  if (circle) {
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    ctx.clip();
  }
  const s = Math.min(w / im.width, h / im.height);
  ctx.drawImage(im, x + (w - im.width * s) / 2, y + (h - im.height * s) / 2, im.width * s, im.height * s);
  ctx.restore();
}

function nameText(value, x, y, width) {
  ctx.font = '700 44px ReceiptArial';
  const lines = [];
  for (const paragraph of value.split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      if (!word) continue;
      const candidate = line ? line + ' ' + word : word;
      if (ctx.measureText(candidate).width <= width) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
      }
      for (const char of word) {
        if (ctx.measureText(line + char).width > width) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
    }
    if (line) lines.push(line);
  }
  if (lines.length > 2) {
    let last = lines[1];
    while (last && ctx.measureText(last + '…').width > width) last = last.slice(0, -1);
    lines[1] = last + '…';
  }
  lines.slice(0, 2).forEach((line, index) => text(line, x, y + 59 * index, 44, '#222', 700, 'left', Infinity));
  return Math.min(lines.length, 2);
}

function render() {
  if (!ready) return;
  if (activeTemplate === 2) {
    renderSecond();
    return;
  }
  ctx.clearRect(0, 0, 1080, 1574);
  ctx.drawImage(base, 0, 0);
  const d = Object.fromEntries(new FormData(form));
  let amount = Number(d.amount);
  text(
    'Rs. ' + (Number.isFinite(amount) ? amount.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0'),
    540,
    410,
    92,
    '#674ac2',
    700,
    'center',
    950,
    'ReceiptAmount'
  );
  let [h, m] = (d.time || '00:00').split(':').map(Number);
  const time = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  const date = new Date((d.date || '2026-09-09') + 'T12:00:00');
  const stamp = Number.isNaN(date.getTime())
    ? ''
    : `${String(date.getDate()).padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
  text(`Paid at ${time} on ${stamp}`, 540, 494, 40, '#777', 400, 'center', 960);
  nameText(d.sender, 211, 822, 300);
  text('*' + d.senderNumber, 211, 936, 40, '#777', 400, 'left', 300);
  const recipientLines = nameText(d.recipient, 726, 822, 278);
  text(d.recipientNumber, 726, recipientLines > 1 ? 936 : 877, 40, '#777', 400, 'left', 278);
  text(d.transaction, 1000, 1194, 44, '#222', 700, 'right', 590);
  logo('from', 79, 775, 108, 108, true);
  logo('to', 593, 775, 108, 108, true);
  logo('processor', 590, 1335, 310, 125);
}

function randomTransaction() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  form.elements.transaction.value = String(
    activeTemplate === 1 ? 100000000 + (values[0] % 900000000) : 1000000 + (values[0] % 9000000)
  );
  render();
}

randomTransaction();
document.querySelector('#randomize').addEventListener('click', () => {
  randomTransaction();
  status.textContent = `New ID: ${form.elements.transaction.value}`;
});
form.elements.senderNumber.addEventListener('input', () => {
  form.elements.senderNumber.value = form.elements.senderNumber.value.replace(/[^0-9]/g, '').slice(0, 4);
});
form.addEventListener('input', render);

for (const input of document.querySelectorAll('[data-logo]')) {
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      status.textContent = 'Choose a PNG, JPG, or WebP image';
      input.value = '';
      return;
    }
    const url = URL.createObjectURL(file),
      im = new Image();
    try {
      im.src = url;
      await im.decode();
      logoSets[activeTemplate][input.dataset.logo] = im;
      render();
      status.textContent = 'Logo added';
    } catch {
      status.textContent = 'This image could not be loaded';
    } finally {
      URL.revokeObjectURL(url);
    }
  });
}

for (const button of document.querySelectorAll('[data-clear]')) {
  button.addEventListener('click', () => {
    delete logoSets[activeTemplate][button.dataset.clear];
    document.querySelector(`[data-logo="${button.dataset.clear}"]`).value = '';
    render();
  });
}

function blob() {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Image could not be generated.'))), 'image/png')
  );
}

function download(b) {
  const url = URL.createObjectURL(b),
    a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${canvas.width}x${canvas.height}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function exportReceipt(sharing) {
  if (busy) return;
  if (!form.reportValidity()) return;
  busy = true;
  save.disabled = share.disabled = true;
  try {
    render();
    const b = await blob();
    if (sharing) {
      const file = new File([b], `receipt-${canvas.width}x${canvas.height}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        status.textContent = 'Receipt shared';
      } else {
        download(b);
        status.textContent = 'File sharing is unavailable in this browser; receipt downloaded';
      }
    } else {
      download(b);
      status.textContent = `${canvas.width} × ${canvas.height} PNG downloaded`;
    }
  } catch (e) {
    status.textContent = e.name === 'AbortError' ? 'Sharing cancelled' : e.message;
  } finally {
    busy = false;
    save.disabled = share.disabled = false;
  }
}

save.addEventListener('click', () => exportReceipt(false));
share.addEventListener('click', () => exportReceipt(true));

(async () => {
  try {
    base.src = 'assets/template.png';
    secondBase.src = 'assets/template2.png';
    const defaultLogos = Object.entries({ from: 'logo1.webp', to: 'logo2.jpeg', processor: 'logo3.png' }).map(
      async ([key, file]) => {
        const im = new Image();
        im.src = 'assets/' + file;
        await im.decode();
        logos[key] = im;
      }
    );
    const secondLogos = Object.entries({ from: 'receipt2-logo1.png', to: 'receipt2-logo2.jpeg' }).map(
      async ([key, file]) => {
        const im = new Image();
        im.src = 'assets/' + file;
        await im.decode();
        logoSets[2][key] = im;
      }
    );
    await Promise.all([
      ...defaultLogos,
      ...secondLogos,
      base.decode(),
      secondBase.decode(),
      document.fonts.load('400 40px ReceiptAmount'),
      document.fonts.load('44px ReceiptArial'),
      document.fonts.load('700 92px ReceiptAmount'),
      document.fonts.load('700 44px ReceiptArial')
    ]);
    ready = true;
    render();
    save.disabled = share.disabled = false;
  } catch {
    status.textContent = 'Receipt assets could not load; please refresh';
  }
})();

function recessedRecipientLogo(x, y, size) {
  if (!logoSets[2].to) return;
  const cx = x + size / 2,
    cy = y + size / 2,
    r = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, size, size);
  const inset = size * 0.1;
  logo('to', x + inset, y + inset, size - 2 * inset, size - 2 * inset);
  const rim = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r);
  rim.addColorStop(0, 'rgba(125,133,133,0)');
  rim.addColorStop(0.55, 'rgba(125,133,133,0.015)');
  rim.addColorStop(0.85, 'rgba(125,133,133,0.07)');
  rim.addColorStop(1, 'rgba(125,133,133,0.15)');
  ctx.fillStyle = rim;
  ctx.fillRect(x, y, size, size);
  const shade = ctx.createRadialGradient(cx, cy + r * 0.3, r * 0.55, cx, cy + r * 0.3, r * 1.3);
  shade.addColorStop(0, 'rgba(95,103,103,0)');
  shade.addColorStop(0.6, 'rgba(95,103,103,0.015)');
  shade.addColorStop(1, 'rgba(95,103,103,0.18)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, size, size);
  ctx.restore();
}

function renderSecond() {
  ctx.clearRect(0, 0, 1003, 2460);
  ctx.drawImage(secondBase, 0, 0);
  const d = Object.fromEntries(new FormData(form));
  const scale = 1003 / 835;
  function t(value, x, y, size = 34, color = '#7c858a', weight = 400, width = 760) {
    text(value, x * scale, y * scale, size * scale, color, weight, 'center', width * scale, 'ReceiptAmount');
  }
  const value = Number(d.amount).toLocaleString('en-US', { maximumFractionDigits: 2 });
  ctx.font = `700 ${86 * scale}px ReceiptAmount`;
  const prefix = 'PKR ',
    total = ctx.measureText(prefix + value).width;
  const left = (1003 - total) / 2;
  text(prefix, left, 426 * scale, 86 * scale, '#637781', 700, 'left', Infinity, 'ReceiptAmount');
  text(value, left + ctx.measureText(prefix).width, 426 * scale, 86 * scale, '#159eaa', 700, 'left', Infinity, 'ReceiptAmount');
  t(d.sender.replace(/\s+/g, ' ').trim(), 417.5, 822, 32);
  t(d.accountType, 417.5, 877, 36, '#29b7b5');
  t('Account No: ' + d.accountNumber, 417.5, 928, 32, '#929b9d');
  t(d.recipient, 417.5, 1486, 32);
  t(d.recipientType, 417.5, 1540, 36, '#29b7b5');
  t('Consumer No: ' + d.recipientNumber, 417.5, 1594, 32, '#929b9d');
  const parts = d.date.split('-');
  t('Date: ' + parts.reverse().join('/'), 207, 1717, 36, '#7c858a', 400, 390);
  t('Time: ' + (d.time.length === 5 ? d.time + ':00' : d.time), 630, 1717, 36, '#7c858a', 400, 380);
  t('Purpose of payment: ' + d.purpose, 417.5, 1815, 36);
  t('Transaction ID: ' + d.transaction, 417.5, 2012, 36, '#29b7b5');
  logo('from', 168 * scale, 38 * scale, 497 * scale, 136 * scale);
  recessedRecipientLogo(349 * scale, 1280 * scale, 138 * scale);
}

function selectTemplate(id) {
  if (id === activeTemplate || !ready || busy) return;
  templateDrafts[activeTemplate] = Object.fromEntries(new FormData(form));
  activeTemplate = id;
  if (templateDrafts[id]) {
    for (const [key, value] of Object.entries(templateDrafts[id])) {
      if (form.elements[key]) form.elements[key].value = value;
    }
  } else if (id === 2) {
    form.elements.amount.value = '5000';
    form.elements.sender.value = 'AMIR ALI';
    form.elements.recipient.value = '1 Bill Invoice';
    form.elements.recipientNumber.value = '100000000000001';
    form.elements.date.value = '2026-10-14';
    form.elements.time.value = '14:21:37';
    randomTransaction();
  }
  canvas.width = id === 1 ? 1080 : 1003;
  canvas.height = id === 1 ? 1574 : 2460;
  document.querySelector('.dimensions').textContent = `${canvas.width} × ${canvas.height}`;
  document.querySelectorAll('[data-only]').forEach(el => {
    el.hidden = Number(el.dataset.only) !== id;
    el.querySelectorAll('input').forEach(input => (input.disabled = el.hidden));
  });
  document.querySelector('#from-logo-label').textContent = id === 1 ? 'From logo' : 'Header logo';
  document.querySelector('#logo-hint').textContent =
    id === 1
      ? 'Default logos are loaded and ready to replace below'
      : 'Header and recipient logos are loaded and ready to replace below';
  document.querySelectorAll('[data-template]').forEach(button => {
    const selected = Number(button.dataset.template) === id;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('em').textContent = selected ? 'Active' : 'Select';
  });
  document.querySelectorAll('[data-logo]').forEach(input => (input.value = ''));
  status.textContent = '';
  render();
}

for (const button of document.querySelectorAll('[data-template]')) {
  button.addEventListener('click', () => selectTemplate(Number(button.dataset.template)));
}
