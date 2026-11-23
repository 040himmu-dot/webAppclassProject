
 // Owner: Mahdi - user management, shift assignment, volunteer's own shifts.

// ---------- Users ----------
views.users = async (main, user, appRef) => {
  const results = h('div');

  const load = async (f = {}) => {
    try {
      const rows = await api.get('/users', f);
      results.replaceChildren(table([
        { label: 'Name', render: (u) => h('div', { class: 'who' }, u.ProfileImage ? h('img', { class: 'avatar', src: '/uploads/' + u.ProfileImage, alt: '' }) : null, u.Name) },
        { label: 'Email', render: (u) => u.Email },
        { label: 'Phone', render: (u) => u.Phone },
        { label: 'Role', render: (u) => u.Role + (u.Role === 'Volunteer' ? ` (ID ${u.UserID})` : '') },
        { label: 'Details', render: (u) => u.Role === 'Recipient' ? `Household ${u.HouseholdSize} · ${u.DietaryRestrictions || 'none'}` : u.Role === 'Volunteer' ? (u.Availability || 'No availability set') : '' },
        { label: 'Status', render: (u) => u.ApprovalStatus ? badge(u.ApprovalStatus) : '' },
        {
          label: '',
          render: (u) => h('div', { class: 'row-actions' },
            u.Role === 'Recipient' && u.ApprovalStatus !== 'Approved'
              ? h('button', { class: 'btn small', onclick: () => approve(u, 'Approved') }, 'Approve')
              : null,

            u.Role === 'Recipient' && u.ApprovalStatus === 'Pending'
              ? h('button', { class: 'btn small ghost', onclick: () => approve(u, 'Rejected') }, 'Reject')
              : null,

            u.Role === 'Volunteer'
              ? h('button', { class: 'btn small ghost', onclick: () => volunteerForm(u) }, 'Edit')
              : null,

            // NEW: Allow Coordinators to edit Donors and Recipients.
            ['Donor', 'Recipient'].includes(u.Role)
              ? h('button', { class: 'btn small ghost', onclick: () => userForm(u) }, 'Edit')
              : null,

            u.UserID !== appRef.user.UserID
              ? h('button', { class: 'btn small danger-ghost', onclick: () => remove(u) }, 'Delete')
              : null
          )
        },
      ], rows, 'No accounts match.'));
    } catch (e) {
      fail(e);
    }
  };

  const approve = (u, status) =>
    api.patch(`/users/${u.UserID}/approval`, { Status: status })
      .then((r) => {
        toast(r.message);
        load(filters.values());
      })
      .catch(fail);

  async function remove(u) {
    if (await confirmBox(
      `Delete ${u.Name}'s account? Their records are kept for the 3-year retention period.`,
      { okText: 'Delete account' }
    )) {
      api.del('/users/' + u.UserID)
        .then((r) => {
          toast(r.message);
          load(filters.values());
        })
        .catch(fail);
    }
  }

  function volunteerForm(u) {
    const form = h('form', { class: 'form-grid', enctype: 'multipart/form-data' },
      field('Full name', input('Name', {
        required: true,
        value: u ? u.Name : ''
      })),

      field('Email', input('Email', {
        type: 'email',
        required: true,
        value: u ? u.Email : ''
      })),

      field('Phone', input('Phone', {
        required: true,
        value: u ? u.Phone : ''
      })),

      field(
        u ? 'New password' : 'Temporary password',
        input('Password', {
          type: 'password',
          minlength: 6,
          required: !u,
          autocomplete: 'new-password'
        }),
        u ? 'Leave empty to keep the current one.' : 'At least 6 characters.'
      ),

      field('Availability', input('Availability', {
        value: u ? u.Availability || '' : '',
        placeholder: 'Mon-Fri 09:00-17:00, Sat 10:00-14:00'
      }), 'Use day names and 24-hour times. "Daily 08:00-20:00" also works.'),

      field('Profile photo', input('ProfileImage', {
        type: 'file',
        accept: 'image/*'
      })),

      h('div', { class: 'form-actions' },
        h('button', {
          class: 'btn',
          type: 'submit'
        }, u ? 'Save volunteer' : 'Create volunteer')
      )
    );

    const m = modal(u ? `Edit ${u.Name}` : 'New volunteer account', form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      busy(form.querySelector('button[type=submit]'), async () => {
        const fd = new FormData(form);

        const r = u
          ? await api.put('/users/volunteers/' + u.UserID, fd)
          : await api.post('/users/volunteers', fd);

        toast(r.message);
        m.close();
        load(filters.values());
      });
    });
  }

  // NEW: Coordinator editing form for Donor and Recipient accounts.
  function userForm(u) {
    const form = h('form', { class: 'form-grid' },
      field('Full name',
        input('Name', {
          required: true,
          value: u.Name
        })
      ),

      field('Email',
        input('Email', {
          type: 'email',
          required: true,
          value: u.Email
        })
      ),

      field('Phone',
        input('Phone', {
          required: true,
          value: u.Phone
        })
      ),

      u.Role === 'Recipient'
        ? field('Household size',
            input('HouseholdSize', {
              type: 'number',
              min: 1,
              required: true,
              value: u.HouseholdSize
            })
          )
        : null,

      u.Role === 'Recipient'
        ? field('Dietary restrictions / allergies',
            input('DietaryRestrictions', {
              value: u.DietaryRestrictions || ''
            })
          )
        : null,

      u.Role === 'Recipient'
        ? field('Emergency contact',
            input('EmergencyContact', {
              required: true,
              value: u.EmergencyContact || ''
            })
          )
        : null,

      h('div', { class: 'form-actions' },
        h('button', {
          class: 'btn',
          type: 'submit'
        }, 'Save changes')
      )
    );

    const m = modal(`Edit ${u.Name}`, form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      busy(form.querySelector('button[type=submit]'), async () => {
        const data = Object.fromEntries(new FormData(form).entries());

        const r = await api.put(`/users/${u.UserID}`, data);

        toast(r.message);
        m.close();
        load(filters.values());
      });
    });
  }

  const filters = filterBar([
    { name: 'q', label: 'Name or email' },
    { name: 'role', label: 'Role', options: ['Donor', 'Recipient', 'Volunteer', 'Coordinator'] },
    { name: 'status', label: 'Approval', options: ['Pending', 'Approved', 'Rejected'] },
  ], load);

  main.append(
    pageHead(
      'Users',
      'Approve recipients, create volunteers and manage accounts.',
      h('button', {
        class: 'btn',
        onclick: () => volunteerForm(null)
      }, 'New volunteer')
    ),
    filters.el,
    results
  );

  load();
};

