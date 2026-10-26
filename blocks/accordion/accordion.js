import { createTag } from '../../scripts/shared.js';

/*
 * accordion: one row per item. Cell 1 = title, cell 2 = body content.
 * Rendered as native details/summary so it works without script state.
 */

/** @param {Element} block The accordion block element */
export default function decorate(block) {
  const items = [...block.children].map((row) => {
    const [titleCell, ...bodyCells] = [...row.children];
    if (!titleCell || !titleCell.textContent.trim()) return null;

    // keep inline formatting of the title but drop block wrappers (p, headings)
    const blocks = titleCell.querySelectorAll(':scope > :is(p, h1, h2, h3, h4, h5, h6)');
    const titleNodes = blocks.length === 1 ? [...blocks[0].childNodes] : [...titleCell.childNodes];
    const summary = createTag('summary', { class: 'accordion-item-label' }, [
      createTag('span', { class: 'accordion-item-title' }, titleNodes),
      createTag('span', { class: 'accordion-item-icon', 'aria-hidden': 'true' }),
    ]);
    const body = createTag('div', { class: 'accordion-item-body' });
    bodyCells.forEach((cell) => body.append(...cell.childNodes));
    return createTag('details', { class: 'accordion-item' }, [summary, body]);
  }).filter(Boolean);
  block.replaceChildren(...items);
}
