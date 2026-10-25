/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-references.
 * Source: .accordion (global.novocare.com) - <details> with summary h6 title and
 * .accordion-details holding an ordered list of citations.
 * Output: one row per <details>: [title text] | [content (ol of citations)].
 */
export default function parse(element, { document }) {
  const cells = [];
  const items = [...element.querySelectorAll('details')];

  items.forEach((details) => {
    const summary = details.querySelector('summary');
    const titleEl = summary && (summary.querySelector('.cmp-accordion__title, h1, h2, h3, h4, h5, h6') || summary);
    const title = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '';

    const body = details.querySelector('.accordion-details') || details;
    const content = [];
    const container = body.querySelector('.text') || body;
    [...container.children].forEach((child) => {
      if (child.tagName === 'SUMMARY') return;
      if (!child.textContent.replace(/ /g, ' ').trim()) return;
      content.push(child.cloneNode(true));
    });

    if (!title && !content.length) return;
    cells.push([title, content]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-references', cells });
  element.replaceWith(block);
}
