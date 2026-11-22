# Manjot: START HERE
**Your area:** Hamper requests and distribution workflows

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
| `services/HamperService.js` | Hamper rules: approved recipients request a hamper + pickup time; volunteers add items (stock goes down, expired items refused); mark pickups Fulfilled/Delayed/Missed; distribution search. Uses transactions. |
| `controllers/HamperController.js` | Endpoints for hamper requests, pickups, hamper contents, distribution records and status changes. |
| `services/PickupMonitor.js` | Background check (every 5 min): pickups 30 min late become Delayed, 2 h late become Missed, and coordinators are emailed once per change. |
| `services/ReportService.js` | Monthly/annual reports: donations by category, hampers distributed, missed/delayed pickups per recipient, and waste by category. |
| `controllers/ReportController.js` | Single endpoint that returns the chosen report. |
| `public/js/views-distribution.js` | Screens: Pickups and hampers (prepare hamper window, mark picked up/delayed/missed) and Distribution records search. |
| `public/js/views-recipient.js` | Recipient screens: Request a hamper (pick pickup time) and My history. |
| `public/js/views-reports.js` | Coordinator Reports screen: choose report, month/year, view and print. |


## How you connect to the others
- **Who depends on you:** Mahdi's dashboard counts your pickups; Mahima's engine reads your `DistributionRecord` rows; reports use your tables.
- **What you depend on:** You change stock in Mahima's `InventoryItem` table (inside a transaction), read Mahdi's `Shift` rows for the shift rule, and call Aakrosh's `EmailService.sendPickupAlert`.
- **Tables:** Writes `Hamper`, `PickupAppointment`, `DistributionRecord`, and `InventoryItem.QuantityOnHand`. Reads `Shift`, `UserAccount`, `WasteLog`.
- Full details: `CONTRACT.md` (sections 3, 4 and 6).

## You must be able to explain
1. Walk the hamper life cycle: Requested -> Prepared (volunteer adds items, stock goes down) -> Distributed (marked picked up).
2. Why is stock changed inside a transaction with `FOR UPDATE`? (two volunteers cannot take the last tin twice)
3. Explain Delayed after 30 min and Missed after 2 h, and why an alert is sent only when the status changes.
4. What stops an unapproved recipient from requesting a hamper? (`checkApproval`)
5. What does each report count and how are they sorted?

## Test your own part
Request a hamper as the recipient, prepare it as the volunteer (try an expired item and a too-large quantity), mark it picked up, then generate both reports. Insert an old appointment in SQL and Run analysis now to see Delayed/Missed.

## Order to read your files
Start with the database table you write, then the service, then the controller, then the screen that calls it. Each file starts with a comment block saying what it does, what it uses and who uses it.
