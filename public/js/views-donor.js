// Donor: make a donation, search own donation history.
views.donate = async (main) => {
  const categories = await api.get('/categories');
  const rows = itemRows(categories);
  const form = h('form', { class: 'card' }, rows.el,
    h('div', { class: 'form-actions' }, h('button', { class: 'btn', type: 'submit' }, 'Submit donation')));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(form.querySelector('button[type=submit]'), async () => {
      toast((await api.post('/donations', { items: rows.getItems() })).message);
      rows.reset();
    });
  });
  main.append(pageHead('Donate food', 'List what you are dropping off. Only unexpired items can be accepted.'), form);
};

views.donations = async (main) => {
  const categories = await api.get('/categories');
  const results = h('div');
  const load = async (f = {}) => {
    try {
      results.replaceChildren(table([
        { label: 'Donated on', render: (r) => fmtD(r.DonationDate) },
        { label: 'Item', render: (r) => r.ItemName },
        { label: 'Category', render: (r) => r.Category },
        { label: 'Quantity', render: (r) => `${r.QuantityReceived} ${r.Unit}` },
        { label: 'Best before', render: (r) => fmtD(r.ExpirationDate) },
      ], await api.get('/donations', f), 'No donations found. Try a different date range or category.'));
    } catch (e) { fail(e); }
  };
  const filters = filterBar([
    { name: 'from', label: 'From date', type: 'date' },
    { name: 'to', label: 'To date', type: 'date' },
    { name: 'category', label: 'Category', options: categories.map((c) => c.CategoryName) },
  ], load);
  main.append(pageHead('My donations', 'Everything you have given, newest first.'), filters.el, results);
  load();
};
