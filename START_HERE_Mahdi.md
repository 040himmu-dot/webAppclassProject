# Mahdi: START HERE
**Your area:** User accounts, role management and the coordinator dashboard

## Setup in 6 steps
1. Get the project onto your computer and open its folder in VS Code.
2. Workbench: File > Open SQL Script > `sql/schema.sql` > lightning bolt (this resets the database).
3. Create `.env`: copy `.env.example`, rename the copy `.env`, put your MySQL password after `DB_PASSWORD=`.
4. Terminal: `npm install`, then `npm start`.
5. Browser: http://localhost:3000. Test logins (password `pass123`): `admin@foodbank.ca`, `donor@foodbank.ca`, `volunteer@foodbank.ca`, `recipient@foodbank.ca`, `pending@foodbank.ca`.
6. Second terminal: `npm run smoke` should print ALL CHECKS PASSED.

## Your files (only edit these)
| File | What it does |
|---|---|
| `services/UserService.js` | All user-account rules: register, login (bcrypt), edit own account, coordinator creates volunteers, approve/reject recipients, archive (soft-delete) accounts. |
| `controllers/UserController.js` | Coordinator user-management endpoints: list users, create/edit volunteers, approve/reject recipients, delete, donor/volunteer pick-lists. |
| `services/ShiftService.js` | Coordinator assigns volunteers to shifts. Checks the volunteer exists, is available at that time, and has no overlapping shift. |
| `controllers/ShiftController.js` | Shift endpoints: list (volunteers see only their own), assign, complete, cancel. |
| `public/js/views-account.js` | "My account" screen for every role (name, phone, password; recipient and volunteer extras). |
| `public/js/views-users.js` | Coordinator screens: Users (approve/reject, create/edit/delete) and Shifts (assign), plus the volunteer's "My shifts" list. |
| `public/js/views-dashboard.js` | Coordinator dashboard: counts + the shelf-life bars (how long stock lasts vs when it expires). Data comes from Mahima's AnalyzerEngine. |


## How you connect to the others
- **Who depends on you:** Everyone depends on your `UserService.login()` and `getById()`; Manjot's shift rule reads your `Shift` rows.
- **What you depend on:** Your dashboard displays Mahima's `GET /api/alerts/expiry` and Manjot's `GET /api/pickups`. `AuthController` (Aakrosh) calls your service.
- **Tables:** Writes `UserAccount`, `Shift`. Reads `InventoryItem` risk data (via the alerts API) and pickups for the dashboard.
- Full details: `CONTRACT.md` (sections 3, 4 and 6).

## You must be able to explain
1. Four roles, one table: how does `Role` plus `ApprovalStatus` decide what a person can do?
2. Walk a recipient from registration to Approved to requesting a hamper.
3. How does the shift form check availability? (`availabilityCovers` in validators.js)
4. Why is deleting a user an update to `IsArchived`? What else does it cancel? (future shifts)
5. Where do the dashboard numbers come from?

## Test your own part
Register a recipient, approve and reject. Create a volunteer with availability and a photo. Assign a shift outside their availability (refused) and one inside (accepted). Delete a user and confirm the row is still in MySQL.

## Order to read your files
Start with the database table you write, then the service, then the controller, then the screen that calls it. Each file starts with a comment block saying what it does, what it uses and who uses it.
