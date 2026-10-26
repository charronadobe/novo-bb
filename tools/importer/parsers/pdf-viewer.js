/* eslint-disable */
/* global WebImporter */
/**
 * Parser for pdf-viewer.
 * Source: .pdfviewer (global.novocare.com, Adobe PDF Embed) - the document path is in
 * .cmp-pdfviewer[data-cmp-document-path]. The source host refuses to be framed, so the PDF
 * has to live on this site: tools/importer/localize-pdfs.mjs downloads it after import and
 * rewrites the link.
 * Output: one cell: [link to the PDF] (link text = file name, used as the download label).
 */
export default function parse(element, { document, url }) {
  const viewer = element.querySelector('[data-cmp-document-path]');
  const path = viewer && viewer.getAttribute('data-cmp-document-path');
  if (!path) {
    element.remove();
    return;
  }
  const origin = new URL(url || 'https://global.novocare.com/').origin;
  const href = new URL(path.split('/').map(encodeURIComponent).join('/'), origin).href;
  const fileName = decodeURIComponent(path.split('/').pop()).replace(/\.pdf$/i, '');
  const label = fileName.includes(' ') ? fileName : fileName.replace(/[-_]+/g, ' ');

  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = `${label.charAt(0).toUpperCase()}${label.slice(1)} (PDF)`;
  p.append(a);
  const block = WebImporter.Blocks.createBlock(document, { name: 'pdf-viewer', cells: [[p]] });
  element.replaceWith(block);
}
