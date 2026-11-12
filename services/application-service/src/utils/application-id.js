const crypto = require('crypto');

/**
 * Generates a human-readable application number.
 * e.g., APP-2026-00123 or APP-2026-K9M2P
 * @param {number|string} [sequenceId] - Optional auto-increment ID
 * @returns {string} Application number
 */
function generateApplicationNumber(sequenceId) {
  const year = new Date().getFullYear();
  if (sequenceId) {
    return `APP-${year}-${String(sequenceId).padStart(5, '0')}`;
  }
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `APP-${year}-${randomPart}`;
}

module.exports = {
  generateApplicationNumber,
};

