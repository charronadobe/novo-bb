import { createTag } from '../../scripts/shared.js';

/*
 * Client-side Waist-to-Height Ratio calculator. Nothing is submitted; all
 * user-facing text comes from the authored key/value rows (see README.md).
 */

const KEY_ALIASES = {
  title: 'title',
  heading: 'title',
  intro: 'intro',
  description: 'intro',
  info: 'info',
  tooltip: 'info',
  infotooltip: 'info',
  unitslabel: 'unitsLabel',
  metric: 'metric',
  metriclabel: 'metric',
  imperial: 'imperial',
  imperiallabel: 'imperial',
  height: 'height',
  heightlabel: 'height',
  waist: 'waist',
  waistlabel: 'waist',
  waistcircumference: 'waist',
  metricunits: 'metricUnits',
  imperialunits: 'imperialUnits',
  button: 'button',
  buttonlabel: 'button',
  result: 'result',
  resultlabel: 'result',
  error: 'error',
  errormessage: 'error',
  fielderror: 'fieldError',
  required: 'fieldError',
  requiredlabel: 'fieldError',
  inputerror: 'fieldError',
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
  const config = { categories: [], introNodes: [], infoNodes: [] };
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
    if (key === 'info') {
      config.info = cellText(cells[1]);
      if (cells[2]) config.infoNodes.push(...cells[2].childNodes);
      return;
    }
    config[key] = cellText(cells[1]);
  });
  config.categories.sort((a, b) => a.max - b.max);
  const split = (v) => String(v || '').split(',').map((s) => s.trim());
  const [cm = '', waistCm = cm] = split(config.metricUnits);
  const [ft = '', inch = '', waistIn = inch] = split(config.imperialUnits);
  config.units = {
    cm, waistCm, ft, in: inch, waistIn,
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
    class: `whtr-calculator-step whtr-calculator-step-${direction}`,
    tabindex: '-1',
    'aria-hidden': 'true',
    'data-step': direction === 'up' ? '1' : '-1',
  });
  return createTag('span', { class: 'whtr-calculator-input' }, [
    input,
    unit ? createTag('span', { class: 'whtr-calculator-unit', 'aria-hidden': 'true' }, unit) : null,
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

function measurementField(id, label, fieldError, metricInputs, imperialInputs) {
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  return createTag('div', { class: 'whtr-calculator-field', role: 'group', 'aria-labelledby': labelId }, [
    createTag('span', { class: 'whtr-calculator-label', id: labelId }, [
      label,
      fieldError ? createTag('span', { class: 'whtr-calculator-field-error', id: errorId, hidden: '' }, fieldError) : null,
    ]),
    createTag('div', { class: 'whtr-calculator-metric' }, metricInputs),
    createTag('div', { class: 'whtr-calculator-imperial', hidden: '' }, imperialInputs),
  ]);
}

/**
 * Waist-to-height ratio in one unit system.
 * @param {'metric'|'imperial'} system
 * @param {{cm?, waistCm?, ft?, in?, waistIn?}} values raw input values
 * @returns {number} ratio, or NaN when inputs are missing/invalid
 */
export function calculateWhtr(system, values) {
  const v = Object.fromEntries(Object.entries(values).map(([k, val]) => [k, parseNumber(val)]));
  let height;
  let waist;
  if (system === 'imperial') {
    height = (v.ft || 0) * 12 + (v.in || 0);
    waist = v.waistIn;
  } else {
    height = v.cm;
    waist = v.waistCm;
  }
  if (!(height > 0) || !(waist > 0)) return NaN;
  return waist / height;
}

function buildTooltip(uid, config) {
  if (!config.info) return null;
  const panelId = `${uid}-info`;
  const toggle = createTag('button', {
    type: 'button',
    class: 'whtr-calculator-info-toggle',
    'aria-expanded': 'false',
    'aria-controls': panelId,
  }, [
    createTag('span', { class: 'whtr-calculator-info-icon', 'aria-hidden': 'true' }),
    createTag('span', {}, config.info),
  ]);
  const panel = createTag('div', { class: 'whtr-calculator-info-panel', id: panelId, hidden: '' }, config.infoNodes);
  const wrapper = createTag('div', { class: 'whtr-calculator-info' }, [toggle, panel]);

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  wrapper.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  wrapper.addEventListener('focusout', (event) => {
    if (!wrapper.contains(event.relatedTarget) && event.relatedTarget) setOpen(false);
  });
  return wrapper;
}

/** @param {Element} block The whtr-calculator block element */
export default function decorate(block) {
  const config = parseConfig(block);
  instanceCount += 1;
  const uid = `whtr-calculator-${instanceCount}`;
  const { units } = config;

  const header = createTag('div', { class: 'whtr-calculator-header' });
  const heading = createTag('div', { class: 'whtr-calculator-heading' });
  const title = config.titleEl || (config.title ? createTag('h2', {}, config.title) : null);
  if (title) {
    title.classList.add('whtr-calculator-title');
    heading.append(title);
  }
  const tooltip = buildTooltip(uid, config);
  if (tooltip) heading.append(tooltip);
  header.append(heading);

  const form = createTag('form', { class: 'whtr-calculator-form', novalidate: '' });

  const unitsFieldset = createTag('fieldset', { class: 'whtr-calculator-units' });
  if (config.unitsLabel) {
    unitsFieldset.append(createTag('legend', { class: 'whtr-calculator-units-legend' }, config.unitsLabel));
  }
  ['metric', 'imperial'].forEach((system, index) => {
    const id = `${uid}-${system}`;
    const radio = createTag('input', {
      type: 'radio', name: `${uid}-system`, id, value: system,
    });
    if (index === 0) radio.checked = true;
    if (index === 1) {
      // visual switch track between the two options; the radios stay the accessible control
      unitsFieldset.append(createTag('span', { class: 'whtr-calculator-switch', 'aria-hidden': 'true' }));
    }
    unitsFieldset.append(createTag('label', { class: 'whtr-calculator-unit-option', for: id }, [
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
    config.fieldError,
    [ref('cm', numberInput(`${uid}-cm`, units.cm, config.height))],
    [
      ref('ft', numberInput(`${uid}-ft`, units.ft, config.height)),
      ref('in', numberInput(`${uid}-in`, units.in, config.height, { max: '11.99' })),
    ],
  );
  const waistField = measurementField(
    `${uid}-waist`,
    config.waist || '',
    config.fieldError,
    [ref('waistCm', numberInput(`${uid}-waist-cm`, units.waistCm, config.waist))],
    [ref('waistIn', numberInput(`${uid}-waist-in`, units.waistIn, config.waist))],
  );

  const fields = createTag('div', { class: 'whtr-calculator-fields' }, [heightField, waistField]);
  const error = createTag('p', { class: 'whtr-calculator-error', role: 'alert', hidden: '' });
  const submit = createTag('button', { type: 'submit', class: 'button whtr-calculator-submit' }, config.button || '');
  const actions = createTag('div', { class: 'whtr-calculator-actions' }, submit);
  const result = createTag('div', { class: 'whtr-calculator-result', 'aria-live': 'polite', hidden: '' });

  form.append(header, fields, error, actions, result);

  const intro = config.introNodes.length
    ? createTag('div', { class: 'whtr-calculator-intro' }, config.introNodes) : null;
  block.replaceChildren(...[intro, form].filter(Boolean));

  const numberFormat = new Intl.NumberFormat(document.documentElement.lang || undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function currentSystem() {
    return unitsFieldset.querySelector('input:checked')?.value || 'metric';
  }

  function setFieldInvalid(field, invalid) {
    const visible = [...field.querySelectorAll('div:not([hidden]) > .whtr-calculator-input input')];
    const fieldErrorEl = field.querySelector('.whtr-calculator-field-error');
    visible.forEach((el) => {
      if (invalid) {
        el.setAttribute('aria-invalid', 'true');
        if (fieldErrorEl) el.setAttribute('aria-describedby', fieldErrorEl.id);
      } else {
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
      }
    });
    if (fieldErrorEl) fieldErrorEl.hidden = !invalid;
  }

  function clearInvalid() {
    form.querySelectorAll('input[aria-invalid]').forEach((el) => {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    });
    form.querySelectorAll('.whtr-calculator-field-error').forEach((el) => { el.hidden = true; });
  }

  function markInvalid() {
    [heightField, waistField].forEach((field) => {
      const visible = [...field.querySelectorAll('div:not([hidden]) > .whtr-calculator-input input')];
      setFieldInvalid(field, !visible.some((el) => parseNumber(el.value) > 0));
    });
  }

  function applySystem() {
    const imperial = currentSystem() === 'imperial';
    form.querySelectorAll('.whtr-calculator-metric').forEach((el) => { el.hidden = imperial; });
    form.querySelectorAll('.whtr-calculator-imperial').forEach((el) => { el.hidden = !imperial; });
    block.dataset.units = imperial ? 'imperial' : 'metric';
    result.hidden = true;
    error.hidden = true;
    clearInvalid();
  }

  unitsFieldset.addEventListener('change', applySystem);

  unitsFieldset.addEventListener('click', (event) => {
    if (!event.target.closest('.whtr-calculator-switch')) return;
    const next = unitsFieldset.querySelector('input:not(:checked)');
    if (!next) return;
    next.checked = true;
    next.focus({ preventScroll: true });
    next.dispatchEvent(new Event('change', { bubbles: true }));
  });

  fields.addEventListener('click', (event) => {
    const button = event.target.closest('.whtr-calculator-step');
    if (!button) return;
    const input = button.closest('.whtr-calculator-input')?.querySelector('input');
    if (input) stepInput(input, Number(button.dataset.step));
  });

  fields.addEventListener('input', (event) => {
    const field = event.target.closest?.('.whtr-calculator-field');
    if (field && parseNumber(event.target.value) > 0) setFieldInvalid(field, false);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearInvalid();
    const values = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value]));
    const ratio = calculateWhtr(currentSystem(), values);

    if (!Number.isFinite(ratio)) {
      result.hidden = true;
      markInvalid();
      error.textContent = config.error || '';
      error.hidden = !config.error;
      return;
    }
    error.hidden = true;

    // pick the category from the displayed (2-decimal) value so label and number agree
    const shown = Math.round(ratio * 100) / 100;
    const category = config.categories.find((c) => shown < c.max) || config.categories.at(-1);
    result.replaceChildren(
      createTag('p', { class: 'whtr-calculator-result-value' }, [
        config.result ? createTag('span', { class: 'whtr-calculator-result-label' }, `${config.result} `) : null,
        createTag('strong', {}, numberFormat.format(ratio)),
      ]),
    );
    if (category) {
      result.append(createTag('p', { class: 'whtr-calculator-result-category' }, createTag('strong', {}, category.label)));
      if (category.description.length) {
        result.append(createTag('div', { class: 'whtr-calculator-result-description' }, category.description.map((n) => n.cloneNode(true))));
      }
      block.dataset.category = String(config.categories.indexOf(category));
    }
    result.hidden = false;
  });

  applySystem();
}
