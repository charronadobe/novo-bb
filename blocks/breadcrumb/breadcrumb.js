import { createTag } from '../../scripts/shared.js';

/*
 * breadcrumb: the last row holds the trail as a list (or paragraphs) of links in order;
 * an item without a link is the current page. An optional earlier row holds the
 * accessible name of the navigation; without it the first item's text is used.
 */

function trailItems(cell) {
  const list = cell.querySelector('ul, ol');
  if (list) return [...list.children];
  const paragraphs = [...cell.querySelectorAll(':scope > p')];
  if (paragraphs.length) return paragraphs;
  return [...cell.querySelectorAll('a[href]')];
}

/** @param {Element} block The breadcrumb block element */
export default function decorate(block) {
  const rows = [...block.children];
  const trailRow = rows.at(-1);
  if (!trailRow) return;
  const trailCell = trailRow.lastElementChild || trailRow;
  const labelText = rows.length > 1 ? rows[0].textContent.trim() : '';

  const items = trailItems(trailCell).map((item) => {
    const text = item.textContent.trim();
    if (!text) return null;
    const link = item.tagName === 'A' ? item : item.querySelector('a[href]');
    const li = createTag('li', { class: 'breadcrumb-item' });
    if (link) {
      li.append(createTag('a', { href: link.getAttribute('href') }, link.textContent.trim()));
    } else {
      li.append(createTag('span', { 'aria-current': 'page' }, text));
    }
    return li;
  }).filter(Boolean);
  if (!items.length) return;

  // the last item is the current page even when the author linked it
  const last = items.at(-1);
  if (!last.querySelector('[aria-current]')) last.querySelector('a').setAttribute('aria-current', 'page');

  const nav = createTag('nav', {
    'aria-label': labelText || items[0].textContent.trim(),
  }, createTag('ol', { class: 'breadcrumb-list' }, items));
  block.replaceChildren(nav);
}
