# Mahima: START HERE
**Your area:** Inventory management and expiry-risk tracking

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
| `services/InventoryService.js` | Inventory + donation rules: categories, add/modify/archive items, search inventory, donor donation history. Rejects expired items and negative quantities. |
| `controllers/InventoryController.js` | Endpoints for categories, inventory intake/edit/delete/search, and donor donations + history. |
| `services/AnalyzerEngine.js` | The "AI" (rule-based) expiry-risk engine. Calculates Days Until Expiry, daily pace and Estimated Finishing Days; flags High Waste Risk / Expired, logs waste, emails alerts. Also starts the timers for the pickup monitor. |
| `controllers/AlertController.js` | Endpoints for the dashboard risk table, the Alert Log, and the "Run analysis now" button. |
| `public/js/views-inventory.js` | Screens: Inventory (search, record intake, edit, delete), Food categories (coordinator), Alerts (at-risk items + alert log). |
| `public/js/views-donor.js` | Donor screens: Donate food (multi-item form) and My donations (search by date/category). |


## How you connect to the others
- **Who depends on you:** Manjot reads/changes `InventoryItem.QuantityOnHand`; Mahdi's dashboard shows your `computeMetrics()` output; Manjot's hamper window uses `GET /api/inventory`.
- **What you depend on:** You call `EmailService.sendInventoryAlert` (Aakrosh) and read `DistributionRecord` (Manjot) to get the daily pace. You start Manjot's `PickupMonitor` timer.
- **Tables:** Writes `Category`, `InventoryItem`, `WasteLog`. Reads `DistributionRecord`, `AlertLog`.
- Full details: `CONTRACT.md` (sections 3, 4 and 6).

## You must be able to explain
1. State the formula: DUE = days until expiry; IV = units given per day (30-day average, fallback 0.1); EFD = stock / IV; High Waste Risk if DUE <= 7 or EFD > DUE; Expired if DUE <= 0.
2. Why do expired items get logged to WasteLog exactly once? (status change triggers it)
3. Why can a donor not add an expired item? (`validateItem` in InventoryService)
4. How does the "Use first" tag reach the volunteer? (RiskStatus -> `GET /api/inventory` -> Prepare hamper window)
5. What do the two timers do and where are they started? (`AnalyzerEngine.start`)

## Test your own part
Add an item with a past date (refused). Click Run analysis now on the dashboard and see the Alerts screen update. Delete an item with "record as wasted" ticked, then open the waste report.

## Order to read your files
Start with the database table you write, then the service, then the controller, then the screen that calls it. Each file starts with a comment block saying what it does, what it uses and who uses it.
