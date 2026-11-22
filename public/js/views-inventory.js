// Owner: Mahima - inventory screen, food categories, alerts / at-risk items.
// ---------- Inventory (Volunteer edits, Coordinator reads) ----------
views.inventory = async (main, user) => {
  const canEdit = user.Role === 'Volunteer';
  const categories = await api.get('/categories');
  const results = h('div');
  const load = async (f = {}) => {
    try {
      const rows = await api.get('/inventory', f);
      results.replaceChildren(table([
        { label: 'Item', render: (r) => r.ItemName },
        { label: 'Category', render: (r) => r.Category },
        { label: 'On hand', render: (r) => `${r.QuantityOnHand} ${r.Unit}` },
        { label: 'Received', render: (r) => r.QuantityReceived },
        { label: 'Expires', render: (r) => `${fmtD(r.ExpirationDate)} (${r.DUE <= 0 ? 'expired' : r.DUE + ' d'})` },
        { label: 'Donor', render: (r) => r.DonorName || '—' },
        { label: 'Status', render: (r) => badge(r.RiskStatus) },
        canEdit ? { label: '', render: (r) => h('div', { class: 'row-actions' },
          h('button', { class: 'btn small ghost', onclick: () => editItem(r) }, 'Edit'),
          h('button', { class: 'btn small danger-ghost', onclick: () => removeItem(r) }, 'Delete')) } : null,
      ].filter(Boolean), rows, 'No inventory matches your search.'));
    } catch (e) { fail(e); }
  };
  const filters = filterBar([
    { name: 'q', label: 'Item name' },
    { name: 'category', label: 'Category', options: categories.map((c) => c.CategoryName) },
    { name: 'status', label: 'Status', options: ['Normal', 'High Waste Risk', 'Expired'] },
    { name: 'expiryFrom', label: 'Expires from', type: 'date' },
    { name: 'expiryTo', label: 'Expires to', type: 'date' },
    { name: 'minQty', label: 'Min quantity', type: 'number', min: 0 },
    { name: 'maxQty', label: 'Max quantity', type: 'number', min: 0 },
  ], load);

  function addIntake() {
    const rows = itemRows(categories);
    const donor = h('select', { name: 'DonorID' }, h('option', { value: '' }, 'Anonymous / walk-in'));
    api.get('/donors').then((ds) => ds.forEach((d) => donor.append(h('option', { value: d.UserID }, d.Name)))).catch(fail);
    const form = h('form', {}, field('Donor (optional)', donor), rows.el,
      h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'submit' }, 'Add to inventory')));
    const m = modal('Record donation intake', form, { wide: true });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      busy(form.querySelector('button[type=submit]'), async () => {
        const res = await api.post('/inventory', { DonorID: donor.value || null, items: rows.getItems() });
        toast(res.message); m.close(); load(filters.values());
      });
    });
  }
  function editItem(r) {
    const form = h('form', { class: 'form-grid' },
      field('Item name', input('ItemName', { value: r.ItemName, required: true })),
      field('Category', select('Category', categories.map((c) => c.CategoryName), r.Category)),
      field('Unit', input('Unit', { value: r.Unit, required: true })),
      field('Quantity on hand', input('QuantityOnHand', { type: 'number', min: 0, value: r.QuantityOnHand, required: true })),
      field('Quantity received', input('QuantityReceived', { type: 'number', min: 1, value: r.QuantityReceived, required: true })),
      field('Expiration date', input('ExpirationDate', { type: 'date', value: r.ExpirationDate, required: true })),
      h('div', { class: 'form-actions' }, h('button', { class: 'btn', type: 'submit' }, 'Save changes')));
    const m = modal(`Edit ${r.ItemName}`, form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      busy(form.querySelector('button[type=submit]'), async () => {
        const res = await api.put('/inventory/' + r.ItemID, Object.fromEntries(new FormData(form).entries()));
        toast(res.message); m.close(); load(filters.values());
      });
    });
  }
  async function removeItem(r) {
    const waste = h('input', { type: 'checkbox' });
    const extra = r.QuantityOnHand > 0 ? h('label', { class: 'check' }, waste, ` Record the remaining ${r.QuantityOnHand} ${r.Unit} as wasted`) : null;
    if (!(await confirmBox(`Remove "${r.ItemName}" from active inventory? It stays in the archive for reporting.`, { okText: 'Delete item', extra }))) return;
    try { toast((await api.del('/inventory/' + r.ItemID, { recordWaste: waste.checked })).message); load(filters.values()); } catch (e) { fail(e); }
  }

  main.append(pageHead('Inventory', canEdit ? 'Record donations as they arrive and keep stock accurate.' : 'Read-only view of everything on the shelves.',
    canEdit ? h('button', { class: 'btn', onclick: addIntake }, 'Record intake') : null), filters.el, results);
  load();
};

