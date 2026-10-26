/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-video (library Carousel convention: 2 columns, one row per slide:
 * image cell | content cell).
 * Source: .carousel.panelcontainer whose swiper slides hold Scene7 videos
 * (.video__base[data-video-config]) or player iframes (global.novocare.com quality
 * weight loss page). A slide badge (span.ai-badge) becomes the caption.
 * Output: one row per slide: [poster image] | [video link, caption paragraph].
 */
function absolutize(u) {
  if (!u) return '';
  return u.startsWith('//') ? `https:${u}` : u;
}

function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const cells = [];
  const slides = [...element.querySelectorAll('.swiper-slide')];
  slides.forEach((slide, index) => {
    let videoUrl = '';
    let posterUrl = '';
    const base = slide.querySelector('.video__base[data-video-config]');
    if (base) {
      try {
        const cfg = JSON.parse(base.getAttribute('data-video-config'));
        if (cfg.asset) {
          videoUrl = `${absolutize(cfg.videoServerUrl || '//images.novonordisk.com/is/content').replace(/\/$/, '')}/${cfg.asset}`;
          posterUrl = `${absolutize(cfg.serverUrl || '//images.novonordisk.com/is/image').replace(/\/$/, '')}/${cfg.posterImage || cfg.asset}`;
        }
      } catch (e) {
        // ignore malformed config
      }
    }
    const iframe = slide.querySelector('iframe[src]');
    if (!videoUrl && iframe) videoUrl = iframe.getAttribute('src');
    if (!videoUrl) return;

    const imageCell = [];
    if (posterUrl) {
      const img = document.createElement('img');
      img.src = posterUrl;
      img.alt = '';
      imageCell.push(img);
    }
    const textCell = [];
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = videoUrl;
    // link text = accessible player title
    a.textContent = clean(iframe && iframe.getAttribute('title')) || `Play video ${index + 1}`;
    p.append(a);
    textCell.push(p);
    const badge = slide.querySelector('.ai-badge');
    if (badge && clean(badge.textContent)) {
      const cap = document.createElement('p');
      cap.textContent = clean(badge.textContent);
      textCell.push(cap);
    }
    cells.push([imageCell, textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-video', cells });
  element.replaceWith(block);
}
