// Owner: Manjot - monthly / annual reports.
// ---------- Reports ----------
views.reports = async (main) => {
  const now = new Date();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => ({ value: i + 1, label: m }));
  const type = select('type', [{ value: 'donation', label: 'Donation & distribution summary' }, { value: 'waste', label: 'Inventory waste summary' }]);
  const period = select('period', [{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Annual' }]);
  const month = select('month', months, now.getMonth() + 1);
  const year = input('year', { type: 'number', min: 2000, max: 2100, value: now.getFullYear() });
  const monthField = field('Month', month);
  period.addEventListener('change', () => { monthField.hidden = period.value === 'year'; });
  const out = h('div', { class: 'report-out' });
  const form = h('form', { class: 'card filters' }, field('Report', type), field('Period', period), monthField, field('Year', year),
    h('div', { class: 'filter-actions' }, h('button', { class: 'btn', type: 'submit' }, 'Generate')));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(form.querySelector('button'), async () => {
      const r = await api.get('/reports', { type: type.value, period: period.value, year: year.value, month: month.value });
      out.replaceChildren(h('div', { class: 'report-head' }, h('h2', {}, r.type === 'donation' ? 'Donation & distribution summary' : 'Inventory waste summary'), h('span', { class: 'muted' }, r.period),
        h('button', { class: 'btn small ghost no-print', onclick: () => window.print() }, 'Print')),
        r.type === 'donation' ? h('div', {},
          h('div', { class: 'stats' }, h('div', { class: 'stat' }, h('strong', {}, r.hampersDistributed), h('span', {}, 'hampers distributed'))),
          h('h3', {}, 'Donations received by category'),
          table([{ label: 'Category', render: (x) => x.Category }, { label: 'Total received', render: (x) => `${x.Total} ${x.Unit}` }], r.donations, 'No donations in this period.'),
          h('h3', {}, 'Missed and delayed pickups by recipient'),
          table([{ label: 'Recipient', render: (x) => x.RecipientName }, { label: 'Missed', render: (x) => x.MissedCount }, { label: 'Delayed', render: (x) => x.DelayedCount }], r.attendance, 'No missed or delayed pickups in this period.'))
        : h('div', {}, h('h3', {}, 'Expired or wasted items by category'),
          table([{ label: 'Category', render: (x) => x.Category }, { label: 'Total wasted', render: (x) => `${x.Total} ${x.Unit}` }], r.waste, 'No waste recorded in this period.')));
    });
  });
  main.append(pageHead('Reports', 'Choose a month or a whole year.'), form, out);
};

