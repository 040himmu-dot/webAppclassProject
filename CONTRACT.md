# CONTRACT: how our four parts connect

Read this once. It is the agreement that keeps four separate pieces of work from drifting apart.

## 1. The one picture to remember
```
Browser screen (public/js/views-*.js)
   |  api.get/post/put/patch/del  ->  /api/...
   v
routes/api.js        (Aakrosh)  who may call which URL
   v
controllers/*.js                reads the request, sends the reply. NO SQL here.
   v
services/*.js                   ALL business rules + SQL live here
   v
config/db.js         (Aakrosh)  MySQL  (tables in sql/schema.sql)
```
A feature is "connected" when each layer calls the next one using the exact names in this document.

## 2. Golden rules
1. **Only edit your own files** (list in your START_HERE file). Need something in another person's file? Ask them.
2. **Controllers never write SQL. Only services do.**
3. **Never rename** an API URL, a JSON field, a service function, or a database column without telling the owner and updating this file in the same Pull Request.
4. **Database changes go through Aakrosh** (`sql/schema.sql`). After it changes, everybody re-runs it in Workbench.
5. **Use the shared vocabulary** in section 5 exactly (spelling and capitals). A typo like `Fullfilled` breaks other people's screens.
6. **Before every Pull Request:** `npm start`, then `npm run smoke` in a second terminal. It must say ALL CHECKS PASSED.

## 3. API contract (every URL in the system)
| Method | URL | Who may call | Handler | Owner |
|---|---|---|---|---|
| POST | `/api/auth/register` | public | `Auth.register` | Aakrosh |
| POST | `/api/auth/login` | public | `Auth.login` | Aakrosh |
| POST | `/api/auth/logout` | public | `Auth.logout` | Aakrosh |
| GET | `/api/auth/me` | public | `Auth.me` | Aakrosh |
| PUT | `/api/me` | any logged-in user | `Auth.updateMe` | Aakrosh |
| GET | `/api/users` | Coordinator | `Users.list` | Mahdi |
| GET | `/api/volunteers` | Coordinator | `Users.volunteers` | Mahdi |
| GET | `/api/donors` | Volunteer, Coordinator | `Users.donors` | Mahdi |
| POST | `/api/users/volunteers` | Coordinator | `Users.createVolunteer` | Mahdi |
| PUT | `/api/users/volunteers/:id` | Coordinator | `Users.updateVolunteer` | Mahdi |
| PATCH | `/api/users/:id/approval` | Coordinator | `Users.setApproval` | Mahdi |
| DELETE | `/api/users/:id` | Coordinator | `Users.remove` | Mahdi |
| GET | `/api/categories` | any logged-in user | `Inv.categories` | Mahima |
| POST | `/api/categories` | Coordinator | `Inv.createCategory` | Mahima |
| PUT | `/api/categories/:id` | Coordinator | `Inv.renameCategory` | Mahima |
| DELETE | `/api/categories/:id` | Coordinator | `Inv.deleteCategory` | Mahima |
| GET | `/api/inventory` | Volunteer, Coordinator | `Inv.search` | Mahima |
| POST | `/api/inventory` | Volunteer | `Inv.enter` | Mahima |
| PUT | `/api/inventory/:id` | Volunteer | `Inv.modify` | Mahima |
| DELETE | `/api/inventory/:id` | Volunteer | `Inv.remove` | Mahima |
| POST | `/api/donations` | Donor | `Inv.donate` | Mahima |
| GET | `/api/donations` | Donor | `Inv.donationHistory` | Mahima |
| POST | `/api/hampers` | Recipient | `Hamper.request` | Manjot |
| GET | `/api/hampers/mine` | Recipient | `Hamper.mine` | Manjot |
| GET | `/api/my/distributions` | Recipient | `Hamper.myDistributions` | Manjot |
| GET | `/api/pickups` | Volunteer, Coordinator | `Hamper.pickups` | Manjot |
| PATCH | `/api/pickups/:id/status` | Volunteer | `Hamper.markStatus` | Manjot |
| GET | `/api/hampers/:id` | Volunteer, Coordinator | `Hamper.hamper` | Manjot |
| POST | `/api/hampers/:id/distributions` | Volunteer | `Hamper.addItems` | Manjot |
| GET | `/api/distributions` | Volunteer, Coordinator | `Hamper.searchDistributions` | Manjot |
| PUT | `/api/distributions/:id` | Volunteer | `Hamper.modifyRecord` | Manjot |
| DELETE | `/api/distributions/:id` | Volunteer | `Hamper.deleteRecord` | Manjot |
| GET | `/api/shifts` | Coordinator, Volunteer | `Shifts.list` | Mahdi |
| POST | `/api/shifts` | Coordinator | `Shifts.assign` | Mahdi |
| PATCH | `/api/shifts/:id/complete` | Coordinator | `Shifts.complete` | Mahdi |
| DELETE | `/api/shifts/:id` | Coordinator | `Shifts.cancel` | Mahdi |
| GET | `/api/reports` | Coordinator | `Reports.generate` | Manjot |
| GET | `/api/alerts/expiry` | Coordinator | `Alerts.expiry` | Mahima |
| GET | `/api/alerts/log` | Coordinator | `Alerts.log` | Mahima |
| POST | `/api/alerts/run` | Coordinator | `Alerts.runNow` | Mahima |

