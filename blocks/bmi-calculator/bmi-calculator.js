import { createTag } from '../../scripts/shared.js';

/*
 * Client-side BMI calculator. Nothing is submitted; all user-facing text
 * comes from the authored key/value rows (see README.md).
 */

const KEY_ALIASES = {
  title: 'title',
  heading: 'title',
  intro: 'intro',
  description: 'intro',
  unitslabel: 'unitsLabel',
  metric: 'metric',
  metriclabel: 'metric',
  imperial: 'imperial',
  imperiallabel: 'imperial',
  height: 'height',
  heightlabel: 'height',
  weight: 'weight',
  weightlabel: 'weight',
  metricunits: 'metricUnits',
  imperialunits: 'imperialUnits',
  button: 'button',
  buttonlabel: 'button',
  result: 'result',
  resultlabel: 'result',
  error: 'error',
  errormessage: 'error',
  category: 'category',
};

let instanceCount = 0;

function toKey(text) {
  return KEY_ALIASES[String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '')];
}

function cellText(cell) {
  return (cell?.textContent || '').trim();
}

function parseNumber(value) {
  const n = parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function parseConfig(block) {
  const config = { categories: [], introNodes: [] };
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const key = toKey(cellText(cells[0]));

    if (!key && heading && !config.titleEl) {
      config.titleEl = heading;
      return;
    }
    if (!key) {
      if (cells.length === 1 && cellText(cells[0])) config.introNodes.push(...cells[0].children);
      return;
    }
    if (key === 'category') {
      const label = cellText(cells[1]);
      if (!label) return;
      const max = parseNumber(cellText(cells[2]));
      config.categories.push({
        label,
        max: Number.isFinite(max) ? max : Infinity,
        description: cells[3] ? [...cells[3].childNodes] : [],
      });
      return;
    }
    if (key === 'title') {
      config.titleEl = cells[1]?.querySelector('h1, h2, h3, h4, h5, h6');
      config.title = cellText(cells[1]);
      return;
    }
    if (key === 'intro') {
      if (cells[1]) config.introNodes.push(...cells[1].childNodes);
      return;
    }
    config[key] = cellText(cells[1]);
  });
  config.categories.sort((a, b) => a.max - b.max);
  const split = (v) => String(v || '').split(',').map((s) => s.trim());
  const [cm = '', kg = ''] = split(config.metricUnits);
  const [ft = '', inch = '', st = '', lb = ''] = split(config.imperialUnits);
  config.units = {
    cm, kg, ft, in: inch, st, lb,
  };
  return config;
}

function numberInput(id, unit, ariaLabel, attrs = {}) {
  const input = createTag('input', {
    id,
    type: 'number',
    inputmode: 'decimal',
    min: '0',
    step: 'any',
    'aria-label': [ariaLabel, unit].filter(Boolean).join(' '),
    ...attrs,
  });
  // Mouse-only step arrows; keyboard users step with the native arrow keys.
  const stepButton = (direction) => createTag('button', {
    type: 'button',
    class: `bmi-calculator-step bmi-calculator-step-${direction}`,
    tabindex: '-1',
    'aria-hidden': 'true',
    'data-step': direction === 'up' ? '1' : '-1',
  });
  return createTag('span', { class: 'bmi-calculator-input' }, [
    input,
    unit ? createTag('span', { class: 'bmi-calculator-unit', 'aria-hidden': 'true' }, unit) : null,
    stepButton('up'),
    stepButton('down'),
  ]);
}

