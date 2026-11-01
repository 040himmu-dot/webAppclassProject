// Parent Class
class User {
    login(email, password) {}
    register() {}
    modifyAccount() {}
}

// Child Role Classes (Matching UML Diagram)
class Recipient extends User {
    requestHamper() {}
    schedulePickup() {}
    viewDistributionHistory() {}
    searchDistributionHistory() {}
}

class Donor extends User {
    makeDonation() {}
    searchDonation() {}
    viewDonation() {}
}

class Volunteer extends User {
    markScheduleStatus() {}
    viewDistributionHistory() {}
    viewInventory() {}
    searchDistributionHistory() {}
    searchInventory() {}
}

class Coordinator extends User {
    createUserAccount() {}
    deleteUserAccount() {}
    approveRecipientAccount() {}
    assignVolunteers() {}
    generateReport() {}
}

module.exports = { User, Recipient, Donor, Volunteer, Coordinator };