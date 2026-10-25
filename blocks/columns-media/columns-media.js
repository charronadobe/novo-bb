/**
 * Two-column media + text layout. One row, two cells (image | text, either order).
 * @param {Element} block The columns-media block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  if (!firstRow) return;
  block.classList.add(`columns-media-${firstRow.children.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col, index) => {
      const pic = col.querySelector('picture');
      const isMedia = pic && !col.textContent.trim();
      col.classList.add(isMedia ? 'columns-media-img-col' : 'columns-media-text-col');
      if (isMedia && index === 0) row.classList.add('columns-media-img-first');
    });
  });
}
