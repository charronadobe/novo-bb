import { createTag } from '../../scripts/shared.js';

/*
 * pdf-viewer: single cell with a link to a PDF (link text = download label) and an optional
 * paragraph used as the accessible title of the viewer. The PDF is shown inline and the
 * authored link stays below it as the download link. Without a PDF link the block is removed.
 */

const isPdf = (a) => /\.pdf(\?|#|$)/i.test(new URL(a.href, window.location.href).pathname);

/** @param {Element} block The pdf-viewer block element */
export default function decorate(block) {
  const link = [...block.querySelectorAll('a[href]')].find(isPdf);
  if (!link) {
    block.closest('.pdf-viewer-wrapper')?.remove();
    block.remove();
    return;
  }

  const linkParagraph = link.closest('p, li') || link;
  const titleParagraph = [...block.querySelectorAll('p, h1, h2, h3, h4, h5, h6')]
    .find((el) => el !== linkParagraph && !el.contains(link) && el.textContent.trim());
  const title = titleParagraph?.textContent.trim() || link.textContent.trim() || link.title || '';

  const url = new URL(link.href, window.location.href);
  url.hash = 'view=FitH';
  const frame = createTag('iframe', {
    class: 'pdf-viewer-frame',
    src: url.href,
    title: title || null,
    loading: 'lazy',
  });
  const viewer = createTag('div', { class: 'pdf-viewer-document' }, frame);

  // keep the authored link (and its button styling) as the download link
  link.setAttribute('download', '');
  const download = createTag('div', { class: 'pdf-viewer-download' }, linkParagraph);
  block.replaceChildren(viewer, download);
}
