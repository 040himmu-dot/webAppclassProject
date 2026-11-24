Online Food Bank Management System - Team 3

 Project Overview

This is the backend repository for the Online Food Bank Management System. Based on our Software Design Document (SDD) and Functionality Option 1, this system supports four user roles:

Coordinator: Manages users, inventory categories, and generates monthly/annual reports.

Donor: Creates donations and views their own donation history.

Volunteer: Processes inventory intake and fulfills scheduled hamper pickups.

Recipient: Requests food hampers and schedules pickup appointments.

Current Progress (Draft Review Status)

For our initial draft review, we have successfully laid the core foundation of the application so that all teammates can now begin working on their individual features independently:

Database Schema Setup: Created the complete MySQL database (foodbank_db) with all required tables, attributes, and relationships.

Secure Authentication: Implemented the /api/login system using secure SHA-256 password hashing to protect user data.

Automated AI Analyzer (Background Engine):

Programmed the shelf-life trend detection (calculating DUE, IV, and EFD) to flag items at high waste risk.

Programmed the automated pickup monitor to flag appointments as Delayed (>30 mins) or Missed (>120 mins).

Modular Folder Architecture: Segmented the project into modular Controller files so team members can code at the same time without overwriting each other's work.

Repository Guide (What Each File Does)

schema.sql: The database blueprint. Run this in MySQL Workbench to create the tables and our 4 test users.

app.js: The main server file. It handles logins and directs traffic to the correct folders. (Note: Team members should not edit this file directly).

services/AnalyzerEngine.js: The background calculator that runs the AI math for expiration dates and pickup delays.

controllers/: This folder contains the individual workspaces (like InventoryController.js and HamperController.js). This is where the rest of the team will write their specific functionality for Option 1.

public/: This folder is where we will place all of our frontend HTML, CSS, and UI files.

How to Run the Project Locally

1. Set up the Database:

Open MySQL Workbench.

Open schema.sql from this folder and execute it.

Test Accounts created (Password for all is pass123): admin@foodbank.ca, donor@foodbank.ca, volunteer@foodbank.ca, recipient@foodbank.ca.

2. Start the Server:

Open your terminal in this folder.

Run npm install to download dependencies (Express, Crypto).

Run node app.js to start the backend. The server will run on http://localhost:3000.

Next Steps:

Moving forward, our team will implement the remaining Option 1 functionalities within their assigned controllers:

Inventory Management: Volunteer intake routes and Coordinator category management.

Distribution Management: Recipient hamper requests and Volunteer fulfillment routes.

Reporting: Coordinator dashboard logic for Donation & Inventory Waste summaries.
