-- =====================================================================
-- Online Food Bank Management System - Team 3
-- Database schema + sample data (follows SDD section 3.2, Information viewpoint)
-- Run this whole file in MySQL Workbench (Ctrl+Shift+Enter).
-- WARNING: it DROPS and re-creates foodbank_db, so any old data is lost.
-- Test accounts: password for ALL of them is  pass123
-- =====================================================================
DROP DATABASE IF EXISTS foodbank_db;
CREATE DATABASE foodbank_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE foodbank_db;

-- ---------- User Account (all four roles) ----------
CREATE TABLE UserAccount (
  UserID              INT AUTO_INCREMENT PRIMARY KEY,
  Name                VARCHAR(100) NOT NULL,
  Email               VARCHAR(150) NOT NULL UNIQUE,
  PasswordHash        VARCHAR(100) NOT NULL,
  Role                ENUM('Donor','Recipient','Volunteer','Coordinator') NOT NULL,
  Phone               VARCHAR(30)  NOT NULL,
  ApprovalStatus      ENUM('Pending','Approved','Rejected') NULL,   -- Recipients only
  HouseholdSize       INT NULL,                                     -- Recipients only
  DietaryRestrictions VARCHAR(255) NULL,                            -- Recipients only
  EmergencyContact    VARCHAR(150) NULL,                            -- Recipients only
  ProfileImage        VARCHAR(255) NULL,                            -- Volunteers only
  Availability        VARCHAR(255) NULL,                            -- Volunteers only, e.g. "Mon-Fri 09:00-17:00, Sat 10:00-14:00"
  IsArchived          BOOLEAN NOT NULL DEFAULT FALSE,
  CreatedAt           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- Food categories (managed by Coordinators) ----------
CREATE TABLE Category (
  CategoryID   INT AUTO_INCREMENT PRIMARY KEY,
  CategoryName VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ---------- Inventory Item (a donated item) ----------
CREATE TABLE InventoryItem (
  ItemID           INT AUTO_INCREMENT PRIMARY KEY,
  ItemName         VARCHAR(100) NOT NULL,
  Category         VARCHAR(60)  NOT NULL,
  QuantityOnHand   INT NOT NULL,
  QuantityReceived INT NOT NULL,
  Unit             VARCHAR(20)  NOT NULL,
  DonorID          INT NULL,
  DonationDate     DATE NOT NULL,
  ExpirationDate   DATE NOT NULL,
  RiskStatus       ENUM('Normal','High Waste Risk','Expired') NOT NULL DEFAULT 'Normal',
  IsArchived       BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_item_category FOREIGN KEY (Category) REFERENCES Category(CategoryName) ON UPDATE CASCADE,
  CONSTRAINT fk_item_donor    FOREIGN KEY (DonorID)  REFERENCES UserAccount(UserID),
  CONSTRAINT chk_qty_onhand   CHECK (QuantityOnHand >= 0),
  CONSTRAINT chk_qty_received CHECK (QuantityReceived >= 0),
  CONSTRAINT chk_expiry       CHECK (ExpirationDate >= DonationDate),
  INDEX idx_item_expiry (ExpirationDate),
  INDEX idx_item_category (Category)
) ENGINE=InnoDB;

-- ---------- Hamper ----------
CREATE TABLE Hamper (
  HamperID    INT AUTO_INCREMENT PRIMARY KEY,
  RecipientID INT NOT NULL,
  RequestDate DATE NOT NULL,
  Status      ENUM('Requested','Prepared','Distributed','Cancelled') NOT NULL DEFAULT 'Requested',
  IsArchived  BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (RecipientID) REFERENCES UserAccount(UserID)
) ENGINE=InnoDB;

-- ---------- Distribution Record (one row per item in a hamper) ----------
CREATE TABLE DistributionRecord (
  DistributionID   INT AUTO_INCREMENT PRIMARY KEY,
  HamperID         INT NOT NULL,
  RecipientID      INT NOT NULL,
  VolunteerID      INT NULL,
  ItemID           INT NOT NULL,
  QuantityGiven    INT NOT NULL,
  DistributionDate DATETIME NOT NULL,
  Status           ENUM('Requested','Prepared','Distributed') NOT NULL DEFAULT 'Prepared',
  IsArchived       BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (HamperID)    REFERENCES Hamper(HamperID),
  FOREIGN KEY (RecipientID) REFERENCES UserAccount(UserID),
  FOREIGN KEY (VolunteerID) REFERENCES UserAccount(UserID),
  FOREIGN KEY (ItemID)      REFERENCES InventoryItem(ItemID),
  CONSTRAINT chk_qty_given CHECK (QuantityGiven > 0),
  INDEX idx_dist_date (DistributionDate)
) ENGINE=InnoDB;

-- ---------- Pickup Appointment ----------
CREATE TABLE PickupAppointment (
  AppointmentID     INT AUTO_INCREMENT PRIMARY KEY,
  HamperID          INT NOT NULL,
  RecipientID       INT NOT NULL,
  ScheduledDateTime DATETIME NOT NULL,
  Status            ENUM('Scheduled','Delayed','Fulfilled','Missed') NOT NULL DEFAULT 'Scheduled',
  WasDelayed        BOOLEAN NOT NULL DEFAULT FALSE,
  IsArchived        BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (HamperID)    REFERENCES Hamper(HamperID),
  FOREIGN KEY (RecipientID) REFERENCES UserAccount(UserID),
  INDEX idx_pickup_time (ScheduledDateTime)
) ENGINE=InnoDB;

-- ---------- Shift (volunteer assignment made by a Coordinator) ----------
CREATE TABLE Shift (
  ShiftID         INT AUTO_INCREMENT PRIMARY KEY,
  VolunteerID     INT NOT NULL,
  AssignedBy      INT NULL,
  StartDateTime   DATETIME NOT NULL,
  EndDateTime     DATETIME NOT NULL,
  TaskDescription VARCHAR(255) NOT NULL,
  Status          ENUM('Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
  IsArchived      BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (VolunteerID) REFERENCES UserAccount(UserID),
  FOREIGN KEY (AssignedBy)  REFERENCES UserAccount(UserID)
) ENGINE=InnoDB;

-- ---------- Waste Log ----------
CREATE TABLE WasteLog (
  WasteID        INT AUTO_INCREMENT PRIMARY KEY,
  ItemID         INT NOT NULL,
  Category       VARCHAR(60) NOT NULL,
  Unit           VARCHAR(20) NOT NULL,
  QuantityWasted INT NOT NULL,
  WasteDate      DATE NOT NULL,
  Reason         VARCHAR(100) NOT NULL DEFAULT 'Expired',
  IsArchived     BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (ItemID) REFERENCES InventoryItem(ItemID),
  CONSTRAINT chk_qty_wasted CHECK (QuantityWasted > 0)
) ENGINE=InnoDB;

-- ---------- Alert Log ----------
CREATE TABLE AlertLog (
  AlertID       INT AUTO_INCREMENT PRIMARY KEY,
  AlertType     ENUM('High Waste Risk','Expired','Delayed','Missed') NOT NULL,
  ItemID        INT NULL,
  AppointmentID INT NULL,
  SentToUserID  INT NOT NULL,
  SentDateTime  DATETIME NOT NULL,
  Delivery      VARCHAR(20) NOT NULL DEFAULT 'sent',   -- sent | simulated | failed
  Message       VARCHAR(500) NULL,
  IsArchived    BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (ItemID)        REFERENCES InventoryItem(ItemID),
  FOREIGN KEY (AppointmentID) REFERENCES PickupAppointment(AppointmentID),
  FOREIGN KEY (SentToUserID)  REFERENCES UserAccount(UserID)
) ENGINE=InnoDB;

-- =====================================================================
-- SAMPLE DATA (password for every account = pass123)
-- =====================================================================
SET @pw = '$2a$10$T2FbILEtKVVWsr5e4ksDYek6ZX7gFsSy37k7usI.NeLHBdNLDhW3W';

INSERT INTO UserAccount (Name, Email, PasswordHash, Role, Phone, ApprovalStatus, HouseholdSize, DietaryRestrictions, EmergencyContact, Availability) VALUES
('Casey Coordinator', 'admin@foodbank.ca',     @pw, 'Coordinator', '604-555-0101', NULL, NULL, NULL, NULL, NULL),
('Dana Donor',        'donor@foodbank.ca',     @pw, 'Donor',       '604-555-0102', NULL, NULL, NULL, NULL, NULL),
('Victor Volunteer',  'volunteer@foodbank.ca', @pw, 'Volunteer',   '604-555-0103', NULL, NULL, NULL, NULL, 'Daily 00:00-23:59'),
('Riley Recipient',   'recipient@foodbank.ca', @pw, 'Recipient',   '604-555-0104', 'Approved', 4, 'Peanut allergy', 'Sam Recipient 604-555-0199', NULL),
('Pat Pending',       'pending@foodbank.ca',   @pw, 'Recipient',   '604-555-0105', 'Pending',  2, 'None',           'Alex Pending 604-555-0188',   NULL);

INSERT INTO Category (CategoryName) VALUES ('Canned'),('Dairy'),('Produce'),('Grains'),('Bakery'),('Frozen'),('Beverages');

-- Inventory: a mix of healthy, near-expiry and slow-moving stock so the AI dashboard has something to show
INSERT INTO InventoryItem (ItemName, Category, QuantityOnHand, QuantityReceived, Unit, DonorID, DonationDate, ExpirationDate) VALUES
('Canned tomatoes', 'Canned',  120, 150, 'cans',    2, CURDATE() - INTERVAL 20 DAY, CURDATE() + INTERVAL 400 DAY),
('Whole milk',      'Dairy',    30,  40, 'litres',  2, CURDATE() - INTERVAL 3 DAY,  CURDATE() + INTERVAL 5 DAY),
('Bananas',         'Produce',  25,  25, 'kg',      2, CURDATE() - INTERVAL 2 DAY,  CURDATE() + INTERVAL 20 DAY),
('Rice',            'Grains',   60,  60, 'kg',      2, CURDATE() - INTERVAL 10 DAY, CURDATE() + INTERVAL 300 DAY),
('Yogurt',          'Dairy',    20,  20, 'tubs',    2, CURDATE() - INTERVAL 12 DAY, CURDATE() - INTERVAL 1 DAY);

-- Past distributions (gives the AI engine some inventory velocity to work with)
INSERT INTO Hamper (RecipientID, RequestDate, Status) VALUES (4, CURDATE() - INTERVAL 5 DAY, 'Distributed');
INSERT INTO PickupAppointment (HamperID, RecipientID, ScheduledDateTime, Status, WasDelayed) VALUES
(1, 4, NOW() - INTERVAL 5 DAY, 'Fulfilled', FALSE);
INSERT INTO DistributionRecord (HamperID, RecipientID, VolunteerID, ItemID, QuantityGiven, DistributionDate, Status) VALUES
(1, 4, 3, 1, 30, NOW() - INTERVAL 5 DAY, 'Distributed'),
(1, 4, 3, 2, 10, NOW() - INTERVAL 5 DAY, 'Distributed'),
(1, 4, 3, 4, 10, NOW() - INTERVAL 5 DAY, 'Distributed');

-- A shift for the sample volunteer covering today (so the volunteer can prepare hampers right away)
INSERT INTO Shift (VolunteerID, AssignedBy, StartDateTime, EndDateTime, TaskDescription) VALUES
(3, 1, CONCAT(CURDATE(), ' 00:00:00'), CONCAT(CURDATE(), ' 23:59:00'), 'Hamper preparation and pickups'),
(3, 1, CONCAT(CURDATE() + INTERVAL 1 DAY, ' 00:00:00'), CONCAT(CURDATE() + INTERVAL 1 DAY, ' 23:59:00'), 'Hamper preparation and pickups');
