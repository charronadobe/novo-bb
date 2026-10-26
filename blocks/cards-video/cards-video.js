import { createOptimizedPicture } from '../../scripts/aem.js';
import { createTag, getVideoEmbed, createVideoPlayer } from '../../scripts/shared.js';

/*
 * cards-video: one row per card.
 * cell 1: optional poster image; cell 2: the video link plus optional heading, text and CTA link.
 * With a poster the video loads on click; without one the player is rendered directly.
 * Option "portrait" uses a 9:16 player instead of 16:9.
 */

function removeIfEmpty(el) {
  if (el && !el.textContent.trim() && !el.querySelector('picture, img, iframe, video')) el.remove();
}

function playMedia(mediaEl, embed, title) {
  const player = createVideoPlayer(embed, { title, autoplay: true });
  mediaEl.replaceChildren(player);
  mediaEl.classList.add('is-playing');
  player.focus?.();
}

function decorateCard(row) {
  const cells = [...row.children];
  const imageCell = cells.find((c) => c.querySelector('picture') && !c.textContent.trim());
  const picture = row.querySelector('picture');
  const media = createTag('div', { class: 'cards-video-media' });
  if (picture) {
    const img = picture.querySelector('img');
    // only same-origin (author-uploaded) media supports the optimization params
    const sameOrigin = img && new URL(img.src, window.location.href).origin === window.location.origin;
    media.append(sameOrigin
      ? createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }])
      : picture.cloneNode(true));
    const parent = picture.parentElement;
    picture.remove();
    if (parent?.tagName === 'P') removeIfEmpty(parent);
  }
  const hasPoster = media.children.length > 0;

  const body = createTag('div', { class: 'cards-video-body' });
  cells.filter((c) => c !== imageCell).forEach((c) => body.append(...c.childNodes));

  const links = [...body.querySelectorAll('a[href]'), ...(imageCell ? imageCell.querySelectorAll('a[href]') : [])];
  const videoLink = links.find((a) => getVideoEmbed(a.href));
  const li = createTag('li');

  if (videoLink) {
    const label = videoLink.textContent.trim() || videoLink.title || '';
    if (hasPoster) {
      const embed = getVideoEmbed(videoLink.href, { autoplay: true });
      const play = createTag('button', {
        type: 'button',
        class: 'cards-video-play',
        'aria-label': label || null,
      }, createTag('span', { class: 'cards-video-play-icon', 'aria-hidden': 'true' }));
      media.append(play);
      play.addEventListener('click', () => playMedia(media, embed, label));
    } else {
      media.append(createVideoPlayer(getVideoEmbed(videoLink.href), { title: label }));
      media.classList.add('is-playing');
    }
    // the link is replaced by the player; drop its now-empty container
    const container = videoLink.closest('p');
    videoLink.remove();
    removeIfEmpty(container);
    li.classList.add('has-video');
  }

  // remaining links in standalone paragraphs are CTAs
  body.querySelectorAll(':scope > p.button-container').forEach((p) => p.classList.add('cards-video-cta'));

  if (media.children.length) li.append(media);
  if (body.textContent.trim() || body.querySelector('picture, img')) li.append(body);
  return li;
}

/** @param {Element} block The cards-video block element */
export default function decorate(block) {
  const ul = createTag('ul');
  [...block.children].forEach((row) => ul.append(decorateCard(row)));
  block.classList.add(`cards-video-${Math.min(ul.children.length, 4)}`);
  block.replaceChildren(ul);
}
