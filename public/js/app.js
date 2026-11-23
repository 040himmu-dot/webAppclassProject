// App shell: login / register screen, role-based navigation, hash router.
const NAV = {
  Donor: [['donate', 'Donate food'], ['donations', 'My donations'], ['account', 'My account']],
  Recipient: [['hamper', 'Request a hamper'], ['history', 'My history'], ['account', 'My account']],
  Volunteer: [['pickups', 'Pickups and hampers'], ['inventory', 'Inventory'], ['distributions', 'Distribution records'], ['myshifts', 'My shifts'], ['account', 'My account']],
  Coordinator: [['dashboard', 'Dashboard'], ['users', 'Users'], ['shifts', 'Shifts'], ['pickups', 'Pickups'], ['inventory', 'Inventory'],
    ['distributions', 'Distribution records'], ['categories', 'Categories'], ['reports', 'Reports'], ['alerts', 'Alerts'], ['account', 'My account']],
};

const app = {
  user: null,
  setUser(u) { this.user = u; const n = $('.user-name'); if (n) n.textContent = u.Name; },
  navigate(route, force) { if (force && location.hash === '#/' + route) renderRoute(); else location.hash = '#/' + route; },
};

const root = $('#app');

// ---------- login / register ----------
function renderAuth() {
  root.replaceChildren();
  const loginForm = h('form', { class: 'auth-form' },
    field('Email', input('Email', { type: 'email', required: true, autocomplete: 'username' })),
    field('Password', input('Password', { type: 'password', required: true, autocomplete: 'current-password' })),
    h('button', { class: 'btn wide-btn', type: 'submit' }, 'Log in'));
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(loginForm.querySelector('button'), async () => {
      const { user } = await api.post('/auth/login', Object.fromEntries(new FormData(loginForm).entries()));
      location.hash = '';
      startApp(user);
    });
  });

  const role = select('Role', [{ value: 'Donor', label: 'I want to donate food' }, { value: 'Recipient', label: 'I need a food hamper' }]);
  const recipientFields = h('div', { class: 'form-grid inner', hidden: true },
    field('Household size', input('HouseholdSize', { type: 'number', min: 1 })),
    field('Dietary restrictions / allergies', input('DietaryRestrictions', { placeholder: 'None' })),
    field('Emergency contact (name and phone)', input('EmergencyContact', { maxlength: 150 })));
  role.addEventListener('change', () => {
    const rec = role.value === 'Recipient';
    recipientFields.hidden = !rec;
    recipientFields.querySelector('[name=HouseholdSize]').required = rec;
    recipientFields.querySelector('[name=EmergencyContact]').required = rec;
  });
  const regForm = h('form', { class: 'auth-form' }, field('Account type', role),
    field('Full name', input('Name', { required: true, maxlength: 100 })),
    field('Email', input('Email', { type: 'email', required: true })),
    field('Phone', input('Phone', { required: true, maxlength: 30 })),
    field('Password', input('Password', { type: 'password', required: true, minlength: 6, autocomplete: 'new-password' }), 'At least 6 characters.'),
    recipientFields,
    h('button', { class: 'btn wide-btn', type: 'submit' }, 'Create account'));
  regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(regForm.querySelector('button[type=submit]'), async () => {
      const res = await api.post('/auth/register', Object.fromEntries(new FormData(regForm).entries()));
      toast(res.message);
      regForm.reset(); recipientFields.hidden = true;
      show('login');
      loginForm.Email.value = res.user.Email;
    });
  });

  const tabLogin = h('button', { class: 'tab active', type: 'button', onclick: () => show('login') }, 'Log in');
  const tabReg = h('button', { class: 'tab', type: 'button', onclick: () => show('register') }, 'Create account');
  const panel = h('div', {}, loginForm);
  function show(which) {
    tabLogin.classList.toggle('active', which === 'login');
    tabReg.classList.toggle('active', which === 'register');
    panel.replaceChildren(which === 'login' ? loginForm : regForm);
  }
  root.append(h('main', { class: 'auth' },
    h('section', { class: 'auth-intro' },
      h('h1', {}, 'Food Bank'),
      h('p', {}, 'Donate food, request a hamper, and keep every shelf accounted for. Everything the food bank does, in one place.')),
    h('section', { class: 'auth-card' }, h('div', { class: 'tabs' }, tabLogin, tabReg), panel)));
}

// ---------- shell ----------
function startApp(user) {
  app.user = user;
  root.replaceChildren(
    h('div', { class: 'shell' },
      h('aside', { class: 'side' },
        h('div', { class: 'brand' }, 'Food Bank'),
        h('nav', { id: 'nav', 'aria-label': 'Main' }, NAV[user.Role].map(([r, label]) => h('a', { href: '#/' + r, 'data-route': r }, label))),
        h('div', { class: 'me' },
          h('div', {}, h('div', { class: 'user-name' }, user.Name), h('div', { class: 'muted' }, user.Role)),
          h('button', { class: 'btn small ghost', onclick: logout }, 'Log out'))),
      h('main', { id: 'main', tabindex: '-1' })));
  if (!location.hash || location.hash === '#/') location.hash = '#/' + NAV[user.Role][0][0];
  else renderRoute();
}

async function logout() { try { await api.post('/auth/logout'); } catch (e) { /* ignore */ } app.user = null; location.hash = ''; renderAuth(); }

let renderToken = 0;
async function renderRoute() {
  if (!app.user) return;
  const route = location.hash.replace(/^#\//, '');
  const allowed = NAV[app.user.Role].map((n) => n[0]);
  if (!allowed.includes(route)) { location.hash = '#/' + allowed[0]; return; }
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === route));
  const main = $('#main');
  const token = ++renderToken;
  const holder = h('div', { class: 'view' });
  try { await views[route](holder, app.user, app); }
  catch (e) { holder.replaceChildren(h('div', { class: 'banner bad' }, e.message || 'Could not load this page.')); }
  if (token !== renderToken) return; // user navigated away while loading
  main.replaceChildren(holder);
  main.focus({ preventScroll: true });
}
window.addEventListener('hashchange', renderRoute);

api.setUnauthorizedHandler(() => { if (app.user) { app.user = null; toast('Your session ended. Please log in again.', 'error'); renderAuth(); } });

(async function boot() {
  try {
    const { user } = await api.get('/auth/me');
    if (user) startApp(user); else renderAuth();
  } catch (e) { renderAuth(); }
})();
