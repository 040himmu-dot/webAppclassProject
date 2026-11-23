# Aakrosh: START HERE
**Your area:** Database architecture, backend integration and security

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
| `app.js` | Starts the web server: sessions (login memory), JSON parsing, serves the website from /public, mounts /api routes, central error handler, starts the background scheduler. |
| `routes/api.js` | The single list of every API address and which roles may call it (RBAC). Each line = URL -> role check -> controller function. |
| `config/db.js` | MySQL connection pool. query() runs one SQL statement; transaction() runs several as all-or-nothing (ACID). |
| `config/auth.js` | Security guards: requireLogin (must be signed in) and requireRole (must have an allowed role). |
| `config/errors.js` | AppError (an error with an HTTP status + friendly message) and wrap() so async errors reach the error handler. |
| `config/upload.js` | Saves uploaded profile photos (images only, max 2 MB) into public/uploads. |
| `services/validators.js` | Shared input checks (email, dates, numbers, passwords) and the volunteer-availability parser. Every service uses these so rules stay identical. |
| `services/EmailService.js` | Sends alert emails (or prints them to the terminal if SMTP is not set) and writes each one to the Alert Log table. |
| `controllers/AuthController.js` | Register, login, logout, "who am I", edit own account. Thin: reads the request, calls UserService, sends the reply. |
| `public/js/api.js` | Tiny fetch() wrapper used by every screen to call /api/... and turn errors into messages. |
| `public/js/ui.js` | Shared UI helpers: element builder h(), toasts, pop-up windows, tables, filter bars, date formatting, status badges. |
| `public/js/app.js` | Login/register page, the menu per role, and the page router (shows the right screen for the address after #/). |
| `public/js/views-shared.js` | Creates the empty "views" registry. Each views-*.js file adds its screens to it. |
Also yours:
- `sql/schema.sql`
- `public/css/style.css`
- `public/index.html`
- `package.json`
- `.env.example`
- `.gitignore`
- `tests/smoke-test.js`
- `CONTRACT.md`
- `README.md`
- `TEAM.md`

## How you connect to the others
- **Who depends on you:** Everyone depends on you: the tables in `schema.sql`, the server in `app.js`, the URL list in `routes/api.js`, and the login/role guards in `config/auth.js`.
- **What you depend on:** You call Mahdi's `UserService` (login, register) from `AuthController`. `EmailService` is called by Mahima and Manjot.
- **Tables:** All of them (you design them). You write `AlertLog` through `EmailService`.
- Full details: `CONTRACT.md` (sections 3, 4 and 6).

## You must be able to explain
1. Draw the request path: browser -> routes -> controller -> service -> database.
2. How is a password stored? (bcrypt hash, never plain text) and why is `.env` not on GitHub?
3. What does `requireRole` do, and what happens if a Donor opens `/api/inventory`?
4. What is a transaction and where do we use it? (`config/db.js` `transaction()`; used by HamperService and InventoryService)
5. Why do we archive instead of delete? (3-year retention in the SRS)

## Test your own part
Log in as each role and try a URL it should not reach. Confirm `UserAccount.PasswordHash` starts with `$2a$`. Run `npm run smoke`.

## Order to read your files
Start with the database table you write, then the service, then the controller, then the screen that calls it. Each file starts with a comment block saying what it does, what it uses and who uses it.
