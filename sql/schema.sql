CREATE DATABASE IF NOT EXISTS foodbank_db;
USE foodbank_db;

CREATE TABLE IF NOT EXISTS UserAccount (
    userID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
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

CREATE TABLE IF NOT EXISTS InventoryData (
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

CREATE TABLE IF NOT EXISTS Hamper (
    hamperID INT AUTO_INCREMENT PRIMARY KEY,
    recipientID INT NOT NULL,
    requestDate DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'Requested',
    IsArchived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (recipientID) REFERENCES UserAccount(userID)
);

CREATE TABLE IF NOT EXISTS DistributionRecord (
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

CREATE TABLE IF NOT EXISTS PickupAppointment (
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

CREATE TABLE IF NOT EXISTS Shift (
    shiftID INT AUTO_INCREMENT PRIMARY KEY,
    volunteerID INT NOT NULL,
    startDateTime DATETIME NOT NULL,
    endDateTime DATETIME NOT NULL,
    taskDescription VARCHAR(255),
    status VARCHAR(30) DEFAULT 'Scheduled',
    IsArchived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (volunteerID) REFERENCES UserAccount(userID)
);

CREATE TABLE IF NOT EXISTS WasteLog (
    wasteID INT AUTO_INCREMENT PRIMARY KEY,
    itemID INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantityWasted INT NOT NULL,
    wasteDate DATE NOT NULL,
    IsArchived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (itemID) REFERENCES InventoryData(itemID)
);

CREATE TABLE IF NOT EXISTS AlertLog (
    alertID INT AUTO_INCREMENT PRIMARY KEY,
    alertType VARCHAR(50) NOT NULL,
    itemID INT NULL,
    appointmentID INT NULL,
    sentToUserID INT NOT NULL,
    sentDateTime DATETIME NOT NULL,
    IsArchived BOOLEAN DEFAULT FALSE
);

INSERT IGNORE INTO UserAccount (userID, name, email, password, phone, role, approvalStatus, householdSize) VALUES
(1, 'Aakrosh Admin', 'admin@foodbank.ca', 'pass123', '604-111-1111', 'Coordinator', NULL, NULL),
(2, 'Mahima Donor', 'donor@foodbank.ca', 'pass123', '604-222-2222', 'Donor', NULL, NULL),
(3, 'Manjot Volunteer', 'volunteer@foodbank.ca', 'pass123', '604-333-3333', 'Volunteer', NULL, NULL),
(4, 'Mahdi Recipient', 'recipient@foodbank.ca', 'pass123', '604-444-4444', 'Recipient', 'Approved', 4);
