const InventoryService = require('../services/InventoryService');

// --------- Categories Operations -------------

// Retrieve all food categories.
exports.categories = async (req, res) => res.json(await InventoryService.listCategories());

// Create a new food category.
exports.createCategory = async (req, res) => res.status(201).json(await InventoryService.createCategory(req.body.CategoryName));

// Rename an existing food category by ID.
exports.renameCategory = async (req, res) => res.json(await InventoryService.renameCategory(req.params.id, req.body.CategoryName));

// Delete a food category by ID.
exports.deleteCategory = async (req, res) => { await InventoryService.deleteCategory(req.params.id); res.json({ message: 'Category deleted.' }); };

// ------ Inventory Operations (Volunteer writes, Coordinator reads) ----------

// Search and list active inventory items using optional query filters.
exports.search = async (req, res) => res.json(await InventoryService.searchInventory(req.query));

// Enter one or more inventory items, optionally linked to a Donor ID.
exports.enter = async (req, res) => {
  const ids = await InventoryService.enterItems(req.body.items, req.body.DonorID || null);
  res.status(201).json({ message: `${ids.length} item(s) added to inventory.`, ids });
};

// Update an existing inventory item's details by ID.
exports.modify = async (req, res) => res.json({ message: 'Item updated.', item: await InventoryService.modifyItem(req.params.id, req.body) });

// Soft-delete an inventory item from active inventory (archiving it), optionally recording waste if requested.
exports.remove = async (req, res) => {
  await InventoryService.deleteItem(req.params.id, { recordWaste: req.body && req.body.recordWaste === true });
  res.json({ message: 'Item removed from active inventory (kept in the archive).' });
};

// ----------- Donation Operations (Donor) ---------

// Record a donation submitted by the logged-in Donor into inventory.
exports.donate = async (req, res) => {
  const ids = await InventoryService.enterItems(req.body.items, req.session.user.id);
  res.status(201).json({ message: 'Thank you! Your donation was recorded.', ids });
};
// Retrieve the logged-in Donor's donation history matching optional query filters.
exports.donationHistory = async (req, res) =>
  res.json(await InventoryService.searchDonationHistory(req.session.user.id, req.query));