function stepInput(input, delta) {
  const current = parseNumber(input.value);
  let next = (Number.isFinite(current) ? current : 0) + delta;
  const min = parseNumber(input.min);
  const max = parseNumber(input.max);
  if (Number.isFinite(min)) next = Math.max(min, next);
  if (Number.isFinite(max)) next = Math.min(max, next);
  input.value = String(Math.round(next * 100) / 100);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function measurementField(id, label, metricInputs, imperialInputs) {
  const labelId = `${id}-label`;
  return createTag('div', { class: 'bmi-calculator-field', role: 'group', 'aria-labelledby': labelId }, [
    createTag('span', { class: 'bmi-calculator-label', id: labelId }, label),
    createTag('div', { class: 'bmi-calculator-metric' }, metricInputs),
    createTag('div', { class: 'bmi-calculator-imperial', hidden: '' }, imperialInputs),
  ]);
}

export function calculateBmi(system, values) {
  const v = Object.fromEntries(Object.entries(values).map(([k, val]) => [k, parseNumber(val)]));
  if (system === 'imperial') {
    const inches = (v.ft || 0) * 12 + (v.in || 0);
    const pounds = (v.st || 0) * 14 + (v.lb || 0);
    if (inches <= 0 || pounds <= 0) return NaN;
    return (703 * pounds) / (inches * inches);
  }
  if (!(v.cm > 0) || !(v.kg > 0)) return NaN;
  const metres = v.cm / 100;
  return v.kg / (metres * metres);
}

/** @param {Element} block The bmi-calculator block element */
export default function decorate(block) {
  const config = parseConfig(block);
  instanceCount += 1;
  const uid = `bmi-calculator-${instanceCount}`;
  const { units } = config;

  const header = createTag('div', { class: 'bmi-calculator-header' });
  const title = config.titleEl || (config.title ? createTag('h2', {}, config.title) : null);
  if (title) {
    title.classList.add('bmi-calculator-title');
    header.append(title);
  }

  const form = createTag('form', { class: 'bmi-calculator-form', novalidate: '' });

  const unitsFieldset = createTag('fieldset', { class: 'bmi-calculator-units' });
  if (config.unitsLabel) {
    unitsFieldset.append(createTag('legend', { class: 'bmi-calculator-units-legend' }, config.unitsLabel));
  }
  ['metric', 'imperial'].forEach((system, index) => {
    const id = `${uid}-${system}`;
    const radio = createTag('input', {
      type: 'radio', name: `${uid}-system`, id, value: system,
    });
    if (index === 0) radio.checked = true;
    if (index === 1) {
      // visual switch track between the two options; the radios stay the accessible control
      unitsFieldset.append(createTag('span', { class: 'bmi-calculator-switch', 'aria-hidden': 'true' }));
    }
    unitsFieldset.append(createTag('label', { class: 'bmi-calculator-unit-option', for: id }, [
      radio,
      createTag('span', {}, config[system] || ''),
    ]));
  });
  header.append(unitsFieldset);

  const inputs = {};
  const ref = (name, wrapper) => {
    inputs[name] = wrapper.querySelector('input');
    return wrapper;
  };
  const heightField = measurementField(
    `${uid}-height`,
    config.height || '',
    [ref('cm', numberInput(`${uid}-cm`, units.cm, config.height))],
    [
      ref('ft', numberInput(`${uid}-ft`, units.ft, config.height)),
      ref('in', numberInput(`${uid}-in`, units.in, config.height, { max: '11.99' })),
    ],
  );
  const weightField = measurementField(
    `${uid}-weight`,
    config.weight || '',
    [ref('kg', numberInput(`${uid}-kg`, units.kg, config.weight))],
    [
      ref('st', numberInput(`${uid}-st`, units.st, config.weight)),
      ref('lb', numberInput(`${uid}-lb`, units.lb, config.weight, { max: '13.99' })),
    ],
  );

  const fields = createTag('div', { class: 'bmi-calculator-fields' }, [heightField, weightField]);
  const error = createTag('p', { class: 'bmi-calculator-error', role: 'alert', hidden: '' });
  const submit = createTag('button', { type: 'submit', class: 'button bmi-calculator-submit' }, config.button || '');
  const actions = createTag('div', { class: 'bmi-calculator-actions' }, submit);
  const result = createTag('div', { class: 'bmi-calculator-result', 'aria-live': 'polite', hidden: '' });

  form.append(header, fields, error, actions, result);

  const intro = config.introNodes.length
    ? createTag('div', { class: 'bmi-calculator-intro' }, config.introNodes) : null;
  block.replaceChildren(...[intro, form].filter(Boolean));

  const numberFormat = new Intl.NumberFormat(document.documentElement.lang || undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  function currentSystem() {
    return unitsFieldset.querySelector('input:checked')?.value || 'metric';
  }

  function clearInvalid() {
    form.querySelectorAll('input[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  }

  function markInvalid() {
    [heightField, weightField].forEach((field) => {
      const visible = [...field.querySelectorAll('div:not([hidden]) > .bmi-calculator-input input')];
      if (!visible.some((el) => parseNumber(el.value) > 0)) {
        visible.forEach((el) => el.setAttribute('aria-invalid', 'true'));
      }
    });
  }

  function applySystem() {
    const imperial = currentSystem() === 'imperial';
    form.querySelectorAll('.bmi-calculator-metric').forEach((el) => { el.hidden = imperial; });
    form.querySelectorAll('.bmi-calculator-imperial').forEach((el) => { el.hidden = !imperial; });
    block.dataset.units = imperial ? 'imperial' : 'metric';
    result.hidden = true;
    error.hidden = true;
    clearInvalid();
  }

  unitsFieldset.addEventListener('change', applySystem);

  unitsFieldset.addEventListener('click', (event) => {
    if (!event.target.closest('.bmi-calculator-switch')) return;
    const next = unitsFieldset.querySelector('input:not(:checked)');
    if (!next) return;
    next.checked = true;
    next.focus({ preventScroll: true });
    next.dispatchEvent(new Event('change', { bubbles: true }));
  });

  fields.addEventListener('click', (event) => {
    const button = event.target.closest('.bmi-calculator-step');
    if (!button) return;
    const input = button.closest('.bmi-calculator-input')?.querySelector('input');
    if (input) stepInput(input, Number(button.dataset.step));
  });

  fields.addEventListener('input', (event) => {
    event.target.removeAttribute?.('aria-invalid');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearInvalid();
    const values = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value]));
    const bmi = calculateBmi(currentSystem(), values);

    if (!Number.isFinite(bmi)) {
      result.hidden = true;
      markInvalid();
      error.textContent = config.error || '';
      error.hidden = !config.error;
      return;
    }
    error.hidden = true;

    const category = config.categories.find((c) => bmi < c.max) || config.categories.at(-1);
    result.replaceChildren(
      createTag('p', { class: 'bmi-calculator-result-value' }, [
        config.result ? createTag('span', { class: 'bmi-calculator-result-label' }, `${config.result} `) : null,
        createTag('strong', {}, numberFormat.format(bmi)),
      ]),
    );
    if (category) {
      result.append(createTag('p', { class: 'bmi-calculator-result-category' }, createTag('strong', {}, category.label)));
      if (category.description.length) {
        result.append(createTag('div', { class: 'bmi-calculator-result-description' }, category.description.map((n) => n.cloneNode(true))));
      }
      block.dataset.category = String(config.categories.indexOf(category));
    }
    result.hidden = false;
  });

  applySystem();
}