Errors always look like `{ "error": "friendly message" }` with a matching HTTP status (400 bad input, 401 not logged in, 403 wrong role, 404 not found, 409 rule conflict).

## 4. Who writes and who reads each table
| Table | Written by | Also read by |
|---|---|---|
| UserAccount | Mahdi (UserService) | Aakrosh (EmailService, auth), Manjot (approval check, reports) |
| Category | Mahima (InventoryService) | Mahima, all item forms |
| InventoryItem | Mahima (intake, edit, archive, RiskStatus) and **Manjot** (QuantityOnHand when items go into / out of a hamper) | everyone |
| Hamper, PickupAppointment, DistributionRecord | Manjot (HamperService, PickupMonitor) | Mahima (AnalyzerEngine reads DistributionRecord for the daily pace), Mahdi (dashboard counts) |
| Shift | Mahdi (ShiftService) | Manjot (a volunteer may only change hampers inside their shift), Aakrosh (EmailService picks volunteers on shift) |
| WasteLog | Mahima (AnalyzerEngine, deleting an item) | Manjot (waste report) |
| AlertLog | Aakrosh (EmailService) | Mahima (Alerts screen) |

## 5. Shared vocabulary (copy exactly)
- Roles: `Donor`, `Recipient`, `Volunteer`, `Coordinator`
- Recipient approval: `Pending`, `Approved`, `Rejected`
- Item risk: `Normal`, `High Waste Risk`, `Expired`
- Hamper status: `Requested`, `Prepared`, `Distributed`, `Cancelled`
- Pickup status: `Scheduled`, `Delayed`, `Fulfilled`, `Missed`
- Distribution record status: `Requested`, `Prepared`, `Distributed`
- Shift status: `Scheduled`, `Completed`, `Cancelled`
- Alert type: `High Waste Risk`, `Expired`, `Delayed`, `Missed`
- Dates travel as text: `YYYY-MM-DD` and `YYYY-MM-DD HH:MM:SS`
- "Delete" never erases: it sets `IsArchived = TRUE` (3-year retention rule)

## 6. Hand-off points between people (the exact seams)
| From -> To | What is passed | Details that must not change |
|---|---|---|
| Mahima `AnalyzerEngine.computeMetrics()` -> Mahdi dashboard & Mahima alerts screen | list of items | each has `ItemID, ItemName, Category, Unit, QuantityOnHand, ExpirationDate, RiskStatus, DUE, IV, EFD, NewStatus` |
| Mahima `AnalyzerEngine` -> Aakrosh `EmailService.sendInventoryAlert(items)` | items newly flagged | needs `ItemID, ItemName, Category, QuantityOnHand, Unit, ExpirationDate, RiskStatus` |
| Manjot `HamperService` and `PickupMonitor` -> Aakrosh `EmailService.sendPickupAlert(appointmentId, newStatus)` | `'Delayed'` or `'Missed'` | called only when the status actually changes |
| Manjot `PickupMonitor` -> Manjot `HamperService.autoSetPickupStatus(id, newStatus, fromStatuses)` | returns `true` only if the row changed | prevents duplicate alerts |
| Mahima `AnalyzerEngine.start()` -> Manjot `PickupMonitor.checkPickups()` | timer every 5 min | Manjot may change the inside, not the name |
| Mahdi `UserService.getById(id)` / `login()` -> Aakrosh `AuthController` | user without `PasswordHash` | login must return `{ UserID, Name, Role, ... }` |
| Everyone -> Aakrosh `validators.js` | `requireText, requireEmail, requireDate...` | add new helpers, never change what an old one returns |
| Mahima `GET /api/inventory` -> Manjot's Prepare-hamper window | items with `QuantityOnHand, RiskStatus, DUE, ExpirationDate` | the window shows "[Use first]" for `High Waste Risk` |
| Mahdi `GET /api/users?status=Pending` + Manjot `GET /api/pickups?open=1` -> Mahdi dashboard counts | arrays | only the length is used |

## 7. How to merge safely (every time)
1. Update your branch from `main`.
2. Do your work in your own files.
3. Reset the database (re-run `sql/schema.sql`), `npm start`, then `npm run smoke`. Expect **ALL CHECKS PASSED**.
4. Open the app and click through your screens as every role that can see them.
5. Commit, push, open a Pull Request. One teammate runs steps 3 and 4 on the merged result before clicking Merge.

## 8. If something breaks after a merge
Run `npm run smoke`. The first FAIL line has an arrow naming the area to check first. Then open the file named in the START_HERE of that person.
