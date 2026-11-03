-- Sample data so the reports show something. Run in MySQL Workbench AFTER schema.sql.
USE foodbank_db;

INSERT IGNORE INTO InventoryData (itemID, itemName, category, quantityOnHand, quantityReceived, unit, donorID, donationDate, expirationDate) VALUES
(101, 'Canned Beans', 'Canned', 50, 100, 'cans',   2, '2026-10-05', '2027-06-01'),
(102, 'Milk',         'Dairy',  10,  40, 'litres', 2, '2026-10-12', '2026-11-10'),
(103, 'Rice',         'Grains', 30,  60, 'kg',     2, '2026-10-20', '2027-03-01'),
(104, 'Yogurt',       'Dairy',   0,  20, 'cups',   2, '2026-10-02', '2026-10-15');

INSERT IGNORE INTO Hamper (hamperID, recipientID, requestDate, status) VALUES
(101, 4, '2026-10-14', 'Distributed'),
(102, 4, '2026-10-28', 'Requested');

INSERT IGNORE INTO DistributionRecord (distributionID, hamperID, recipientID, volunteerID, itemID, quantityGiven, requestDate, distributionDate, status) VALUES
(101, 101, 4, 3, 101, 5, '2026-10-14', '2026-10-15 10:00:00', 'Distributed'),
(102, 101, 4, 3, 102, 2, '2026-10-14', '2026-10-15 10:00:00', 'Distributed');

INSERT IGNORE INTO PickupAppointment (appointmentID, hamperID, recipientID, scheduledDateTime, status, wasDelayed) VALUES
(101, 101, 4, '2026-10-15 10:00:00', 'Fulfilled', TRUE),
(102, 102, 4, '2026-10-29 14:00:00', 'Missed',    TRUE);

INSERT IGNORE INTO WasteLog (wasteID, itemID, category, quantityWasted, wasteDate) VALUES
(101, 104, 'Dairy',  20, '2026-10-16'),
(102, 102, 'Dairy',  10, '2026-10-20'),
(103, 101, 'Canned',  3, '2026-10-22');