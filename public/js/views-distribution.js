// Owner: Manjot - pickups, hamper preparation, distribution record search.
// ---------- Distribution records search (Volunteer + Coordinator) ----------
views.distributions = async (main) => {
  const results = h('div');
  const load = async (f = {}) => {
    try {
      results.replaceChildren(table([
        { label: 'Date', render: (r) => fmtDT(r.DistributionDate) },
        { label: 'Recipient', render: (r) => r.RecipientName },
        { label: 'Hamper', render: (r) => '#' + r.HamperID },
        { label: 'Item', render: (r) => r.ItemName },
        { label: 'Quantity', render: (r) => `${r.QuantityGiven} ${r.Unit}` },
        { label: 'Prepared by', render: (r) => r.VolunteerName || '—' },
        { label: 'Status', render: (r) => badge(r.Status) },
      ], await api.get('/distributions', f), 'No distribution records match your search.'));
    } catch (e) { fail(e); }
  };
  const filters = filterBar([
    { name: 'recipient', label: 'Recipient name' },
    { name: 'from', label: 'From date', type: 'date' },
    { name: 'to', label: 'To date', type: 'date' },
  ], load);
  main.append(pageHead('Distribution records', 'Search what has been given to each recipient.'), filters.el, results);
  load();
};

// ---------- Pickups + hamper preparation (Volunteer acts, Coordinator reads) ----------
views.pickups = async (main, user) => {
  const canAct = user.Role === 'Volunteer';
  const results = h('div');
  const openOnly = h('input', { type: 'checkbox', checked: true });
  const load = async (f = {}) => {
    try {
      const rows = await api.get('/pickups', { ...f, open: openOnly.checked ? '1' : '' });
      results.replaceChildren(table([
        { label: 'Pickup time', render: (r) => fmtDT(r.ScheduledDateTime) },
        { label: 'Recipient', render: (r) => h('div', {}, h('strong', {}, r.RecipientName), h('div', { class: 'muted' }, `Household of ${r.HouseholdSize || '?'} · ${r.DietaryRestrictions || 'no restrictions'}`)) },
        { label: 'Hamper', render: (r) => h('div', {}, '#' + r.HamperID, h('div', { class: 'muted' }, `${r.ItemCount} item(s)`)) },
        { label: 'Status', render: (r) => h('div', { class: 'stack' }, badge(r.Status), canAct && r.InShift ? h('span', { class: 'badge plain' }, 'Your shift') : null) },
        { label: '', render: (r) => {
          const open = ['Scheduled', 'Delayed'].includes(r.Status);
          return h('div', { class: 'row-actions' },
            h('button', { class: 'btn small ghost', onclick: () => openHamper(r.HamperID, { readonly: !canAct, onChange: () => load(filters.values()) }) }, canAct && open ? 'Prepare hamper' : 'View hamper'),
            canAct && open ? [
              h('button', { class: 'btn small', onclick: () => mark(r, 'Fulfilled') }, 'Picked up'),
              r.Status === 'Scheduled' ? h('button', { class: 'btn small ghost', onclick: () => mark(r, 'Delayed') }, 'Delayed') : null,
              h('button', { class: 'btn small danger-ghost', onclick: () => mark(r, 'Missed') }, 'Missed'),
            ] : null);
        } },
      ], rows, openOnly.checked ? 'No open pickups right now.' : 'No pickups match your search.'));
    } catch (e) { fail(e); }
  };
  async function mark(r, status) {
    if (status === 'Missed' && !(await confirmBox(`Mark ${r.RecipientName}'s pickup as missed? Coordinators will be emailed.`, { okText: 'Mark missed' }))) return;
    try { toast((await api.patch(`/pickups/${r.AppointmentID}/status`, { Status: status })).message); load(filters.values()); } catch (e) { fail(e); }
  }
  const filters = filterBar([
    { name: 'recipient', label: 'Recipient name' },
    { name: 'from', label: 'From date', type: 'date' },
    { name: 'to', label: 'To date', type: 'date' },
  ], load);
  filters.el.prepend(h('label', { class: 'check inline' }, openOnly, ' Open pickups only'));
  openOnly.addEventListener('change', () => load(filters.values()));
  main.append(pageHead('Pickups and hampers', canAct ? 'Prepare hampers for pickups in your shift, then record what happened.' : 'All scheduled pickups.'), filters.el, results);
  load();
};

