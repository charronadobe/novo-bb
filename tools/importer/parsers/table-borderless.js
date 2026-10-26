/* eslint-disable */
/* global WebImporter */
/**
 * Parser for table-borderless (Table, no header row).
 * Source: .table.parbase (global.novocare.com) - a plain <table> with a label cell in the
 * first row ("BMI Classification") and empty first cells in following rows.
 * Output: one data row per source row, two cells: [label or empty] | [bold class name + range].
 */
function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ');
}

/** Rebuild a cell as a paragraph keeping <b>/<strong> runs bold; adjacent bold runs merge. */
function buildCell(document, td) {
  const parts = [];
  td.childNodes.forEach((node) => {
    const text = clean(node.textContent);
    if (!text) return;
    const bold = node.nodeType === 1 && /^(B|STRONG)$/.test(node.tagName);
    const prev = parts[parts.length - 1];
    if (bold) {
      if (!text.trim()) return;
      if (prev && prev.bold) prev.text += text;
      else if (prev && !prev.text.trim() && parts[parts.length - 2] && parts[parts.length - 2].bold) {
        // whitespace between two bold runs ("Obesity Class I") stays inside the bold run
        parts.pop();
        parts[parts.length - 1].text += ` ${text}`;
      } else parts.push({ bold: true, text });
    } else if (prev && !prev.bold) {
      prev.text += text;
    } else {
      parts.push({ bold: false, text });
    }
  });

  const p = document.createElement('p');
  parts.forEach((part, i) => {
    let { text } = part;
    if (part.bold) {
      const strong = document.createElement('strong');
      strong.textContent = text.trim();
      if (i > 0 && /^\s/.test(text)) p.append(document.createTextNode(' '));
      p.append(strong);
      if (/\s$/.test(text) && parts[i + 1]) p.append(document.createTextNode(' '));
    } else {
      if (i === 0) text = text.replace(/^\s+/, '');
      if (i === parts.length - 1) text = text.replace(/\s+$/, '');
      if (text) p.append(document.createTextNode(text));
    }
  });
  return p.textContent.trim() ? p : '';
}

export default function parse(element, { document }) {
  const cells = [];
  const table = element.querySelector('table');
  const rows = table ? [...table.querySelectorAll(':scope > tbody > tr, :scope > tr')] : [];

  rows.forEach((tr) => {
    const tds = [...tr.querySelectorAll(':scope > td, :scope > th')];
    if (!tds.length) return;
    const label = buildCell(document, tds[0]);
    const values = tds.slice(1).map((td) => buildCell(document, td));
    if (!values.length) values.push('');
    cells.push([label, ...values]);
  });

  // pad to a uniform column count
  const width = Math.max(0, ...cells.map((r) => r.length));
  cells.forEach((r) => { while (r.length < width) r.push(''); });

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-borderless', cells });
  element.replaceWith(block);
}
