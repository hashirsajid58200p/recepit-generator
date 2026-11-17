import * as canvasUtils from './canvas-utils.js';
import { TEMPLATES, getTemplateById } from './templates/index.js';

const canvas = document.querySelector('#receipt');
const ctx = canvas.getContext('2d');
const form = document.querySelector('#details');
const status = document.querySelector('#status');
const saveButton = document.querySelector('#save');
const shareButton = document.querySelector('#share');
const templateList = document.querySelector('#template-list');
const extraFieldsContainer = document.querySelector('#extra-fields');
const logoUploadsContainer = document.querySelector('#logo-uploads');
const logoHint = document.querySelector('#logo-hint');
const dimensionsLabel = document.querySelector('.dimensions');
const canvasWrap = document.querySelector('.canvas-wrap');

let ready = false;
let busy = false;
let activeTemplate = TEMPLATES[0];

const backgrounds = {};
const logoSets = {};
const templateDrafts = {};

const CHECK_ICON = `
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
`;

const ARROW_ICON = `
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 5v14"/>
    <path d="m19 12-7 7-7-7"/>
  </svg>
`;

function initThemeToggle() {
  const themeToggle = document.querySelector('[data-theme-toggle]');
  if (!themeToggle) return;

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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function renderTemplateSelector() {
  templateList.innerHTML = '';

  for (const template of TEMPLATES) {
    const isSelected = template.id === activeTemplate.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `template${isSelected ? ' selected' : ''}`;
    button.dataset.template = template.id;
    button.setAttribute('aria-pressed', String(isSelected));

    const toneClass = template.preview?.tone === 'teal' ? ' mini-teal' : '';
    const partiesMarkup = template.preview?.arrow
      ? `<span class="mini-parties">${template.preview.parties[0]}</span>
         <span class="mini-arrow">${ARROW_ICON}</span>
         <span class="mini-parties">${template.preview.parties[1]}</span>`
      : `<span class="mini-parties">${(template.preview?.parties || ['From', 'To']).join(' &nbsp; ')}</span>`;

    button.innerHTML = `
      <span class="mini${toneClass}" aria-hidden="true">
        ${CHECK_ICON}
        <b>${template.preview?.amount || 'Receipt'}</b>
        <hr>
        ${partiesMarkup}
      </span>
      <span class="template-meta">
        <strong>${template.name}</strong>
        <small>${template.width} × ${template.height} px · PNG</small>
        <em>${isSelected ? 'Active' : 'Select'}</em>
      </span>
    `;

    button.addEventListener('click', () => selectTemplate(template.id));
    templateList.appendChild(button);
  }
}

function createFieldLabel(field, initialValue) {
  const label = document.createElement('label');
  label.textContent = field.label;

  const input = document.createElement('input');
  input.name = field.name;
  input.type = field.type || 'text';
  input.value = initialValue ?? '';
  if (field.maxlength) input.maxLength = field.maxlength;
  if (field.minlength) input.minLength = field.minlength;
  if (field.inputmode) input.inputMode = field.inputmode;
  if (field.pattern) input.pattern = field.pattern;
  if (field.required) input.required = true;
  if (field.monospace) input.classList.add('mono-input');

  if (field.digitsOnly) {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '').slice(0, field.digitsOnly);
    });
  }

  label.appendChild(input);
  return label;
}

function renderExtraFields(template, values) {
  extraFieldsContainer.innerHTML = '';
  const fields = template.extraFields || [];

  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    if (field.pairWithNext && i + 1 < fields.length) {
      const row = document.createElement('div');
      row.className = 'two';
      row.appendChild(createFieldLabel(field, values[field.name]));
      row.appendChild(createFieldLabel(fields[i + 1], values[fields[i + 1].name]));
      extraFieldsContainer.appendChild(row);
      i += 1;
    } else {
      extraFieldsContainer.appendChild(createFieldLabel(field, values[field.name]));
    }
  }
}

function renderLogoUploads(template) {
  logoUploadsContainer.innerHTML = '';
  logoHint.textContent = template.logoHint || 'Default logos are loaded and ready to replace below';

  for (const slot of template.logoSlots) {
    const label = document.createElement('label');
    label.dataset.logoSlot = slot.key;

    const span = document.createElement('span');
    span.textContent = slot.label;

    const input = document.createElement('input');
    input.type = 'file';
    input.dataset.logo = slot.key;
    input.accept = 'image/png,image/jpeg,image/webp';

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        status.textContent = 'Choose a PNG, JPG, or WebP image';
        input.value = '';
        return;
      }

      const url = URL.createObjectURL(file);
      const image = new Image();
      try {
        image.src = url;
        await image.decode();
        logoSets[activeTemplate.id][slot.key] = image;
        render();
        status.textContent = 'Logo added';
      } catch {
        status.textContent = 'This image could not be loaded';
      } finally {
        URL.revokeObjectURL(url);
      }
    });

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.dataset.clear = slot.key;
    clearButton.textContent = 'Remove';
    clearButton.addEventListener('click', () => {
      delete logoSets[activeTemplate.id][slot.key];
      input.value = '';
      render();
    });

    label.append(span, input, clearButton);
    logoUploadsContainer.appendChild(label);
  }
}

