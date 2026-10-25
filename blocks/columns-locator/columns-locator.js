import { createTag } from '../../scripts/shared.js';

let instanceCount = 0;

/**
 * Turn the authored country list into a <select> placed next to the CTA link.
 * List items that are links become options (value = link URL); the first
 * plain-text item, if any, becomes the placeholder option.
 */
function buildFinder(textCol) {
  const list = textCol.querySelector('ul, ol');
  if (!list) return;
  const items = [...list.querySelectorAll(':scope > li')];
  const links = [...textCol.querySelectorAll('a[href]')].filter((a) => !list.contains(a));
  const cta = links.pop();

  instanceCount += 1;
  const select = createTag('select', { class: 'columns-locator-select', id: `columns-locator-${instanceCount}` });
  const placeholderItem = items.find((li) => !li.querySelector('a[href]'));
  const placeholderText = placeholderItem?.textContent.trim() || '';
  if (placeholderItem) {
    select.append(createTag('option', { value: '', selected: '' }, placeholderText));
  }
  items.forEach((li) => {
    const a = li.querySelector('a[href]');
    if (a) select.append(createTag('option', { value: a.href }, a.textContent.trim()));
  });
  if (placeholderText) select.setAttribute('aria-label', placeholderText);

  const finder = createTag('div', { class: 'columns-locator-finder' }, select);
  const ctaContainer = cta?.closest('p, div');
  if (cta) {
    const fallbackHref = cta.getAttribute('href');
    cta.dataset.fallbackHref = fallbackHref;
    const ctaWrap = ctaContainer && ctaContainer !== textCol ? ctaContainer : cta;
    finder.append(ctaWrap);

    select.addEventListener('change', () => {
      cta.setAttribute('href', select.value || fallbackHref);
    });
    cta.addEventListener('click', (event) => {
      const href = select.value || fallbackHref;
      if (!href || href === '#') {
        event.preventDefault();
        select.focus();
      }
    });
  }

  list.replaceWith(finder);
}

/**
 * Two-column locator: text (heading, copy, country list, CTA) | illustration.
 * @param {Element} block The columns-locator block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    [...row.children].forEach((col, index) => {
      const isMedia = col.querySelector('picture') && !col.textContent.trim();
      col.classList.add(isMedia ? 'columns-locator-img-col' : 'columns-locator-text-col');
      if (isMedia && index === 0) row.classList.add('columns-locator-img-first');
      if (!isMedia) buildFinder(col);
    });
  });
}
