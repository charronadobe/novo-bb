/* eslint-disable */
/* global WebImporter */
/**
 * Parser for whtr-calculator.
 * Source: .cmp-whc.cmp-waist-height-calculator (global.novocare.com).
 * Output: configuration rows (label | value), same model as bmi-calculator, and
 * Category | name | upper ratio limit | description rows (4 columns, padded).
 * The source computes the result category in a protected AEM servlet, so the commonly
 * used Waist-to-Height Ratio bands (0.4 / 0.5 / 0.6) are used as the category fallback.
 */
const FALLBACK_CATEGORIES = [
  ['Take care', '0.4', ''],
  ['Healthy', '0.5', ''],
  ['Increased health risk', '0.6', ''],
  ['High health risk', '', ''],
];

function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const cells = [];
  const row = (label, value, third = '') => {
    if (value) cells.push([label, value, third, '']);
  };

  const srcHeading = element.querySelector('.cmp-whc__section-heading h1, .cmp-whc__section-heading h2, .cmp-whc__section-heading h3');
  if (srcHeading) {
    const h2 = document.createElement('h2');
    h2.textContent = clean(srcHeading.textContent);
    cells.push(['Title', h2, '', '']);
  }

  // Info tooltip: first text node/label = trigger, rest = tooltip text
  const info = element.querySelector('.cmp-whc__section-info');
  if (info && clean(info.textContent)) {
    const parts = [...info.querySelectorAll('span, p, div')].map((e) => (e.children.length ? '' : clean(e.textContent))).filter(Boolean);
    const full = clean(info.textContent);
    const trigger = parts[0] && full.startsWith(parts[0]) ? parts[0] : (full.match(/^[^?]+\?/) || [full])[0];
    const tip = clean(full.slice(trigger.length));
    row('Info', trigger, tip);
  }

  const metricLabel = element.querySelector('.cmp-whc__toogle-metric-text--top');
  const imperialLabel = element.querySelector('.cmp-whc__toogle-imperial-text--top');
  row('Metric', clean(metricLabel && metricLabel.textContent) || 'Metric');
  row('Imperial', clean(imperialLabel && imperialLabel.textContent) || 'Imperial');

  const labels = [...element.querySelectorAll('.cmp-whc__metric .cmp-whc__form-label')].map((label) => {
    const copy = label.cloneNode(true);
    copy.querySelectorAll('span').forEach((s) => s.remove());
    return clean(copy.textContent);
  });
  row('Height', labels[0] || 'Height');
  row('Waist', labels[1] || 'Waist');

  const unitsFrom = (formSel) => [...element.querySelectorAll(`${formSel} .cmp-whc__form-input > label`)]
    .map((s) => clean(s.textContent))
    .filter(Boolean)
    .join(', ');
  row('Metric units', unitsFrom('.cmp-whc__metric') || 'cm, cm');
  row('Imperial units', unitsFrom('.cmp-whc__imperial') || 'ft, in, in');

  const button = element.querySelector('.cmp-whc__section-cta-button');
  row('Button', clean(button && button.textContent) || 'Calculate');

  // Result prefix (rendered client-side on the source)
  row('Result', `Your ${clean(srcHeading && srcHeading.textContent).replace(/^Check your\s+/i, '') || 'Waist-to-Height Ratio'} is`);

  const errorEl = element.querySelector('.cmp-whc__form-error-message[data-error-message]');
  row('Error', clean(errorEl && errorEl.getAttribute('data-error-message')));
  const fieldError = element.querySelector('.cmp-whc__input-error-message[data-error-message]');
  row('Field error', clean(fieldError && fieldError.getAttribute('data-error-message')));

  FALLBACK_CATEGORIES.forEach(([name, max, desc]) => {
    cells.push(['Category', name, max, desc]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'whtr-calculator', cells });
  element.replaceWith(block);
}
