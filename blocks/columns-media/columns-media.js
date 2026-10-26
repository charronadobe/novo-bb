import { createTag, getVideoEmbed, createVideoPlayer } from '../../scripts/shared.js';

/**
 * A cell that holds nothing but one video link (YouTube, Vimeo, video platform, Dynamic Media).
 * @param {Element} col
 * @returns {HTMLAnchorElement|null}
 */
function videoLinkOf(col) {
  const links = col.querySelectorAll('a[href]');
  if (links.length !== 1 || col.querySelector('picture, h1, h2, h3, h4, h5, h6')) return null;
  const [link] = links;
  if (col.textContent.trim() !== link.textContent.trim()) return null;
  return getVideoEmbed(link.href) ? link : null;
}

/**
 * Two-column media + text layout. One row, two cells (media | text, either order).
 * The media cell holds an image or a video link. Options: light-blue, light-green, grey
 * (rounded background panel) and stacked (media above centred text at every width).
 * @param {Element} block The columns-media block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  if (!firstRow) return;
  block.classList.add(`columns-media-${firstRow.children.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col, index) => {
      const pic = col.querySelector('picture');
      const videoLink = videoLinkOf(col);
      const isMedia = (pic && !col.textContent.trim()) || Boolean(videoLink);
      col.classList.add(isMedia ? 'columns-media-img-col' : 'columns-media-text-col');
      if (isMedia && index === 0) row.classList.add('columns-media-img-first');
      if (videoLink) {
        const title = videoLink.textContent.trim() || videoLink.title || '';
        const player = createVideoPlayer(getVideoEmbed(videoLink.href), { title });
        col.classList.add('columns-media-video-col');
        col.replaceChildren(createTag('div', { class: 'columns-media-video' }, player));
      }
    });
  });
}
