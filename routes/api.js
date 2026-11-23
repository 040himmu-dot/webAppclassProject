// All API routes. Controllers never touch the database; they call Services (SDD Controller-Service pattern).
const router = require('express').Router();
const { wrap } = require('../config/errors');
const { requireLogin, requireRole } = require('../config/auth');
const upload = require('../config/upload');

const Auth = require('../controllers/AuthController');
const Users = require('../controllers/UserController');
const Inv = require('../controllers/InventoryController');
const Hamper = require('../controllers/HamperController');
const Shifts = require('../controllers/ShiftController');
const Reports = require('../controllers/ReportController');
const Alerts = require('../controllers/AlertController');

const login = requireLogin;
const only = (...r) => [requireLogin, requireRole(...r)];
const w = wrap;

// ---- authentication / own account
router.post('/auth/register', w(Auth.register));
router.post('/auth/login', w(Auth.login));
router.post('/auth/logout', Auth.logout);
router.get('/auth/me', w(Auth.me));
router.put('/me', login, upload.single('ProfileImage'), w(Auth.updateMe));

// ---- Coordinator: user management
router.get('/users', only('Coordinator'), w(Users.list));
router.get('/volunteers', only('Coordinator'), w(Users.volunteers));
router.get('/donors', only('Volunteer', 'Coordinator'), w(Users.donors));
router.post('/users/volunteers', only('Coordinator'), upload.single('ProfileImage'), w(Users.createVolunteer));
router.put('/users/volunteers/:id', only('Coordinator'), upload.single('ProfileImage'), w(Users.updateVolunteer));
router.put('/users/:id', only('Coordinator'), w(Users.updateUser));
router.patch('/users/:id/approval', only('Coordinator'), w(Users.setApproval));
router.delete('/users/:id', only('Coordinator'), w(Users.remove));

// ---- categories
router.get('/categories', login, w(Inv.categories));
router.post('/categories', only('Coordinator'), w(Inv.createCategory));
router.put('/categories/:id', only('Coordinator'), w(Inv.renameCategory));
router.delete('/categories/:id', only('Coordinator'), w(Inv.deleteCategory));

// ---- inventory
router.get('/inventory', only('Volunteer', 'Coordinator'), w(Inv.search));
router.post('/inventory', only('Volunteer'), w(Inv.enter));
router.put('/inventory/:id', only('Volunteer'), w(Inv.modify));
router.delete('/inventory/:id', only('Volunteer'), w(Inv.remove));

// ---- donations
router.post('/donations', only('Donor'), w(Inv.donate));
router.get('/donations', only('Donor'), w(Inv.donationHistory));

// ---- hampers, pickups, distribution records
router.post('/hampers', only('Recipient'), w(Hamper.request));
router.get('/hampers/mine', only('Recipient'), w(Hamper.mine));
router.get('/my/distributions', only('Recipient'), w(Hamper.myDistributions));
router.get('/pickups', only('Volunteer', 'Coordinator'), w(Hamper.pickups));
router.patch('/pickups/:id/status', only('Volunteer'), w(Hamper.markStatus));
router.get('/hampers/:id', only('Volunteer', 'Coordinator'), w(Hamper.hamper));
router.post('/hampers/:id/distributions', only('Volunteer'), w(Hamper.addItems));
router.get('/distributions', only('Volunteer', 'Coordinator'), w(Hamper.searchDistributions));
router.put('/distributions/:id', only('Volunteer'), w(Hamper.modifyRecord));
router.delete('/distributions/:id', only('Volunteer'), w(Hamper.deleteRecord));

// ---- shifts
router.get('/shifts', only('Coordinator', 'Volunteer'), w(Shifts.list));
router.post('/shifts', only('Coordinator'), w(Shifts.assign));
router.patch('/shifts/:id/complete', only('Coordinator'), w(Shifts.complete));
router.delete('/shifts/:id', only('Coordinator'), w(Shifts.cancel));

// ---- reports + AI alerts
router.get('/reports', only('Coordinator'), w(Reports.generate));
router.get('/alerts/expiry', only('Coordinator'), w(Alerts.expiry));
router.get('/alerts/log', only('Coordinator'), w(Alerts.log));
router.post('/alerts/run', only('Coordinator'), w(Alerts.runNow));

module.exports = router;
