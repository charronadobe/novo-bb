import { createOptimizedPicture } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

const FILE_VIDEO = /\.(mp4|webm|m3u8|mov)(\?|#|$)/i;

function getEmbed(href) {
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    const id = host === 'youtu.be' ? url.pathname.slice(1) : (url.searchParams.get('v') || url.pathname.split('/').pop());
    return id ? { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` } : null;
  }
  if (host.endsWith('vimeo.com')) {
    const id = url.pathname.split('/').filter(Boolean).pop();
    return id ? { type: 'iframe', src: `https://player.vimeo.com/video/${id}?autoplay=1` } : null;
  }
  // Dynamic Media (Scene7 /is/content/) and direct video files
  if (FILE_VIDEO.test(url.pathname) || url.pathname.includes('/is/content/')) {
    return { type: 'video', src: url.href };
  }
  return null;
}

function playMedia(mediaEl, embed, title) {
  let player;
  if (embed.type === 'iframe') {
    player = createTag('iframe', {
      src: embed.src,
      title,
      allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media',
      loading: 'lazy',
    });
  } else {
    player = createTag('video', {
      src: embed.src, controls: '', autoplay: '', playsinline: '', title,
    });
  }
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
    if (parent?.tagName === 'P' && !parent.textContent.trim() && !parent.children.length) parent.remove();
  }

  const body = createTag('div', { class: 'cards-video-body' });
  cells.filter((c) => c !== imageCell).forEach((c) => body.append(...c.childNodes));

  const links = [...body.querySelectorAll('a[href]'), ...(imageCell ? imageCell.querySelectorAll('a[href]') : [])];
  const videoLink = links.find((a) => getEmbed(a.href));
  const li = createTag('li');

  if (videoLink) {
    const embed = getEmbed(videoLink.href);
    const label = videoLink.textContent.trim() || videoLink.title || '';
    const play = createTag('button', {
      type: 'button',
      class: 'cards-video-play',
      'aria-label': label || null,
    }, createTag('span', { class: 'cards-video-play-icon', 'aria-hidden': 'true' }));
    media.append(play);
    play.addEventListener('click', () => playMedia(media, embed, label));
    // the link is replaced by the play button; drop its now-empty container
    const container = videoLink.closest('p');
    videoLink.remove();
    if (container && !container.textContent.trim() && !container.children.length) container.remove();
    li.classList.add('has-video');
  }

  if (media.children.length) li.append(media);
  if (body.textContent.trim() || body.querySelector('picture, img')) li.append(body);
  return li;
}

/** @param {Element} block The cards-video block element */
export default function decorate(block) {
  const ul = createTag('ul');
  [...block.children].forEach((row) => ul.append(decorateCard(row)));
  block.replaceChildren(ul);
}
