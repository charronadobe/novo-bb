/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns (library Columns convention: one row, one cell per visual column;
 * cells hold text and inline elements only, no nested blocks).
 * Source: .splitlayout with text/button-only columns (global.novocare.com tools-quiz:
 * a heading and a "Click here" button per column).
 * Output: one row: [column 1 content] | [column 2 content] ...
 */
function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const columns = [...element.querySelectorAll(':scope > .columns > .column')];
  const row = columns.map((col) => {
    const cell = [];
    col.querySelectorAll('.title h1, .title h2, .title h3, .title h4, .text p, .ctabutton a[href]').forEach((el) => {
      const text = clean(el.textContent);
      if (!text) return;
      if (el.matches('a')) {
        const p = document.createElement('p');
        const a = document.createElement('a');
        a.href = el.getAttribute('href');
        a.textContent = text;
        p.append(a);
        cell.push(p);
      } else if (/^H\d$/.test(el.tagName)) {
        const h3 = document.createElement('h3');
        h3.textContent = text;
        cell.push(h3);
      } else {
        cell.push(el.cloneNode(true));
      }
    });
    return cell;
  }).filter((cell) => cell.length);

  if (!row.length) {
    element.remove();
    return;
  }
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells: [row] });
  element.replaceWith(block);
}
