/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-video.
 * Source: .block--green .splitlayout (global.novocare.com) - three .column items,
 * each holding a Scene7 video (.video__base[data-video-config]).
 * Output: one row per card: [poster image] | [optional text + video link].
 * Video URL: {videoServerUrl}/{asset}  (Dynamic Media /is/content/)
 * Poster:    {serverUrl}/{posterImage} (Dynamic Media /is/image/), kept as plain img.
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

export default function parse(element, { document }) {
  const cells = [];
  const columns = [...element.querySelectorAll(':scope > .columns > .column')];
  const items = columns.length ? columns : [...element.querySelectorAll('.column')];

  items.forEach((col) => {
    const base = col.querySelector('.video__base');
    const config = readConfig(base);

    let videoUrl = '';
    let posterUrl = '';
    if (config && config.asset) {
      const videoServer = absolutize(config.videoServerUrl || '//images.novonordisk.com/is/content');
      const imageServer = absolutize(config.serverUrl || '//images.novonordisk.com/is/image');
      videoUrl = `${videoServer.replace(/\/$/, '')}/${config.asset}`;
      posterUrl = `${imageServer.replace(/\/$/, '')}/${config.posterImage || config.asset}`;
    }

    // Fallback: any element referencing a DM /is/content/ asset
    if (!videoUrl) {
      const ref = col.querySelector('[src*="/is/content/"], [href*="/is/content/"], [data-asset*="/is/content/"]');
      if (ref) videoUrl = absolutize(ref.getAttribute('src') || ref.getAttribute('href') || ref.getAttribute('data-asset'));
    }

    // Poster fallback: rendered s7 poster image if present
    if (!posterUrl) {
      const posterImg = col.querySelector('img[src*="/is/image/"]');
      if (posterImg) posterUrl = absolutize(posterImg.getAttribute('src'));
    }

    if (!videoUrl && !posterUrl) return;

    // Cell 1: poster image
    const imageCell = [];
    if (posterUrl) {
      const img = document.createElement('img');
      img.src = posterUrl;
      img.alt = '';
      imageCell.push(img);
    }

    // Cell 2: optional text + video link
    const textCell = [];
    col.querySelectorAll('.title h1, .title h2, .title h3, .title h4, .text p').forEach((el) => {
      if (el.textContent.trim()) textCell.push(el.cloneNode(true));
    });
    if (videoUrl) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = videoUrl;
      const heading = textCell.find((el) => /^H\d$/.test(el.tagName));
      // link text becomes the play button accessible label; source has no visible title
      a.textContent = heading ? heading.textContent.trim() : `Play video ${cells.length + 1}`;
      p.append(a);
      textCell.push(p);
    }

    cells.push([imageCell, textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-video', cells });
  element.replaceWith(block);
}
