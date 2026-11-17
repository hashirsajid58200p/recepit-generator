const DESIGN_WIDTH = 835;

function drawRecessedRecipientLogo(ctx, image, utils, x, y, size) {
  if (!image) return;

  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, size, size);

  const inset = size * 0.1;
  utils.drawLogo(ctx, image, x + inset, y + inset, size - 2 * inset, size - 2 * inset, false);

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

export const tealBillTemplate = {
  id: 'teal-bill',
  name: 'Teal account receipt',
  width: 1003,
  height: 2460,
  canvasFrame: 'flat-light',
  preview: {
    amount: 'PKR 5,000',
    tone: 'teal',
    parties: ['From', 'To'],
    arrow: true,
  },
  background: 'assets/templates/teal-bill/background.png',
  defaultLogos: {
    from: 'assets/templates/teal-bill/from.png',
    to: 'assets/templates/teal-bill/to.jpeg',
  },
  logoHint: 'Header and recipient logos are loaded and ready to replace below',
  logoSlots: [
    { key: 'from', label: 'Header logo' },
    { key: 'to', label: 'To logo' },
  ],
  defaults: {
    amount: '5000',
    time: '14:21:37',
    date: '2026-10-14',
    sender: 'AMIR ALI',
    recipient: '1 Bill Invoice',
    recipientNumber: '100000000000001',
    accountType: 'Current Account',
    accountNumber: '38************13',
    recipientType: '1 Bill Invoice',
    purpose: 'Online Payments',
  },
  extraFields: [
    { name: 'accountType', label: 'Account type', maxlength: 30, pairWithNext: true },
    { name: 'accountNumber', label: 'Sender account number', maxlength: 30 },
    { name: 'recipientType', label: 'Recipient service or type', maxlength: 35 },
    { name: 'purpose', label: 'Purpose of payment', maxlength: 50 },
  ],
  generateTransactionId() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return String(1000000 + (values[0] % 9000000));
  },
  render(ctx, { data, logos, background, utils }) {
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(background, 0, 0);

    const scale = this.width / DESIGN_WIDTH;
    const drawScaled = (value, x, y, size = 34, color = '#7c858a', weight = 400, maxWidth = 760) => {
      utils.drawText(ctx, value, x * scale, y * scale, size * scale, color, weight, 'center', maxWidth * scale, 'ReceiptAmount');
    };

    const amount = Number(data.amount);
    const formattedAmount = Number.isFinite(amount)
      ? amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : '0';

    ctx.font = `700 ${86 * scale}px ReceiptAmount`;
    const prefix = 'PKR ';
    const totalWidth = ctx.measureText(prefix + formattedAmount).width;
    const left = (this.width - totalWidth) / 2;

    utils.drawText(ctx, prefix, left, 426 * scale, 86 * scale, '#637781', 700, 'left', Infinity, 'ReceiptAmount');
    utils.drawText(
      ctx,
      formattedAmount,
      left + ctx.measureText(prefix).width,
      426 * scale,
      86 * scale,
      '#159eaa',
      700,
      'left',
      Infinity,
      'ReceiptAmount'
    );

    drawScaled((data.sender || '').replace(/\s+/g, ' ').trim(), 417.5, 822, 32);
    drawScaled(data.accountType || '', 417.5, 877, 36, '#29b7b5');
    drawScaled(`Account No: ${data.accountNumber || ''}`, 417.5, 928, 32, '#929b9d');

    drawScaled(data.recipient || '', 417.5, 1486, 32);
    drawScaled(data.recipientType || '', 417.5, 1540, 36, '#29b7b5');
    drawScaled(`Consumer No: ${data.recipientNumber || ''}`, 417.5, 1594, 32, '#929b9d');

    const dateFormatted = (data.date || '').split('-').reverse().join('/');
    const timeFormatted = (data.time || '').length === 5 ? `${data.time}:00` : data.time || '';

    drawScaled(`Date: ${dateFormatted}`, 207, 1717, 36, '#7c858a', 400, 390);
    drawScaled(`Time: ${timeFormatted}`, 630, 1717, 36, '#7c858a', 400, 380);
    drawScaled(`Purpose of payment: ${data.purpose || ''}`, 417.5, 1815, 36);
    drawScaled(`Transaction ID: ${data.transaction || ''}`, 417.5, 2012, 36, '#29b7b5');

    utils.drawLogo(ctx, logos.from, 168 * scale, 38 * scale, 497 * scale, 136 * scale, false);
    drawRecessedRecipientLogo(ctx, logos.to, utils, 349 * scale, 1280 * scale, 138 * scale);
  },
};
