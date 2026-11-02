DROP DATABASE IF EXISTS foodbank_db;
CREATE DATABASE foodbank_db;
USE foodbank_db;

CREATE TABLE UserAccount (
    userID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(50) NOT NULL,
    householdSize INT,
    dietaryRestrictions VARCHAR(255),
    emergencyContact VARCHAR(150),
    approvalStatus VARCHAR(30),
    volunteerID INT,
    profileImage VARCHAR(255),
    availability VARCHAR(255),
    IsArchived BOOLEAN DEFAULT FALSE
);

CREATE TABLE InventoryData (
    itemID INT AUTO_INCREMENT PRIMARY KEY,
    itemName VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantityOnHand INT NOT NULL DEFAULT 0,
    quantityReceived INT NOT NULL DEFAULT 0,
    unit VARCHAR(30) NOT NULL,
    donorID INT,
    donationDate DATE NOT NULL,
    expirationDate DATE NOT NULL,
    riskStatus VARCHAR(30) DEFAULT 'Normal',
    IsArchived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (donorID) REFERENCES UserAccount(userID)
);

CREATE TABLE Hamper (
    hamperID INT AUTO_INCREMENT PRIMARY KEY,
    recipientID INT NOT NULL,
    requestDate DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'Requested',
    IsArchived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (recipientID) REFERENCES UserAccount(userID)
);

CREATE TABLE DistributionRecord (
    distributionID INT AUTO_INCREMENT PRIMARY KEY,
    hamperID INT NOT NULL,
    recipientID INT NOT NULL,
    volunteerID INT,
    itemID INT NOT NULL,
    quantityGiven INT NOT NULL,
    requestDate DATE,
    distributionDate DATETIME,
    status VARCHAR(30) DEFAULT 'Requested',
    IsArchived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (hamperID) REFERENCES Hamper(hamperID),
    FOREIGN KEY (recipientID) REFERENCES UserAccount(userID),
    FOREIGN KEY (volunteerID) REFERENCES UserAccount(userID),
    FOREIGN KEY (itemID) REFERENCES InventoryData(itemID)
);

CREATE TABLE PickupAppointment (
    appointmentID INT AUTO_INCREMENT PRIMARY KEY,
    hamperID INT NOT NULL,
    recipientID INT NOT NULL,
    scheduledDateTime DATETIME NOT NULL,
    status VARCHAR(30) DEFAULT 'Scheduled',
    wasDelayed BOOLEAN DEFAULT FALSE,
    IsArchived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (hamperID) REFERENCES Hamper(hamperID),
    FOREIGN KEY (recipientID) REFERENCES UserAccount(userID)
);

CREATE TABLE Shift (
    shiftID INT AUTO_INCREMENT PRIMARY KEY,
    volunteerID INT NOT NULL,
    startDateTime DATETIME NOT NULL,
    endDateTime DATETIME NOT NULL,
    taskDescription VARCHAR(255),
    status VARCHAR(30) DEFAULT 'Scheduled',
    IsArchived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (volunteerID) REFERENCES UserAccount(userID)
);

CREATE TABLE WasteLog (
    wasteID INT AUTO_INCREMENT PRIMARY KEY,
    itemID INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantityWasted INT NOT NULL,
    wasteDate DATE NOT NULL,
    IsArchived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (itemID) REFERENCES InventoryData(itemID)
);

CREATE TABLE AlertLog (
    alertID INT AUTO_INCREMENT PRIMARY KEY,
    alertType VARCHAR(50) NOT NULL,
    itemID INT NULL,
    appointmentID INT NULL,
    sentToUserID INT NOT NULL,
    sentDateTime DATETIME NOT NULL,
    IsArchived BOOLEAN DEFAULT FALSE
);

-- Professional system test users (NO student names) with hashed 'pass123' passwords
INSERT INTO UserAccount (userID, name, email, passwordHash, phone, role, approvalStatus, householdSize) VALUES
(1, 'System Coordinator', 'admin@foodbank.ca', SHA2('pass123', 256), '604-555-0101', 'Coordinator', NULL, NULL),
(2, 'Community Donor', 'donor@foodbank.ca', SHA2('pass123', 256), '604-555-0102', 'Donor', NULL, NULL),
(3, 'Shift Volunteer', 'volunteer@foodbank.ca', SHA2('pass123', 256), '604-555-0103', 'Volunteer', NULL, NULL),
(4, 'Registered Recipient', 'recipient@foodbank.ca', SHA2('pass123', 256), '604-555-0104', 'Recipient', 'Approved', 4);