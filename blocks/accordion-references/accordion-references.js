/**
 * Collapsible references. Each row: [title] | [content, e.g. ordered list of citations].
 * Rendered as native <details>/<summary> for built-in keyboard and screen-reader support.
 * Add the "open" option to start expanded.
 * @param {Element} block The accordion-references block element
 */
export default function decorate(block) {
  const startOpen = block.classList.contains('open');
  const items = [...block.children].map((row) => {
    const [titleCell, bodyCell] = row.children;
    const details = document.createElement('details');
    details.className = 'accordion-references-item';
    if (startOpen) details.open = true;

    const summary = document.createElement('summary');
    summary.className = 'accordion-references-title';
    summary.append(...(titleCell ? titleCell.childNodes : []));

    const body = document.createElement('div');
    body.className = 'accordion-references-body';
    if (bodyCell) body.append(...bodyCell.childNodes);

    details.append(summary, body);
    return details;
  });
  block.replaceChildren(...items);
}