async function openHamper(hamperId, { readonly, onChange }) {
  const body = h('div', {});
  modal(`Hamper #${hamperId}`, body, { wide: true });
  const changed = () => { render(); if (onChange) onChange(); };
  async function render() {
    try {
      const hp = await api.get('/hampers/' + hamperId);
      const editable = !readonly && ['Requested', 'Prepared'].includes(hp.Status) && ['Scheduled', 'Delayed'].includes(hp.PickupStatus);
      let addForm = null;
      if (editable) {
        const stock = (await api.get('/inventory')).filter((i) => i.QuantityOnHand > 0 && i.RiskStatus !== 'Expired' && i.DUE > 0)
          .sort((a, b) => (b.RiskStatus === 'High Waste Risk') - (a.RiskStatus === 'High Waste Risk') || a.DUE - b.DUE);
        const sel = h('select', { name: 'ItemID' }, stock.map((i) =>
          h('option', { value: i.ItemID }, `${i.RiskStatus === 'High Waste Risk' ? '[Use first] ' : ''}${i.ItemName} — ${i.QuantityOnHand} ${i.Unit}, expires ${fmtD(i.ExpirationDate)}`)));
        const qty = input('Quantity', { type: 'number', min: 1, value: 1, required: true });
        addForm = h('form', { class: 'inline-form' }, field('Add item from stock', sel), field('Quantity', qty),
          h('button', { class: 'btn', type: 'submit' }, 'Add to hamper'));
        addForm.addEventListener('submit', (e) => {
          e.preventDefault();
          if (!stock.length) return toast('There is no usable stock.', 'error');
          busy(addForm.querySelector('button'), async () => {
            toast((await api.post(`/hampers/${hamperId}/distributions`, { items: [{ ItemID: sel.value, Quantity: qty.value }] })).message);
            changed();
          });
        });
      }
      body.replaceChildren(
        h('div', { class: 'hamper-info' },
          h('div', {}, h('strong', {}, hp.RecipientName), h('div', { class: 'muted' }, `Household of ${hp.HouseholdSize || '?'}`)),
          h('div', {}, h('span', { class: 'label' }, 'Dietary restrictions'), h('div', {}, hp.DietaryRestrictions || 'None')),
          h('div', {}, h('span', { class: 'label' }, 'Pickup'), h('div', {}, fmtDT(hp.ScheduledDateTime), ' ', badge(hp.PickupStatus))),
          h('div', {}, h('span', { class: 'label' }, 'Hamper'), h('div', {}, badge(hp.Status)))),
        table([
          { label: 'Item', render: (r) => r.ItemName },
          { label: 'Quantity', render: (r) => {
            if (!editable || r.Status !== 'Prepared') return `${r.QuantityGiven} ${r.Unit}`;
            const q = h('input', { type: 'number', min: 1, value: r.QuantityGiven, class: 'qty' });
            return h('div', { class: 'row-actions' }, q, r.Unit, h('button', { class: 'btn small ghost', onclick: () =>
              api.put('/distributions/' + r.DistributionID, { Quantity: q.value }).then((x) => { toast(x.message); changed(); }).catch(fail) }, 'Save'));
          } },
          { label: 'Status', render: (r) => badge(r.Status) },
          editable ? { label: '', render: (r) => r.Status === 'Prepared' ? h('button', { class: 'btn small danger-ghost', onclick: async () => {
            if (await confirmBox(`Remove ${r.ItemName} from this hamper? The stock goes back to inventory.`, { okText: 'Remove' }))
              api.del('/distributions/' + r.DistributionID).then((x) => { toast(x.message); changed(); }).catch(fail);
          } }, 'Remove') : '' } : null,
        ].filter(Boolean), hp.records, 'No items yet. Add items below to prepare this hamper.'),
        addForm || (readonly ? null : h('p', { class: 'note' }, 'This hamper can no longer be changed.')));
    } catch (e) { body.replaceChildren(h('p', { class: 'error-text' }, e.message)); }
  }
  render();
}

