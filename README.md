# Online Food Bank Management System - Team 3

Web app built from the SRS v1.1, SDD v1.1 and **Functionality Option 1**.
Node.js + Express + MySQL backend, plain HTML/CSS/JavaScript frontend.

## Run it (about 5 minutes, no Workbench needed)
1. Get the project onto your computer and open its folder in VS Code. Install Node.js (LTS) and MySQL first if you have not.
2. Open a terminal in VS Code (Terminal > New Terminal) and run: `npm install`
3. Run: `npm run setup`  It asks for YOUR MySQL user and password, writes YOUR own `.env` file, and builds the database with sample data.
4. Run: `npm start`, then open http://localhost:3000 and log in with `admin@foodbank.ca` / `pass123`.

Other test logins (password `pass123`): `donor@foodbank.ca`, `volunteer@foodbank.ca`, `recipient@foodbank.ca`, `pending@foodbank.ca`.
Check everything is connected: open a **second** terminal and run `npm run smoke`. It must say ALL CHECKS PASSED.
Start over with fresh sample data any time: `npm run reset-db`.
Your `.env` holds your own password and is never uploaded to GitHub. Never send it to anyone.

| Role | Email |
|---|---|
| Coordinator | admin@foodbank.ca |
| Donor | donor@foodbank.ca |
| Volunteer | volunteer@foodbank.ca |
| Recipient (approved) | recipient@foodbank.ca |
| Recipient (pending) | pending@foodbank.ca |

Emails: with no SMTP settings the alert emails are printed in the terminal and saved in the Alert Log as "simulated".

## Folder guide (Controller-Service pattern from the SDD)
- `app.js` server setup, sessions, error handling, starts the scheduler
- `routes/api.js` every URL and which roles may use it (RBAC)
- `controllers/` read the request, call a service, send the response. **Never touch the database.**
- `services/` business rules + SQL: `UserService`, `InventoryService`, `HamperService`, `ShiftService`, `ReportService`, `EmailService`, `AnalyzerEngine`
- `config/` DB pool, login/role middleware, file upload, validators
- `sql/schema.sql` tables from SDD 3.2 + sample data
- `public/` the frontend (one page, role-based menus)

## Option 1 coverage
| Option 1 item | Where |
|---|---|
| 1.1 Donor / Recipient create account | Login page -> Create account |
| 1.2 Coordinator creates volunteers | Users -> New volunteer |
| 1.3 Approve/reject recipients | Users |
| 1.4 Donor, Recipient, Coordinator modify account | My account |
| 1.5 Coordinator deletes accounts | Users -> Delete (archived, not erased) |
| 1.6 Login | Login page |
| 2.1 Volunteer enter/modify/delete intake | Volunteer -> Inventory |
| 2.2 Coordinator manages categories | Categories |
| 3.1 Recipient requests hamper + pickup time | Request a hamper |
| 3.2 Volunteer manages distribution records (multi-item) | Pickups and hampers -> Prepare hamper |
| 3.3 Mark Fulfilled / Missed / Delayed | Pickups and hampers |
| 3.4 Assign shifts (checks availability) | Shifts |
| 4.1-4.3 Searches | My donations, My history, Distribution records |
| 5.1-5.3 AI detection + alert emails | `AnalyzerEngine`, `EmailService`, Dashboard, Alerts |
| 6 Monthly / annual reports | Reports |

## Rules worth knowing (for your demo and testing)
- AI check every 4 h, pickup monitor every 5 min (SDD 3.3). Dashboard -> **Run analysis now** runs both immediately.
- Pickup: Delayed after 30 min, Missed after 2 h. Alert emails only fire on a status *change*.
- Items with DUE <= 0 are Expired, logged to the Waste Log and can never be put in a hamper.
- With no distribution history, IV falls back to 0.1, so most stock is flagged High Waste Risk. That is the SDD rule working as written.
- Volunteers can only change hampers for pickups inside one of their shifts (`ENFORCE_SHIFT=false` in `.env` turns this off for testing).
- Availability format: `Mon-Fri 09:00-17:00, Sat 10:00-14:00` or `Daily 08:00-20:00`.
- "Delete" never physically deletes (IsArchived), per the 3-year retention rule. Deleting a prepared hamper item returns its stock.
- Passwords use bcrypt (SRS 2.4), not SHA-256.

## Differences between SRS and SDD (we followed the SDD)
SRS says pickup monitor every 15 min / Missed at 23:59 and AI daily; the SDD says every 5 min / Missed after 2 h and AI every 4 h. Consider updating the SRS to match.
