/**
 * Draw single-line text on a 2D canvas context, shrinking font size down to 12px if it exceeds maxWidth.
 */
export function drawText(
  ctx,
  value,
  x,
  y,
  size,
  color = '#222',
  weight = 400,
  align = 'left',
  maxWidth = 900,
  family = 'ReceiptArial'
) {
  let fontSize = size;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${fontSize}px ${family}`;

  while (ctx.measureText(value).width > maxWidth && fontSize > 12) {
    fontSize -= 1;
    ctx.font = `${weight} ${fontSize}px ${family}`;
  }

  ctx.fillText(value, x, y);
}

/**
 * Draw an image aspect-fit inside (x, y, w, h), optionally clipped to a circle.
 */
export function drawLogo(ctx, image, x, y, w, h, circle = false) {
  if (!image) return;

  ctx.save();
  if (circle) {
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    ctx.clip();
  }

  const scale = Math.min(w / image.width, h / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  ctx.drawImage(image, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
  ctx.restore();
}

/**
 * Wrap a name up to 2 lines within maxWidth (truncating overflow with an ellipsis) and return line count.
 */
export function drawWrappedName(ctx, value, x, y, maxWidth, lineHeight = 59) {
  ctx.font = '700 44px ReceiptArial';
  const lines = [];

  for (const paragraph of String(value || '').split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      if (!word) continue;
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
      }
      for (const char of word) {
        if (ctx.measureText(line + char).width > maxWidth) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
    }
    if (line) lines.push(line);
  }

  if (lines.length > 2) {
    let second = lines[1];
    while (second && ctx.measureText(`${second}…`).width > maxWidth) {
      second = second.slice(0, -1);
    }
    lines[1] = `${second}…`;
  }

  const visible = lines.slice(0, 2);
  visible.forEach((line, index) => {
    drawText(ctx, line, x, y + lineHeight * index, 44, '#222', 700, 'left', Infinity);
  });

  return visible.length;
}
