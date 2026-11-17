const crypto = require('crypto');
const service = require('../services/scholarshipService');
const { validateScholarship } = require('../utils/validation');

function makeEtag(data) {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toXml(items) {
  const rows = Array.isArray(items) ? items : [items];
  const inner = rows.map(s => `  <scholarship>
    <id>${escapeXml(s.id)}</id>
    <name>${escapeXml(s.name)}</name>
    <description>${escapeXml(s.description)}</description>
    <category>${escapeXml(s.category)}</category>
    <amount>${s.amount}</amount>
    <status>${escapeXml(s.status)}</status>
    <deadline>${escapeXml(s.deadline)}</deadline>
    <min_cgpa>${s.min_cgpa || ''}</min_cgpa>
    <max_income>${s.max_income || ''}</max_income>
    <total_slots>${s.total_slots || ''}</total_slots>
    <department>${escapeXml(s.department)}</department>
  </scholarship>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<scholarships>\n${inner}\n</scholarships>`;
}

async function list(req, res, next) {
  try {
    const data = await service.list(req.query);
    const etag = `"${makeEtag(data)}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    if (req.headers.accept && req.headers.accept.includes('application/xml')) {
      res.setHeader('Content-Type', 'application/xml');
      return res.send(toXml(data.items));
    }
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
}

async function getOne(req, res, next) {
  try {
    const item = await service.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Scholarship not found' });
    const etag = `"${makeEtag(item)}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    if (req.headers.accept && req.headers.accept.includes('application/xml')) {
      res.setHeader('Content-Type', 'application/xml');
      return res.send(toXml(item));
    }
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const errors = validateScholarship(req.body);
    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errors.join(', ')}`,
        errors,
        error: errors.join(', '),
      });
    }
    const item = await service.create(req.body);
    res.status(201).json({ success: true, message: 'Scholarship created', data: item });
  } catch (error) { next(error); }
}

async function update(req, res, next) {
  try {
    const errors = validateScholarship(req.body, true);
    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errors.join(', ')}`,
        errors,
        error: errors.join(', '),
      });
    }
    const item = await service.update(req.params.id, req.body);
    if (!item) return res.status(404).json({ success: false, message: 'Scholarship not found' });
    res.json({ success: true, message: 'Scholarship updated', data: item });
  } catch (error) { next(error); }
}

async function changeStatus(req, res, next) {
  try {
    // DB accepts: draft, published, paused, closed, archived (open/active map to published)
    const rawStatus = (req.body.status || '').toLowerCase();
    const statusMap = { open: 'published', active: 'published' };
    const mappedStatus = statusMap[rawStatus] || rawStatus;
    const allowed = ['draft', 'published', 'paused', 'closed', 'archived', 'open', 'active'];
    if (!allowed.includes(rawStatus)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
    }
    const item = await service.updateStatus(req.params.id, mappedStatus, req.user, req.body.remarks);
    if (!item) return res.status(404).json({ success: false, message: 'Scholarship not found' });
    res.json({ success: true, message: `Scholarship status updated to ${mappedStatus}`, data: item });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await service.remove(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Scholarship not found' });
    if (result.archived) {
      return res.json({ success: true, archived: true, message: result.message, data: { status: 'archived' } });
    }
    res.json({ success: true, message: 'Scholarship deleted successfully' });
  } catch (error) { next(error); }
}

module.exports = { list, getOne, create, update, changeStatus, remove };
