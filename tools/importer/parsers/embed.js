/* eslint-disable */
/* global WebImporter */
/**
 * Parser for embed (video).
 * Source: .richmedia holding a video player iframe (global.novocare.com,
 * nn-product.videomarketingplatform.co).
 * Output follows the library convention: 1 column, one row with a single cell
 * holding the URL of the external video; the embed block renders the iframe.
 */
export default function parse(element, { document }) {
  const iframe = element.querySelector('iframe[src]');
  if (!iframe) {
    element.remove();
    return;
  }
  const url = iframe.getAttribute('src');
  const a = document.createElement('a');
  a.href = url;
  a.textContent = url;
  const block = WebImporter.Blocks.createBlock(document, { name: 'embed', cells: [[a]] });
  element.replaceWith(block);
}
