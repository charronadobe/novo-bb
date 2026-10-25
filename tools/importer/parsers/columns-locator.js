/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-locator.
 * Source: .hcp-locator (global.novocare.com) - .cmp-hcp-locator__info (heading, copy,
 * country <select> enhanced by Choices.js, Find now CTA) + illustration (.cmp-image).
 * Output: one row, two cells:
 *   [h2, paragraph, ul (first plain item = placeholder, then country links), Find now link]
 *   | [illustration image]
 */
function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function absolute(href) {
  if (!href) return '';
  try {
    return new URL(href, 'https://global.novocare.com/').href;
  } catch (e) {
    return href;
  }
}

/** Collect [label, url] pairs; placeholder is the option without a real country URL. */
function getCountries(element) {
  const entries = [];
  // 1. native <select> options (value = URL)
  const options = [...element.querySelectorAll('select.cmp-hcp-locator__info-find-country-select option, .cmp-hcp-locator select option')];
  options.forEach((o) => entries.push({ label: clean(o.textContent), value: o.getAttribute('value') || '' }));

  // 2. Choices.js rendered list (data-value) when the select was reduced to the selected option
  const withValues = entries.filter((e) => e.value);
  if (withValues.length < 2) {
    entries.length = 0;
    element.querySelectorAll('.choices__list--dropdown .choices__item--choice, .choices__item--choice').forEach((item) => {
      entries.push({ label: clean(item.textContent), value: item.getAttribute('data-value') || '' });
    });
  }

  // de-duplicate by label
  const seen = new Set();
  return entries.filter((e) => {
    if (!e.label || seen.has(e.label)) return false;
    seen.add(e.label);
    return true;
  });
}

export default function parse(element, { document }) {
  const info = element.querySelector('.cmp-hcp-locator__info') || element;
  const textCell = [];

  // Heading
  const heading = info.querySelector('h1, h2, h3, h4');
  if (heading && clean(heading.textContent)) {
    const h2 = document.createElement('h2');
    h2.textContent = clean(heading.textContent);
    textCell.push(h2);
  }

  // Copy paragraph(s) (outside the country finder)
  info.querySelectorAll('p').forEach((p) => {
    if (p.closest('.cmp-hcp-locator__info-find-country')) return;
    const text = clean(p.textContent);
    if (!text) return;
    const para = document.createElement('p');
    para.textContent = text;
    textCell.push(para);
  });

  // Country list
  const countries = getCountries(element);
  if (countries.length) {
    const ul = document.createElement('ul');
    countries.forEach((c, index) => {
      const li = document.createElement('li');
      // placeholder: first option ("Select your country"), which points to an internal path
      const isPlaceholder = index === 0 && (!c.value || c.value.startsWith('/content/') || !/^https?:/i.test(c.value));
      if (isPlaceholder) {
        li.textContent = c.label;
      } else if (c.value) {
        const a = document.createElement('a');
        a.href = absolute(c.value);
        a.textContent = c.label;
        li.append(a);
      } else {
        li.textContent = c.label;
      }
      ul.append(li);
    });
    textCell.push(ul);
  }

  // Find now CTA
  const cta = info.querySelector('a.cmp-hcp-locator__info-find-country-cta, .ctabutton a[href]');
  if (cta) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = absolute(cta.getAttribute('href'));
    a.textContent = clean(cta.textContent);
    p.append(a);
    textCell.push(p);
  }

  // Illustration
  const imageCell = [];
  const img = [...element.querySelectorAll('.cmp-image img, img')].find((i) => !info.contains(i) || info === element);
  const cmpImage = element.querySelector('.cmp-image[data-cmp-src], .cmp-image[data-asset]');
  let src = img && (img.getAttribute('src') || (img.getAttribute('srcset') || '').split(/[\s,]+/)[0]);
  if (!src && cmpImage) src = cmpImage.getAttribute('data-cmp-src') || cmpImage.getAttribute('data-asset');
  if (src) {
    const image = document.createElement('img');
    image.src = src;
    const alt = img ? img.getAttribute('alt') || '' : '';
    // source alt is a placeholder ("true"); illustration is decorative
    image.alt = /^(true|false)$/i.test(alt) ? '' : alt;
    imageCell.push(image);
  }

  const cells = [[textCell, imageCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-locator', cells });
  element.replaceWith(block);
}
