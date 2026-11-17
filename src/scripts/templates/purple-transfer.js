const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const purpleTransferTemplate = {
  id: 'purple-transfer',
  name: 'Purple payment receipt',
  width: 1080,
  height: 1574,
  canvasFrame: 'rounded-dark',
  preview: {
    amount: 'Rs. 1,000',
    tone: 'purple',
    parties: ['From', 'To'],
    arrow: false,
  },
  background: 'assets/templates/purple-transfer/background.png',
  defaultLogos: {
    from: 'assets/templates/purple-transfer/from.webp',
    to: 'assets/templates/purple-transfer/to.jpeg',
    processor: 'assets/templates/purple-transfer/processor.png',
  },
  logoHint: 'Default logos are loaded and ready to replace below',
  logoSlots: [
    { key: 'from', label: 'From logo' },
    { key: 'to', label: 'To logo' },
    { key: 'processor', label: 'Processor logo' },
  ],
  defaults: {
    amount: '1000',
    time: '15:19:00',
    date: '2026-09-09',
    sender: 'AMIR\nALI',
    recipient: 'Demo Biller',
    recipientNumber: '1234567890',
    senderNumber: '1234',
  },
  extraFields: [
    {
      name: 'senderNumber',
      label: 'Sender last 4 digits',
      type: 'text',
      maxlength: 4,
      minlength: 4,
      inputmode: 'numeric',
      pattern: '[0-9]{4}',
      required: true,
      monospace: true,
      digitsOnly: 4,
    },
  ],
  generateTransactionId() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return String(100000000 + (values[0] % 900000000));
  },
  render(ctx, { data, logos, background, utils }) {
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(background, 0, 0);

    const amount = Number(data.amount);
    const formattedAmount = Number.isFinite(amount)
      ? amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : '0';

    utils.drawText(ctx, `Rs. ${formattedAmount}`, 540, 410, 92, '#674ac2', 700, 'center', 950, 'ReceiptAmount');

    const [h, m] = (data.time || '00:00').split(':').map(Number);
    const formattedTime = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    const parsedDate = new Date(`${data.date || '2026-09-09'}T12:00:00`);
    const stamp = Number.isNaN(parsedDate.getTime())
      ? ''
      : `${String(parsedDate.getDate()).padStart(2, '0')} ${MONTHS[parsedDate.getMonth()]} ${String(parsedDate.getFullYear()).slice(-2)}`;

    utils.drawText(ctx, `Paid at ${formattedTime} on ${stamp}`, 540, 494, 40, '#777', 400, 'center', 960);

    utils.drawWrappedName(ctx, data.sender, 211, 822, 300);
    utils.drawText(ctx, `*${data.senderNumber || ''}`, 211, 936, 40, '#777', 400, 'left', 300);

    const recipientLines = utils.drawWrappedName(ctx, data.recipient, 726, 822, 278);
    utils.drawText(ctx, data.recipientNumber || '', 726, recipientLines > 1 ? 936 : 877, 40, '#777', 400, 'left', 278);

    utils.drawText(ctx, data.transaction || '', 1000, 1194, 44, '#222', 700, 'right', 590);

    utils.drawLogo(ctx, logos.from, 79, 775, 108, 108, true);
    utils.drawLogo(ctx, logos.to, 593, 775, 108, 108, true);
    utils.drawLogo(ctx, logos.processor, 590, 1335, 310, 125, false);
  },
};
