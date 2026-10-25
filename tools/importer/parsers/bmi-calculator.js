/* eslint-disable */
/* global WebImporter */
/**
 * Parser for bmi-calculator.
 * Source: .cmp-bmi.cmp-bmi-calculator-v2 (global.novocare.com).
 * Output: configuration rows (label | value) and
 * Category | name | upper BMI limit | description rows (4 columns, padded).
 * Result categories are served by a protected AEM servlet on the source site,
 * so WHO standard adult categories are used as fallback.
 */
const FALLBACK_CATEGORIES = [
  ['Underweight', '18.5', ''],
  ['Healthy weight', '25', ''],
  ['Overweight', '30', ''],
  ['Obesity', '', ''],
];

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const cells = [];
  const row = (label, value) => {
    if (value) cells.push([label, value, '', '']);
  };

  // Title (keep as heading)
  const srcHeading = element.querySelector('.cmp-bmi__section-heading h1, .cmp-bmi__section-heading h2, .cmp-bmi__section-heading h3, h2');
  if (srcHeading) {
    const h2 = document.createElement('h2');
    h2.textContent = clean(srcHeading.textContent);
    cells.push(['Title', h2, '', '']);
  }

  // Toggle labels
  const metricLabel = element.querySelector('.cmp-bmi__toogle-metric-text--top');
  const imperialLabel = element.querySelector('.cmp-bmi__toogle-imperial-text--top');
  row('Metric', clean(metricLabel && metricLabel.textContent) || 'Metric');
  row('Imperial', clean(imperialLabel && imperialLabel.textContent) || 'Imperial');

  // Field labels (label text without nested error span)
  const labelText = (sel) => {
    const label = element.querySelector(sel);
    if (!label) return '';
    const copy = label.cloneNode(true);
    copy.querySelectorAll('span').forEach((s) => s.remove());
    return clean(copy.textContent);
  };
  row('Height', labelText('.cmp-bmi__metric .cmp-bmi__input-height .cmp-bmi__form-label') || 'Height');
  row('Weight', labelText('.cmp-bmi__metric .cmp-bmi__input-weight .cmp-bmi__form-label') || 'Weight');

  // Unit suffixes
  const unitsFrom = (formSel) => [...element.querySelectorAll(`${formSel} .cmp-bmi__form-input > span`)]
    .map((s) => clean(s.textContent))
    .filter(Boolean)
    .join(', ');
  row('Metric units', unitsFrom('.cmp-bmi__metric') || 'cm, kg');
  row('Imperial units', unitsFrom('.cmp-bmi__imperial') || 'ft, in, st, lb');

  // Button
  const button = element.querySelector('.cmp-bmi__section-cta-button');
  row('Button', clean(button && button.textContent) || 'Calculate your BMI');

  // Result prefix (rendered client-side on source)
  row('Result', 'Your BMI is');

  // Error message (data attribute on live DOM)
  const errorEl = element.querySelector('.cmp-bmi__form-error-message[data-error-message]');
  row('Error', clean(errorEl && errorEl.getAttribute('data-error-message'))
    || 'You have not completed the required fields. Please update to get a matching result.');

  // Categories
  FALLBACK_CATEGORIES.forEach(([name, max, desc]) => {
    cells.push(['Category', name, max, desc]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'bmi-calculator', cells });
  element.replaceWith(block);
}
