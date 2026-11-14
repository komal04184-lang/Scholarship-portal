const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');

class StorageService {
  /**
   * Ensure upload directory exists
   */
  static initStorage() {
    const uploadDir = env.upload.dir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  /**
   * Save an uploaded file to local filesystem securely
   * @param {Buffer|string} fileSource - Buffer or temporary file path
   * @param {string} originalFilename - Original uploaded filename
   * @param {string} mimeType - MIME type
   * @returns {Promise<{ storageKey: string, checksum: string, fileSize: number, mimeType: string }>}
   */
  static async saveFile(fileSource, originalFilename, mimeType) {
    StorageService.initStorage();

    const ext = path.extname(originalFilename).toLowerCase();
    const safeUUID = crypto.randomUUID();
    const safeFilename = `${safeUUID}${ext}`;
    const targetPath = path.join(env.upload.dir, safeFilename);

    let fileBuffer;
    if (Buffer.isBuffer(fileSource)) {
      fileBuffer = fileSource;
      await fs.promises.writeFile(targetPath, fileBuffer);
    } else if (typeof fileSource === 'string') {
      // If multer already wrote a temp file, copy/move it
      fileBuffer = await fs.promises.readFile(fileSource);
      await fs.promises.copyFile(fileSource, targetPath);
    } else {
      throw new Error('Invalid file source provided to StorageService');
    }

    // Compute SHA-256 checksum
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const stats = await fs.promises.stat(targetPath);

    logger.info(`Document securely stored: ${safeFilename} (${stats.size} bytes)`);

    return {
      storageKey: safeFilename,
      checksum: hash,
      fileSize: stats.size,
      mimeType,
    };
  }

  /**
   * Safely resolve absolute path and prevent path traversal
   * @param {string} storageKey
   * @returns {string} Absolute validated file path
   */
  static resolveSafePath(storageKey) {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new Error('Invalid storage key');
    }

    // Prevent directory traversal characters
    const sanitizedKey = path.basename(storageKey);
    const resolvedPath = path.resolve(env.upload.dir, sanitizedKey);

    // Verify target path is strictly within upload directory
    const expectedPrefix = path.resolve(env.upload.dir) + path.sep;
    if (!resolvedPath.startsWith(expectedPrefix) && resolvedPath !== path.resolve(env.upload.dir)) {
      throw new Error('Access denied: Unauthorized file path traversal detected');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error('Requested file not found on storage server');
    }

    return resolvedPath;
  }

  /**
   * Open read stream for authorized file delivery
   * @param {string} storageKey
   * @returns {fs.ReadStream}
   */
  static getFileStream(storageKey) {
    const safePath = StorageService.resolveSafePath(storageKey);
    return fs.createReadStream(safePath);
  }

  /**
   * Delete file from storage
   * @param {string} storageKey
   */
  static async deleteFile(storageKey) {
    try {
      const safePath = StorageService.resolveSafePath(storageKey);
      await fs.promises.unlink(safePath);
      logger.info(`Storage file deleted: ${storageKey}`);
      return true;
    } catch (err) {
      logger.warn(`Storage delete warning for ${storageKey}: ${err.message}`);
      return false;
    }
  }
}

module.exports = StorageService;

