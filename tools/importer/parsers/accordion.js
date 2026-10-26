/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion (library convention: 2 columns, one row per item:
 * title cell | content cell).
 * Source: consecutive .accordion components (global.novocare.com food-noise FAQ and
 * hormone list) - each one details > summary (strong.cmp-accordion__title) + .accordion-details.
 * The first accordion of a run collects its following .accordion siblings into one block.
 */
function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function isItem(el) {
  return el && el.classList && el.classList.contains('accordion')
    && !el.classList.contains('accordion--transparent') && !el.classList.contains('accordion--small-text');
}

export default function parse(element, { document }) {
  const run = [element];
  let next = element.nextElementSibling;
  while (isItem(next)) {
    run.push(next);
    next = next.nextElementSibling;
  }

  const cells = [];
  run.forEach((item) => {
    const title = item.querySelector('.cmp-accordion__title, summary');
    const body = item.querySelector('.accordion-details') || item;
    const content = [];
    body.querySelectorAll('.text > p, .text > ul, .text > ol, .text > h3, .text > h4').forEach((el) => {
      if (clean(el.textContent)) content.push(el.cloneNode(true));
    });
    if (!content.length && clean(body.textContent)) {
      const p = document.createElement('p');
      p.textContent = clean(body.textContent);
      content.push(p);
    }
    if (title && clean(title.textContent)) cells.push([clean(title.textContent), content]);
  });

  run.slice(1).forEach((el) => el.remove());
  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion', cells });
  element.replaceWith(block);
}
