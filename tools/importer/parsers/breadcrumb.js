/* eslint-disable */
/* global WebImporter */
/**
 * Parser for breadcrumb.
 * Source: .breadcrumb nav.cmp-breadcrumb > ol > li (global.novocare.com) - links, the last
 * item (--active) is the current page.
 * Output: row 1: accessible name of the trail ("Breadcrumb"); row 2: one list of items,
 * linked except the current page.
 */
function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const items = [...element.querySelectorAll('li')];
  const ul = document.createElement('ul');
  items.forEach((li) => {
    const text = clean(li.textContent);
    if (!text) return;
    const item = document.createElement('li');
    const link = li.querySelector('a[href]');
    if (link && !li.className.includes('--active')) {
      const a = document.createElement('a');
      a.href = link.getAttribute('href');
      a.textContent = text;
      item.append(a);
    } else {
      item.textContent = text;
    }
    ul.append(item);
  });
  if (!ul.children.length) {
    element.remove();
    return;
  }
  const label = element.querySelector('nav[aria-label]');
  const cells = [[label ? label.getAttribute('aria-label') : 'Breadcrumb'], [ul]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'breadcrumb', cells });
  element.replaceWith(block);
}
