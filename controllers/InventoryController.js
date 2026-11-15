const InventoryService = require('../services/InventoryService');

// categories
exports.categories = async (req, res) => res.json(await InventoryService.listCategories());
exports.createCategory = async (req, res) => res.status(201).json(await InventoryService.createCategory(req.body.CategoryName));
exports.renameCategory = async (req, res) => res.json(await InventoryService.renameCategory(req.params.id, req.body.CategoryName));
exports.deleteCategory = async (req, res) => { await InventoryService.deleteCategory(req.params.id); res.json({ message: 'Category deleted.' }); };

// inventory (Volunteer writes, Coordinator reads)
exports.search = async (req, res) => res.json(await InventoryService.searchInventory(req.query));
exports.enter = async (req, res) => {
  const ids = await InventoryService.enterItems(req.body.items, req.body.DonorID || null);
  res.status(201).json({ message: `${ids.length} item(s) added to inventory.`, ids });
};
exports.modify = async (req, res) => res.json({ message: 'Item updated.', item: await InventoryService.modifyItem(req.params.id, req.body) });
exports.remove = async (req, res) => {
  await InventoryService.deleteItem(req.params.id, { recordWaste: req.body && req.body.recordWaste === true });
  res.json({ message: 'Item removed from active inventory (kept in the archive).' });
};

// donations (Donor)
exports.donate = async (req, res) => {
  const ids = await InventoryService.enterItems(req.body.items, req.session.user.id);
  res.status(201).json({ message: 'Thank you! Your donation was recorded.', ids });
};
exports.donationHistory = async (req, res) =>
  res.json(await InventoryService.searchDonationHistory(req.session.user.id, req.query));
