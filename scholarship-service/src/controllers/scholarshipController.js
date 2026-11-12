const service = require("../services/scholarshipService");
const { validateScholarship } = require("../utils/validation");

async function list(req, res, next) {
  try {
    const data = await service.list(req.query);
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
}

async function getOne(req, res, next) {
  try {
    const item = await service.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Scholarship not found" });
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const errors = validateScholarship(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: "Validation failed", errors });
    const item = await service.create(req.body);
    res.status(201).json({ success: true, message: "Scholarship created", data: item });
  } catch (error) { next(error); }
}

async function update(req, res, next) {
  try {
    const errors = validateScholarship(req.body, true);
    if (errors.length) return res.status(400).json({ success: false, message: "Validation failed", errors });
    const item = await service.update(req.params.id, req.body);
    if (!item) return res.status(404).json({ success: false, message: "Scholarship not found" });
    res.json({ success: true, message: "Scholarship updated", data: item });
  } catch (error) { next(error); }
}

async function changeStatus(req, res, next) {
  try {
    const allowed = ["open", "closed", "draft"];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(", ")}` });
    }
    const item = await service.updateStatus(req.params.id, req.body.status);
    if (!item) return res.status(404).json({ success: false, message: "Scholarship not found" });
    res.json({ success: true, message: "Scholarship status updated", data: item });
  } catch (error) { next(error); }
}

async function remove(req, res, next) {
  try {
    const deleted = await service.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Scholarship not found" });
    res.json({ success: true, message: "Scholarship deleted" });
  } catch (error) { next(error); }
}

module.exports = { list, getOne, create, update, changeStatus, remove };
