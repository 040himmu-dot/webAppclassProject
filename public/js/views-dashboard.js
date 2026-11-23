// Owner: Mahdi - coordinator dashboard (shows the expiry/risk data from Mahima's AnalyzerEngine).
// ---------- Dashboard ----------
function shelfLife(item) {
  // The track covers 0 to 2x the days until expiry. The marker in the middle is the expiry day.
  // If the "stock lasts" bar passes the marker, the item will not be used up before it expires.
  const span = Math.max(item.DUE, 1) * 2;
  const pct = Math.min(item.EFD / span, 1) * 100;
  const over = item.NewStatus === 'Expired' || item.EFD > item.DUE;
  return h('div', { class: 'shelf' },
    h('div', { class: 'track', role: 'img', 'aria-label': `Expires in ${item.DUE} days, stock lasts ${item.EFD} days` },
      h('div', { class: `fill ${item.NewStatus === 'Expired' ? 'gone' : over ? 'over' : ''}`, style: `width:${item.NewStatus === 'Expired' ? 100 : pct}%` }),
      h('div', { class: 'marker', style: 'left:50%' })),
    h('div', { class: 'shelf-text' }, item.DUE <= 0 ? 'Expired' : `Expires in ${item.DUE} d`, ' · ', `stock lasts ${item.EFD} d`));
}

views.dashboard = async (main, user, app) => {
  const [metrics, pending, open] = await Promise.all([
    api.get('/alerts/expiry'), api.get('/users', { role: 'Recipient', status: 'Pending' }), api.get('/pickups', { open: '1' })]);
  const risky = metrics.filter((m) => m.NewStatus !== 'Normal');
  const stat = (n, label, href) => h('a', { class: 'stat', href }, h('strong', {}, n), h('span', {}, label));
  const runBtn = h('button', { class: 'btn', onclick: () => busy(runBtn, async () => {
    const r = await api.post('/alerts/run'); toast(`Analysis finished: ${r.inventory.newlyFlagged} newly flagged item(s).`); app.navigate('dashboard', true);
  }) }, 'Run analysis now');
  main.append(pageHead('Dashboard', 'What needs attention today.', runBtn),
    h('div', { class: 'stats' },
      stat(risky.length, 'items at risk of waste', '#/alerts'),
      stat(pending.length, 'recipients awaiting approval', '#/users'),
      stat(open.length, 'open pickups', '#/pickups')),
    h('h2', { class: 'section' }, 'Shelf-life watch'),
    h('p', { class: 'note' }, 'Each bar shows how long current stock will last at the recent pace. When the bar passes the marker, the item will expire before it is used up.'),
    table([
      { label: 'Item', render: (m) => h('div', {}, h('strong', {}, m.ItemName), h('div', { class: 'muted' }, `${m.Category} · ${m.QuantityOnHand} ${m.Unit}`)) },
      { label: 'Days to expiry vs days stock lasts', render: shelfLife },
      { label: 'Daily pace', render: (m) => `${m.IV} / day` },
      { label: 'Status', render: (m) => badge(m.NewStatus) },
    ], metrics, 'No stocked items to analyze.'));
};