function applyTemplateValues(template, values) {
  const merged = { ...template.defaults, ...values };
  for (const [key, value] of Object.entries(merged)) {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  }
  if (!merged.transaction) {
    form.elements.transaction.value = template.generateTransactionId();
  }
}

function render() {
  if (!ready) return;
  const data = Object.fromEntries(new FormData(form));
  activeTemplate.render(ctx, {
    data,
    logos: logoSets[activeTemplate.id] || {},
    background: backgrounds[activeTemplate.id],
    utils: canvasUtils,
  });
}

function randomizeTransaction() {
  form.elements.transaction.value = activeTemplate.generateTransactionId();
  render();
}

function selectTemplate(templateId) {
  if (templateId === activeTemplate.id || !ready || busy) return;

  templateDrafts[activeTemplate.id] = Object.fromEntries(new FormData(form));
  activeTemplate = getTemplateById(templateId);

  const nextValues = {
    ...activeTemplate.defaults,
    ...(templateDrafts[activeTemplate.id] || {}),
  };

  renderExtraFields(activeTemplate, nextValues);
  renderLogoUploads(activeTemplate);
  applyTemplateValues(activeTemplate, nextValues);

  canvas.width = activeTemplate.width;
  canvas.height = activeTemplate.height;
  dimensionsLabel.textContent = `${canvas.width} × ${canvas.height}`;
  canvasWrap.dataset.frame = activeTemplate.canvasFrame || 'rounded-dark';

  document.querySelectorAll('[data-template]').forEach((button) => {
    const selected = button.dataset.template === activeTemplate.id;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
    const badge = button.querySelector('em');
    if (badge) badge.textContent = selected ? 'Active' : 'Select';
  });

  status.textContent = '';
  render();
}

function toPngBlob() {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image could not be generated.'))),
      'image/png'
    );
  });
}

function triggerDownload(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${canvas.width}x${canvas.height}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function exportReceipt(sharing) {
  if (busy) return;
  if (!form.reportValidity()) return;

  busy = true;
  saveButton.disabled = shareButton.disabled = true;

  try {
    render();
    const blob = await toPngBlob();

    if (sharing) {
      const file = new File([blob], `receipt-${canvas.width}x${canvas.height}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        status.textContent = 'Receipt shared';
      } else {
        triggerDownload(blob);
        status.textContent = 'File sharing is unavailable in this browser; receipt downloaded';
      }
    } else {
      triggerDownload(blob);
      status.textContent = `${canvas.width} × ${canvas.height} PNG downloaded`;
    }
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? 'Sharing cancelled' : error.message;
  } finally {
    busy = false;
    saveButton.disabled = shareButton.disabled = false;
  }
}

async function bootstrap() {
  initThemeToggle();
  renderTemplateSelector();
  renderExtraFields(activeTemplate, activeTemplate.defaults);
  renderLogoUploads(activeTemplate);
  applyTemplateValues(activeTemplate, activeTemplate.defaults);
  canvasWrap.dataset.frame = activeTemplate.canvasFrame || 'rounded-dark';

  document.querySelector('#randomize').addEventListener('click', () => {
    randomizeTransaction();
    status.textContent = `New ID: ${form.elements.transaction.value}`;
  });
  form.addEventListener('input', render);
  saveButton.addEventListener('click', () => exportReceipt(false));
  shareButton.addEventListener('click', () => exportReceipt(true));

  try {
    const assetTasks = TEMPLATES.flatMap((template) => {
      logoSets[template.id] = {};
      const bgTask = loadImage(template.background).then((image) => {
        backgrounds[template.id] = image;
      });
      const logoTasks = Object.entries(template.defaultLogos || {}).map(([key, src]) =>
        loadImage(src).then((image) => {
          logoSets[template.id][key] = image;
        })
      );
      return [bgTask, ...logoTasks];
    });

    await Promise.all([
      ...assetTasks,
      document.fonts.load('400 40px ReceiptAmount'),
      document.fonts.load('44px ReceiptArial'),
      document.fonts.load('700 92px ReceiptAmount'),
      document.fonts.load('700 44px ReceiptArial'),
    ]);

    ready = true;
    render();
    saveButton.disabled = shareButton.disabled = false;
  } catch {
    status.textContent = 'Receipt assets could not load; please refresh';
  }
}

bootstrap();
