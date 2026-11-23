// Owner: Mahdi - My account screen (all roles).
// ---------- My account (all roles) ----------
views.account = async (main, user, app) => {
  const me = (await api.get('/auth/me')).user;
  const form = h('form', { class: 'card form-grid', enctype: 'multipart/form-data' },
    field('Full name', input('Name', { value: me.Name, required: true, maxlength: 100 })),
    field('Email', input('Email', { type: 'email', value: me.Email, required: true })),
    field('Phone', input('Phone', { value: me.Phone, required: true, maxlength: 30 })),
    me.Role === 'Recipient' ? [
      field('Household size', input('HouseholdSize', { type: 'number', min: 1, value: me.HouseholdSize })),
      field('Dietary restrictions / allergies', input('DietaryRestrictions', { value: me.DietaryRestrictions || '' })),
      field('Emergency contact (name and phone)', input('EmergencyContact', { value: me.EmergencyContact || '' })),
    ] : null,
    me.Role === 'Volunteer' ? [
      field('Availability', input('Availability', { value: me.Availability || '', placeholder: 'Mon-Fri 09:00-17:00, Sat 10:00-14:00' }),
        'Days and times you can work. Coordinators use this when assigning shifts.'),
      field('Profile photo', input('ProfileImage', { type: 'file', accept: 'image/*' })),
    ] : null,
    field('New password', input('Password', { type: 'password', minlength: 6, autocomplete: 'new-password' }), 'Leave empty to keep your current password.'),
    h('div', { class: 'form-actions' }, h('button', { class: 'btn', type: 'submit' }, 'Save changes')));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(form.querySelector('button[type=submit]'), async () => {
      const res = await api.put('/me', new FormData(form));
      toast(res.message);
      app.setUser(res.user);
      form.Password.value = '';
    });
  });
  main.append(pageHead('My account', `Signed in as ${me.Role.toLowerCase()}.`), form,
    me.Role === 'Recipient' ? h('p', { class: 'note' }, 'Approval status: ', badge(me.ApprovalStatus)) : null);
};

