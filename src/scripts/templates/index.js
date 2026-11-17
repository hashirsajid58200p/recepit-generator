import { purpleTransferTemplate } from './purple-transfer.js';
import { tealBillTemplate } from './teal-bill.js';

export const TEMPLATES = [purpleTransferTemplate, tealBillTemplate];

export function getTemplateById(id) {
  return TEMPLATES.find((template) => template.id === id) || TEMPLATES[0];
}
