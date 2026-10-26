import { createTag, getVideoEmbed, createVideoPlayer } from '../../scripts/shared.js';

/*
 * carousel-video: one row per slide. The cell holds a video link (link text = player title),
 * an optional poster image (used by Dynamic Media / file videos) and an optional caption
 * paragraph shown as a badge on the video. Optional rows "Previous | label" and
 * "Next | label" name the arrow buttons; without them the arrows and dots are named after
 * the slide they go to.
 */

const CONFIG_KEYS = ['previous', 'next'];

let instanceCount = 0;

function parse(block) {
  const config = {};
  const slides = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent.trim().toLowerCase();
    if (cells.length > 1 && CONFIG_KEYS.includes(key) && !row.querySelector('a[href]')) {
      config[key] = cells[1].textContent.trim();
      return;
    }
    const link = [...row.querySelectorAll('a[href]')].find((a) => getVideoEmbed(a.href));
    if (!link) return;
    const img = row.querySelector('picture img');
    const linkParagraph = link.closest('p');
    const caption = [...row.querySelectorAll('p')]
      .filter((p) => p !== linkParagraph && !p.querySelector('picture') && p.textContent.trim())
      .map((p) => p.textContent.trim())
      .join(' ');
    slides.push({
      embed: getVideoEmbed(link.href),
      title: link.textContent.trim() || link.title || '',
      poster: img?.src,
      caption,
    });
  });
  return { config, slides };
}

/** @param {Element} block The carousel-video block element */
export default function decorate(block) {
  const { config, slides } = parse(block);
  if (!slides.length) {
    block.replaceChildren();
    return;
  }
  instanceCount += 1;
  const uid = `carousel-video-${instanceCount}`;

  const track = createTag('ul', { class: 'carousel-video-slides', id: `${uid}-slides` });
  const slideEls = slides.map((slide, index) => {
    const frame = createTag('div', { class: 'carousel-video-frame' }, createVideoPlayer(slide.embed, {
      title: slide.title,
      poster: slide.poster,
    }));
    if (slide.caption) {
      frame.append(createTag('span', { class: 'carousel-video-badge' }, slide.caption));
    }
    const li = createTag('li', {
      class: 'carousel-video-slide',
      id: `${uid}-slide-${index}`,
      'aria-label': slide.title || null,
    }, frame);
    track.append(li);
    return li;
  });
  block.replaceChildren(track);
  if (slides.length < 2) return;

  const prev = createTag('button', { type: 'button', class: 'carousel-video-prev', 'aria-controls': track.id });
  const next = createTag('button', { type: 'button', class: 'carousel-video-next', 'aria-controls': track.id });
  const dots = slides.map((slide, index) => createTag('button', {
    type: 'button',
    class: 'carousel-video-dot',
    'aria-controls': slideEls[index].id,
    'aria-label': slide.title || null,
  }));
  const controls = createTag('div', { class: 'carousel-video-controls' }, [
    prev,
    createTag('div', { class: 'carousel-video-dots' }, dots),
    next,
  ]);
  block.append(controls);

  let active = 0;

  function update(index) {
    active = index;
    slideEls.forEach((el, i) => {
      const current = i === index;
      el.toggleAttribute('inert', !current);
      el.setAttribute('aria-hidden', String(!current));
      if (!current) el.querySelector('video')?.pause();
    });
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    prev.setAttribute('aria-label', config.previous || slides[Math.max(index - 1, 0)].title);
    next.setAttribute('aria-label', config.next || slides[Math.min(index + 1, slides.length - 1)].title);
  }

  function goTo(index) {
    const target = Math.max(0, Math.min(slides.length - 1, index));
    track.scrollTo({ left: slideEls[target].offsetLeft - track.offsetLeft, behavior: 'smooth' });
    update(target);
  }

  prev.addEventListener('click', () => goTo(active - 1));
  next.addEventListener('click', () => goTo(active + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  // keep the controls in sync when the visitor swipes the track
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const index = slideEls.indexOf(entry.target);
        if (index !== active) update(index);
      }
    });
  }, { root: track, threshold: 0.6 });
  slideEls.forEach((el) => observer.observe(el));

  update(0);
}
