/**
 * Borderless label | value table with no header row.
 * Each authored row becomes a table row; each cell becomes a table cell.
 * A filled first-column cell is a row header (th scope="row") and spans the
 * empty first-column cells that follow it, so the label reads with every value.
 * @param {Element} block The table-borderless block element
 */
export default function decorate(block) {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.append(tbody);

  let labelCell = null;

  [...block.children].forEach((child) => {
    const row = document.createElement('tr');
    const cols = [...child.children];

    cols.forEach((col, colIndex) => {
      const isEmpty = !col.textContent.trim() && !col.querySelector('img, picture');

      if (colIndex === 0 && cols.length > 1) {
        if (isEmpty && labelCell) {
          labelCell.rowSpan += 1;
          return;
        }
        if (!isEmpty) {
          const th = document.createElement('th');
          th.scope = 'row';
          th.innerHTML = col.innerHTML;
          row.append(th);
          labelCell = th;
          return;
        }
      }

      const td = document.createElement('td');
      const align = col.getAttribute('data-align');
      const valign = col.getAttribute('data-valign');
      if (align) td.style.textAlign = align;
      if (valign) td.style.verticalAlign = valign;
      td.innerHTML = col.innerHTML;
      row.append(td);
    });

    tbody.append(row);
  });

  block.replaceChildren(table);
}
