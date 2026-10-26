/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-video.
 * Sources (global.novocare.com):
 * - .splitlayout whose columns hold a Scene7 video (.video__base[data-video-config])
 *   Video URL: {videoServerUrl}/{asset} (Dynamic Media /is/content/),
 *   poster: {serverUrl}/{posterImage} (Dynamic Media /is/image/), kept as plain img.
 * - .splitlayout whose columns hold a player iframe (.richmedia iframe or .mediatext iframe,
 *   nn-product.videomarketingplatform.co) - no poster, the block renders the player directly.
 * - .cmp-card holding a row of iframe videos ("Conversation Highlights"): its heading and
 *   button are kept as default content around the block.
 * Output: one row per card: [poster image or empty] | [video link, heading, quote, CTA link].
 * Portrait (9:16) players add the "portrait" variant.
 */
function absolutize(url) {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function readConfig(base) {
  if (!base) return null;
  const raw = base.getAttribute('data-video-config');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function isPortrait(iframe) {
  const box = iframe && iframe.parentElement;
  const style = (box && box.getAttribute('style')) || '';
  const m = style.match(/padding-bottom:\s*([\d.]+)%/);
  return m ? Number(m[1]) > 100 : false;
}

function linkPara(document, href, text) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  p.append(a);
  return p;
}

export default function parse(element, { document }) {
  const cells = [];
  let portrait = false;
  const isCard = element.classList.contains('cmp-card');

  let items = [...element.querySelectorAll(':scope > .columns > .column')];
  if (!items.length) items = [...element.querySelectorAll('.column')];
  if (!items.length) {
    // cmp-card / plain container: one item per video player
    items = [...element.querySelectorAll('.richmedia, .video')].filter((el) => el.querySelector('iframe, .video__base'));
  }

  items.forEach((col, index) => {
    const base = col.querySelector('.video__base');
    const config = readConfig(base);
    const iframe = col.querySelector('iframe[src]');

    let videoUrl = '';
    let posterUrl = '';
    if (config && config.asset) {
      const videoServer = absolutize(config.videoServerUrl || '//images.novonordisk.com/is/content');
      const imageServer = absolutize(config.serverUrl || '//images.novonordisk.com/is/image');
      videoUrl = `${videoServer.replace(/\/$/, '')}/${config.asset}`;
      posterUrl = `${imageServer.replace(/\/$/, '')}/${config.posterImage || config.asset}`;
    } else if (iframe) {
      videoUrl = iframe.getAttribute('src');
      if (isPortrait(iframe)) portrait = true;
    }

    // Fallback: any element referencing a DM /is/content/ asset
    if (!videoUrl) {
      const ref = col.querySelector('[src*="/is/content/"], [href*="/is/content/"], [data-asset*="/is/content/"]');
      if (ref) videoUrl = absolutize(ref.getAttribute('src') || ref.getAttribute('href') || ref.getAttribute('data-asset'));
    }
    if (!posterUrl && !iframe) {
      const posterImg = col.querySelector('img[src*="/is/image/"]');
      if (posterImg) posterUrl = absolutize(posterImg.getAttribute('src'));
    }
    if (!videoUrl && !posterUrl) return;

    // Text: in a column the text is inside it; for card items it follows the player
    const textScope = items.length && col.classList.contains('column') ? col : null;
    const textEls = [];
    if (textScope) {
      textScope.querySelectorAll('.title h1, .title h2, .title h3, .title h4, .text p').forEach((el) => textEls.push(el));
    } else {
      let sib = col.nextElementSibling;
      while (sib && !sib.querySelector('iframe, .video__base') && !sib.matches('.richmedia, .video, .ctabutton')) {
        sib.querySelectorAll('h1, h2, h3, h4, p').forEach((el) => textEls.push(el));
        if (sib.matches('h1, h2, h3, h4, p')) textEls.push(sib);
        sib = sib.nextElementSibling;
      }
    }

    // Cell 1: poster image
    const imageCell = [];
    if (posterUrl) {
      const img = document.createElement('img');
      img.src = posterUrl;
      img.alt = '';
      imageCell.push(img);
    }

    // Cell 2: video link, heading, quote, CTA
    const textCell = [];
    let headingText = '';
    textEls.forEach((el) => {
      const text = clean(el.textContent);
      if (!text) return;
      if (/^H\d$/.test(el.tagName)) {
        const h3 = document.createElement('h3');
        h3.textContent = text;
        if (!headingText) headingText = text;
        textCell.push(h3);
      } else {
        const p = el.cloneNode(true);
        p.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
        textCell.push(p);
      }
    });
    if (videoUrl) {
      // link text becomes the player / play button accessible label
      const firstText = textCell.find((el) => el.tagName === 'P');
      const label = headingText || (firstText ? clean(firstText.textContent) : '') || `Play video ${index + 1}`;
      textCell.unshift(linkPara(document, videoUrl, label));
    }
    const cta = textScope && textScope.querySelector('.ctabutton a[href]');
    if (cta) textCell.push(linkPara(document, cta.getAttribute('href'), clean(cta.textContent)));

    cells.push([imageCell, textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, {
    name: portrait ? 'cards-video (portrait)' : 'cards-video',
    cells,
  });

  if (isCard) {
    // keep the card heading and its button as default content
    const out = [];
    // the card's own heading, not a heading inside one of the video columns
    const heading = [...element.querySelectorAll('.title h1, .title h2, .title h3')].find((h) => !h.closest('.column'));
    if (heading && clean(heading.textContent)) {
      const h2 = document.createElement('h2');
      h2.textContent = clean(heading.textContent);
      out.push(h2);
    }
    out.push(block);
    const buttons = [...element.querySelectorAll('.ctabutton a[href]')].filter((a) => !a.closest('.column'));
    buttons.forEach((a) => out.push(linkPara(document, a.getAttribute('href'), clean(a.textContent))));
    element.replaceWith(...out);
    return;
  }
  element.replaceWith(block);
}