// ---------- Shifts ----------
views.shifts = async (main) => {
  const vols = await api.get('/volunteers');
  const results = h('div');

  const load = async () => {
    try {
      results.replaceChildren(table([
        { label: 'Date', render: (s) => fmtD(s.StartDateTime) },
        { label: 'Time', render: (s) => `${s.StartDateTime.slice(11, 16)} – ${s.EndDateTime.slice(11, 16)}` },
        { label: 'Volunteer', render: (s) => s.VolunteerName },
        { label: 'Task', render: (s) => s.TaskDescription },
        { label: 'Status', render: (s) => badge(s.Status) },
        {
          label: '',
          render: (s) => s.Status === 'Scheduled'
            ? h('div', { class: 'row-actions' },
                h('button', {
                  class: 'btn small ghost',
                  onclick: () =>
                    api.patch(`/shifts/${s.ShiftID}/complete`)
                      .then((r) => {
                        toast(r.message);
                        load();
                      })
                      .catch(fail)
                }, 'Mark completed'),

                h('button', {
                  class: 'btn small danger-ghost',
                  onclick: () =>
                    api.del('/shifts/' + s.ShiftID)
                      .then((r) => {
                        toast(r.message);
                        load();
                      })
                      .catch(fail)
                }, 'Cancel')
              )
            : ''
        },
      ], await api.get('/shifts'), 'No shifts scheduled.'));
    } catch (e) {
      fail(e);
    }
  };

  const sel = select('VolunteerID', vols.map((v) => ({
    value: v.UserID,
    label: v.Name
  })));

  const hint = h('span', { class: 'hint' });

  const showHint = () => {
    const v = vols.find((x) => String(x.UserID) === sel.value);
    hint.textContent = v
      ? `Availability: ${v.Availability || 'not set'}`
      : '';
  };

  sel.addEventListener('change', showHint);
  showHint();

  const form = h('form', { class: 'card form-grid' },
    h('label', { class: 'field' },
      h('span', { class: 'label' }, 'Volunteer'),
      sel,
      hint
    ),

    field('Start', input('StartDateTime', {
      type: 'datetime-local',
      required: true
    })),

    field('End', input('EndDateTime', {
      type: 'datetime-local',
      required: true
    })),

    field('Task', input('TaskDescription', {
      required: true,
      maxlength: 255,
      placeholder: 'Hamper preparation and pickups'
    })),

    h('div', { class: 'form-actions' },
      h('button', {
        class: 'btn',
        type: 'submit'
      }, 'Assign shift')
    )
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    busy(form.querySelector('button[type=submit]'), async () => {
      toast((
        await api.post(
          '/shifts',
          Object.fromEntries(new FormData(form).entries())
        )
      ).message);

      load();
    });
  });

  main.append(
    pageHead(
      'Shifts',
      'The system checks each volunteer\'s availability before assigning.'
    ),
    vols.length
      ? form
      : h('div', { class: 'banner warn' },
          'Create a volunteer account first (Users → New volunteer).'
        ),
    h('h2', { class: 'section' }, 'Scheduled shifts'),
    results
  );

  load();
};

// ---------- My shifts (Volunteer) ----------
views.myshifts = async (main) => {
  const rows = await api.get('/shifts');

  main.append(
    pageHead('My shifts', 'Shifts a Coordinator has assigned to you.'),
    table([
      { label: 'Date', render: (r) => fmtD(r.StartDateTime) },
      { label: 'Time', render: (r) => `${r.StartDateTime.slice(11, 16)} – ${r.EndDateTime.slice(11, 16)}` },
      { label: 'Task', render: (r) => r.TaskDescription },
      { label: 'Assigned by', render: (r) => r.AssignedByName || '—' },
      { label: 'Status', render: (r) => badge(r.Status) },
    ], rows, 'No shifts assigned yet.')
  );
};
