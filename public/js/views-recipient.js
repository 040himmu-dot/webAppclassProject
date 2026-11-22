// Recipient: request a hamper + schedule pickup, search own distribution history.
views.hamper = async (main, user) => {
  const me = (await api.get('/auth/me')).user;
  const list = h('div');
  const loadList = async () => {
    try {
      list.replaceChildren(table([
        { label: 'Hamper', render: (r) => '#' + r.HamperID },
        { label: 'Pickup time', render: (r) => fmtDT(r.ScheduledDateTime) },
        { label: 'Pickup status', render: (r) => badge(r.PickupStatus) },
        { label: 'Hamper status', render: (r) => badge(r.Status) },
        { label: 'Contents', render: (r) => r.items.length ? r.items.map((i) => `${i.QuantityGiven} ${i.Unit} ${i.ItemName}`).join(', ') : 'Not prepared yet' },
      ], await api.get('/hampers/mine'), 'You have not requested a hamper yet.'));
    } catch (e) { fail(e); }
  };

  let top;
  if (me.ApprovalStatus === 'Approved') {
    const when = input('ScheduledDateTime', { type: 'datetime-local', required: true, min: toLocalInput(new Date()) });
    top = h('form', { class: 'card inline-form' }, field('Choose a pickup date and time', when), h('button', { class: 'btn', type: 'submit' }, 'Request hamper'));
    top.addEventListener('submit', (e) => {
      e.preventDefault();
      busy(top.querySelector('button'), async () => { toast((await api.post('/hampers', { ScheduledDateTime: when.value })).message); top.reset(); loadList(); });
    });
  } else {
    top = h('div', { class: `banner ${me.ApprovalStatus === 'Rejected' ? 'bad' : 'warn'}` },
      me.ApprovalStatus === 'Rejected'
        ? 'Your registration was not approved, so hampers cannot be requested. Please contact the food bank.'
        : 'Your registration is waiting for approval by a Coordinator. You can request a hamper as soon as it is approved.');
  }
  main.append(pageHead('Request a hamper', 'Pick a time that suits you and a volunteer will have your hamper ready.'), top,
    h('h2', { class: 'section' }, 'Your hampers'), list);
  loadList();
};

views.history = async (main) => {
  const results = h('div');
  const load = async (f = {}) => {
    try {
      results.replaceChildren(table([
        { label: 'Date', render: (r) => fmtDT(r.DistributionDate) },
        { label: 'Hamper', render: (r) => '#' + r.HamperID },
        { label: 'Item', render: (r) => r.ItemName },
        { label: 'Quantity', render: (r) => `${r.QuantityGiven} ${r.Unit}` },
        { label: 'Status', render: (r) => badge(r.Status) },
      ], await api.get('/my/distributions', f), 'No distributions found for these dates.'));
    } catch (e) { fail(e); }
  };
  const filters = filterBar([{ name: 'from', label: 'From date', type: 'date' }, { name: 'to', label: 'To date', type: 'date' }], load);
  main.append(pageHead('My distribution history', 'What you have received, by date.'), filters.el, results);
  load();
};
