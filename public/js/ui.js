// Small UI toolkit: element builder, toasts, dialogs, tables, filter bars, formatting.
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') continue; // set after children (needed for <select>)
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  if (attrs && attrs.value != null) el.value = attrs.value;
  return el;
}

const $ = (sel, root = document) => root.querySelector(sel);

// ---------- formatting ----------
const parseDT = (s) => new Date(String(s).replace(' ', 'T'));
const fmtDT = (s) => (s ? parseDT(s).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const fmtD = (s) => (s ? new Date(String(s).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-CA', { dateStyle: 'medium' }) : '');
const pad2 = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const todayStr = () => toLocalInput(new Date()).slice(0, 10);

const BADGE = {
  good: ['Approved', 'Fulfilled', 'Distributed', 'Normal', 'Completed'],
  warn: ['Pending', 'Delayed', 'High Waste Risk', 'Prepared'],
  bad: ['Rejected', 'Missed', 'Expired', 'Cancelled'],
};
function badge(text) {
  const kind = Object.keys(BADGE).find((k) => BADGE[k].includes(text)) || 'plain';
  return h('span', { class: `badge ${kind}` }, text);
}

// ---------- feedback ----------
function toast(message, type = 'ok') {
  const t = h('div', { class: `toast ${type}`, role: 'status' }, message);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), type === 'error' ? 6000 : 3500);
}
const fail = (e) => toast(e.message || 'Something went wrong.', 'error');

function modal(title, content, { wide = false } = {}) {
  const dlg = h('dialog', { class: `modal${wide ? ' wide' : ''}` },
    h('div', { class: 'modal-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: () => close() }, '×')),
    h('div', { class: 'modal-body' }, content));
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  document.body.append(dlg);
  dlg.showModal();
  return { close, el: dlg };
}

function confirmBox(message, { okText = 'Confirm', extra } = {}) {
  return new Promise((resolve) => {
    const m = modal('Please confirm', h('div', {},
      h('p', {}, message), extra || null,
      h('div', { class: 'actions' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { m.close(); resolve(false); } }, 'Cancel'),
        h('button', { class: 'btn danger', type: 'button', onclick: () => { m.close(); resolve(true); } }, okText))));
  });
}

// ---------- layout pieces ----------
const pageHead = (title, sub, ...actions) =>
  h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, title), sub ? h('p', { class: 'sub' }, sub) : null), h('div', { class: 'head-actions' }, actions));

const empty = (msg) => h('div', { class: 'empty' }, msg);

function field(label, input, hint) {
  return h('label', { class: 'field' }, h('span', { class: 'label' }, label), input, hint ? h('span', { class: 'hint' }, hint) : null);
}
const input = (name, attrs = {}) => h('input', { name, ...attrs });
const select = (name, options, value, attrs = {}) =>
  h('select', { name, value, ...attrs }, options.map((o) => (typeof o === 'object' ? h('option', { value: o.value }, o.label) : h('option', { value: o }, o))));

/** Builds a table from column specs [{label, render(row)}]. */
function table(columns, rows, emptyMsg = 'Nothing to show yet.') {
  if (!rows.length) return empty(emptyMsg);
  return h('div', { class: 'table-wrap' }, h('table', {},
    h('thead', {}, h('tr', {}, columns.map((c) => h('th', {}, c.label)))),
    h('tbody', {}, rows.map((r) => h('tr', {}, columns.map((c) => h('td', { 'data-label': c.label }, c.render(r))))))));
}

/** A row of filter inputs with Search / Clear. spec: [{name,label,type,options}] */
function filterBar(spec, onSearch) {
  const form = h('form', { class: 'filters' });
  spec.forEach((s) => {
    const el = s.options ? select(s.name, [{ value: '', label: 'Any' }, ...s.options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }))], '')
      : input(s.name, { type: s.type || 'text', placeholder: s.placeholder || '', min: s.min });
    form.append(field(s.label, el));
  });
  const values = () => Object.fromEntries(new FormData(form).entries());
  form.append(h('div', { class: 'filter-actions' },
    h('button', { class: 'btn', type: 'submit' }, 'Search'),
    h('button', { class: 'btn ghost', type: 'button', onclick: () => { form.reset(); onSearch(values()); } }, 'Clear')));
  form.addEventListener('submit', (e) => { e.preventDefault(); onSearch(values()); });
  return { el: form, values };
}

/** Rows for entering one or more food items (donations / inventory intake). */
function itemRows(categories) {
  const wrap = h('div', { class: 'item-rows' });
  const minDate = new Date(Date.now() + 864e5);
  const minStr = toLocalInput(minDate).slice(0, 10);
  function addRow() {
    const row = h('div', { class: 'item-row' },
      field('Item', input('ItemName', { required: true, maxlength: 100, placeholder: 'e.g. Canned beans' })),
      field('Category', select('Category', categories.map((c) => c.CategoryName), categories[0] && categories[0].CategoryName)),
      field('Quantity', input('Quantity', { type: 'number', min: 1, step: 1, required: true })),
      field('Unit', input('Unit', { required: true, maxlength: 20, placeholder: 'cans, kg…' })),
      field('Expires on', input('ExpirationDate', { type: 'date', min: minStr, required: true })),
      h('button', { class: 'icon-btn remove', type: 'button', title: 'Remove this item', 'aria-label': 'Remove this item',
        onclick: () => { if (wrap.children.length > 1) row.remove(); } }, '×'));
    wrap.append(row);
  }
  addRow();
  const el = h('div', {}, wrap, h('button', { class: 'btn ghost small', type: 'button', onclick: addRow }, '+ Add another item'));
  const getItems = () => [...wrap.children].map((row) => Object.fromEntries([...row.querySelectorAll('input,select')].map((i) => [i.name, i.value])));
  const reset = () => { wrap.innerHTML = ''; addRow(); };
  return { el, getItems, reset };
}

/** Runs an async action on a button, disabling it while busy. */
async function busy(btn, fn) {
  btn.disabled = true;
  try { return await fn(); } catch (e) { fail(e); } finally { btn.disabled = false; }
}
