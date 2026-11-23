# Team guide: who owns what, and how we use Git

## File ownership
Only edit your own files. If you need a change in someone else's file, ask the owner (or open a pull request they review).

**Aakrosh - database, backend integration, security**
`sql/schema.sql`, `app.js`, `routes/api.js`, `package.json`, `.env.example`, `.gitignore`,
`config/db.js`, `config/auth.js`, `config/errors.js`, `config/upload.js`,
`controllers/AuthController.js`, `services/validators.js`, `services/EmailService.js`,
`public/js/api.js`, `public/js/ui.js`, `public/js/app.js`, `public/js/views-shared.js`, `public/index.html`, `public/css/style.css`

**Mahima - inventory and expiry risk**
`services/InventoryService.js`, `controllers/InventoryController.js`,
`services/AnalyzerEngine.js`, `controllers/AlertController.js`,
`public/js/views-inventory.js` (inventory, categories, alerts), `public/js/views-donor.js`

**Manjot - hampers and distribution**
`services/HamperService.js`, `controllers/HamperController.js`, `services/PickupMonitor.js`,
`services/ReportService.js`, `controllers/ReportController.js`,
`public/js/views-distribution.js` (pickups, hamper preparation, distribution search), `public/js/views-recipient.js`, `public/js/views-reports.js`

**Mahdi - user accounts, roles, coordinator dashboard**
`services/UserService.js`, `controllers/UserController.js`, `services/ShiftService.js`, `controllers/ShiftController.js`,
`public/js/views-account.js`, `public/js/views-users.js` (users, shifts, my shifts), `public/js/views-dashboard.js`

## Test accounts (password pass123)
admin@foodbank.ca (Coordinator), donor@foodbank.ca, volunteer@foodbank.ca, recipient@foodbank.ca (approved), pending@foodbank.ca (pending recipient)

## Everyone: first-time setup
1. `git checkout <your-branch>` then `git pull origin main` (or `git merge origin/main`)
2. Run `sql/schema.sql` in MySQL Workbench
3. Copy `.env.example` to `.env`, set DB_PASSWORD (never commit `.env`)
4. `npm install` then `npm start`, open http://localhost:3000
5. Log in as each role and use every screen that belongs to your files

## Daily Git routine
```
git checkout main && git pull            # get the latest
git checkout <your-branch>
git merge main                           # bring teammates' work into your branch
# ...edit only your files...
git add <your files>
git commit -m "Short description"
git push origin <your-branch>
```
Then open a Pull Request into `main` on GitHub; one teammate reviews and merges.
If `schema.sql` changes, everyone re-runs it in Workbench after pulling.
