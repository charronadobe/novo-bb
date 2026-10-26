/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-media.
 * Sources (global.novocare.com):
 * - .mediatext (--left / --right / block--lightgrey): figure.media (image or player iframe)
 *   beside section.quote-area (heading, text, CTA).
 * - .testimonial: quote text and CTA beside an image (image on the right).
 * Output: one row, two cells in desktop order: [media] | [heading, paragraph(s), CTA link].
 * The media cell holds an image or a link to the video player.
 * Variants: light-green / grey from the surrounding background, stacked for media-above-text
 * cards (media ratio 16:9 with a short centred quote).
 */
function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const isTestimonial = element.classList.contains('testimonial');
  const mediaCell = [];
  const iframe = element.querySelector('figure.media iframe[src], .media iframe[src]');
  const img = element.querySelector('figure.media img, .testimonial__image img, .cmp-image img, img');
  if (iframe) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = iframe.getAttribute('src');
    a.textContent = iframe.getAttribute('src');
    p.append(a);
    mediaCell.push(p);
  } else if (img) {
    const image = document.createElement('img');
    image.src = img.getAttribute('src') || img.getAttribute('data-src');
    image.alt = img.getAttribute('alt') || '';
    mediaCell.push(image);
  }

  const textCell = [];
  const area = element.querySelector('.quote-area, .testimonial__texts') || element;
  const heading = area.querySelector('.title h1, .title h2, .title h3, .title h4');
  if (heading && clean(heading.textContent)) {
    const h2 = document.createElement('h2');
    h2.textContent = clean(heading.textContent);
    textCell.push(h2);
  }
  area.querySelectorAll('.text p').forEach((p) => {
    if (!clean(p.textContent)) return;
    const copy = p.cloneNode(true);
    // testimonial quote is a bold paragraph acting as the heading
    if (isTestimonial && !textCell.length && copy.querySelector('b, strong') && clean(copy.textContent) === clean(copy.querySelector('b, strong').textContent)) {
      const h2 = document.createElement('h2');
      h2.textContent = clean(copy.textContent);
      textCell.push(h2);
      return;
    }
    textCell.push(copy);
  });
  // Testimonial body copy sits in plain divs/paragraphs outside .text
  if (isTestimonial) {
    area.querySelectorAll('.testimonial__description p, .testimonial__name p').forEach((p) => {
      if (clean(p.textContent) && !p.closest('.text')) textCell.push(p.cloneNode(true));
    });
  }
  area.querySelectorAll('.ctabutton a[href]').forEach((cta) => {
    const text = clean(cta.textContent);
    if (!text) return;
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = cta.getAttribute('href');
    a.textContent = text;
    p.append(a);
    textCell.push(p);
  });

  // desktop order: media on the right for --right and testimonials
  const mediaRight = element.classList.contains('mediatext--right') || isTestimonial;
  const cells = [mediaRight ? [textCell, mediaCell] : [mediaCell, textCell]];

  const options = [];
  const bgEl = element.closest('.bg--green, .block--green');
  if (element.classList.contains('block--lightgrey') || isTestimonial) options.push('grey');
  else if (bgEl && !bgEl.matches('section')) options.push('light-green');
  if (element.classList.contains('mediatext--ratio-16-9') || (!element.classList.contains('mediatext--left') && !mediaRight && !isTestimonial)) {
    options.push('stacked');
  }

  const name = options.length ? `columns-media (${options.join(', ')})` : 'columns-media';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
