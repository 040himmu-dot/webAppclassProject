const UserService = require('../services/UserService');

const sessionUser = (u) => ({ id: u.UserID, name: u.Name, role: u.Role });

exports.register = async (req, res) => {
  const user = await UserService.register(req.body);
  res.status(201).json({ message: user.Role === 'Recipient'
    ? 'Registered. A Coordinator must approve your account before you can request a hamper.'
    : 'Registered. You can log in now.', user });
};

exports.login = async (req, res) => {
  const user = await UserService.login(req.body.Email, req.body.Password);
  await new Promise((ok, fail) => req.session.regenerate((e) => (e ? fail(e) : ok())));
  req.session.user = sessionUser(user);
  res.json({ user });
};

exports.logout = (req, res) => req.session.destroy(() => res.json({ message: 'Logged out.' }));

exports.me = async (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  const user = await UserService.getById(req.session.user.id);
  if (!user) return req.session.destroy(() => res.json({ user: null }));
  res.json({ user });
};

exports.updateMe = async (req, res) => {
  const user = await UserService.modifyAccount(req.session.user.id, req.body, req.file);
  req.session.user = sessionUser(user);
  res.json({ message: 'Account updated.', user });
};
