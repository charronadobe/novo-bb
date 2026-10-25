/**
 * Hero with a full-bleed background photo and overlaid text.
 * Authored rows: [background image] then [heading, subheading, CTA].
 * A single row holding both the picture and the text is also accepted.
 * @param {Element} block The hero-photo-bg block element
 */
export default function decorate(block) {
  const picture = block.querySelector('picture');
  const rows = [...block.children];

  const media = document.createElement('div');
  media.className = 'hero-photo-bg-media';
  const content = document.createElement('div');
  content.className = 'hero-photo-bg-content';

  if (picture) {
    const img = picture.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
      if (!img.hasAttribute('alt')) img.alt = '';
    }
    const pictureParent = picture.parentElement;
    media.append(picture);
    // drop the now-empty paragraph that wrapped the picture
    if (pictureParent && pictureParent !== block
      && pictureParent.tagName === 'P' && !pictureParent.textContent.trim()) {
      pictureParent.remove();
    }
  } else {
    block.classList.add('no-image');
  }

  rows.forEach((row) => {
    [...row.children].forEach((cell) => {
      if (cell.textContent.trim() || cell.querySelector('a, h1, h2, h3, h4, h5, h6')) {
        content.append(...cell.childNodes);
      }
    });
  });

  const inner = document.createElement('div');
  inner.className = 'hero-photo-bg-inner';
  inner.append(...content.childNodes);
  content.append(inner);

  block.replaceChildren(...(picture ? [media, content] : [content]));
}