// ---------- Categories ----------
views.categories = async (main) => {
  const results = h('div');
  const load = async () => {
    try {
      results.replaceChildren(table([
        { label: 'Category', render: (c) => c.CategoryName },
        { label: '', render: (c) => h('div', { class: 'row-actions' },
          h('button', { class: 'btn small ghost', onclick: () => rename(c) }, 'Rename'),
          h('button', { class: 'btn small danger-ghost', onclick: () => remove(c) }, 'Delete')) },
      ], await api.get('/categories'), 'No categories yet.'));
    } catch (e) { fail(e); }
  };
  function rename(c) {
    const form = h('form', {}, field('Category name', input('CategoryName', { value: c.CategoryName, required: true, maxlength: 60 })),
      h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'submit' }, 'Save')));
    const m = modal('Rename category', form);
    form.addEventListener('submit', (e) => { e.preventDefault(); busy(form.querySelector('button'), async () => { await api.put('/categories/' + c.CategoryID, { CategoryName: form.CategoryName.value }); toast('Category renamed.'); m.close(); load(); }); });
  }
  async function remove(c) {
    if (await confirmBox(`Delete the category "${c.CategoryName}"?`, { okText: 'Delete' })) api.del('/categories/' + c.CategoryID).then((r) => { toast(r.message); load(); }).catch(fail);
  }
  const form = h('form', { class: 'card inline-form' }, field('New category', input('CategoryName', { required: true, maxlength: 60, placeholder: 'e.g. Snacks' })), h('button', { class: 'btn', type: 'submit' }, 'Add category'));
  form.addEventListener('submit', (e) => { e.preventDefault(); busy(form.querySelector('button'), async () => { await api.post('/categories', { CategoryName: form.CategoryName.value }); toast('Category added.'); form.reset(); load(); }); });
  main.append(pageHead('Food categories', 'Categories group inventory and drive the reports.'), form, results);
  load();
};

// ---------- Alert log ----------
views.alerts = async (main) => {
  const [rows, metrics] = await Promise.all([api.get('/alerts/log'), api.get('/alerts/expiry')]);
  const risky = metrics.filter((m) => m.NewStatus !== 'Normal');
  main.append(pageHead('Alerts', 'Items at risk and every alert email the system has sent.'),
    h('h2', { class: 'section' }, 'Items needing priority distribution'),
    table([
      { label: 'Item', render: (m) => m.ItemName }, { label: 'Category', render: (m) => m.Category },
      { label: 'On hand', render: (m) => `${m.QuantityOnHand} ${m.Unit}` }, { label: 'Expires', render: (m) => fmtD(m.ExpirationDate) },
      { label: 'Status', render: (m) => badge(m.NewStatus) },
    ], risky, 'Nothing is at risk right now.'),
    h('h2', { class: 'section' }, 'Alert log'),
    table([
      { label: 'Sent', render: (a) => fmtDT(a.SentDateTime) }, { label: 'Type', render: (a) => badge(a.AlertType) },
      { label: 'To', render: (a) => `${a.SentTo} (${a.SentToRole})` }, { label: 'About', render: (a) => a.Message },
      { label: 'Delivery', render: (a) => a.Delivery },
    ], rows, 'No alerts have been sent yet.'));
};
