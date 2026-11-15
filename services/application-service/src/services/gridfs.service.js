/**
 * GridFS Service — MongoDB GridFS document storage for ApexScholar
 * Lazy-connects on first use; falls back gracefully if MongoDB is unavailable.
 */
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');

let _client = null;
let _bucket = null;
let _connecting = false;

async function getConnection() {
  if (_client) {
    try {
      await _client.db('admin').command({ ping: 1 });
      return { client: _client, bucket: _bucket };
    } catch (_) {
      _client = null;
      _bucket = null;
    }
  }

  if (_connecting) {
    // Wait for existing connection attempt
    await new Promise(resolve => setTimeout(resolve, 500));
    if (_client) return { client: _client, bucket: _bucket };
  }

  _connecting = true;
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    const dbName = process.env.MONGODB_DATABASE || 'scholarship_documents';
    _client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await _client.connect();
    const db = _client.db(dbName);
    _bucket = new GridFSBucket(db, { bucketName: 'documents' });
    console.log(`[GridFS] Connected to MongoDB: ${uri}/${dbName}`);
    return { client: _client, bucket: _bucket };
  } finally {
    _connecting = false;
  }
}

/**
 * Upload a file buffer to GridFS
 * @param {Buffer} fileBuffer - File contents
 * @param {string} originalFilename - Original file name
 * @param {string} mimeType - MIME type
 * @param {object} metadata - Additional metadata
 * @returns {{ gridfsId: string, filename: string, mimeType: string, fileSize: number }}
 */
async function uploadToGridFS(fileBuffer, originalFilename, mimeType, metadata = {}) {
  const { bucket } = await getConnection();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(originalFilename, {
      contentType: mimeType,
      metadata: { mimeType, originalFilename, uploadedAt: new Date().toISOString(), ...metadata },
    });
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        gridfsId: uploadStream.id.toString(),
        filename: uploadStream.filename,
        mimeType,
        fileSize: fileBuffer.length,
      });
    });
    uploadStream.end(fileBuffer);
  });
}

/**
 * Download a file from GridFS by its ObjectId
 * @param {string} gridfsId - ObjectId string
 * @returns {{ stream: GridFSBucketReadStream, file: object }}
 */
async function downloadFromGridFS(gridfsId) {
  const { bucket } = await getConnection();
  const fileId = new ObjectId(gridfsId);
  const files = await bucket.find({ _id: fileId }).toArray();
  if (!files || files.length === 0) {
    const err = new Error('File not found in GridFS');
    err.statusCode = 404;
    throw err;
  }
  const downloadStream = bucket.openDownloadStream(fileId);
  return { stream: downloadStream, file: files[0] };
}

/**
 * Delete a file from GridFS
 * @param {string} gridfsId
 */
async function deleteFromGridFS(gridfsId) {
  try {
    const { bucket } = await getConnection();
    const fileId = new ObjectId(gridfsId);
    await bucket.delete(fileId);
    return true;
  } catch (err) {
    console.warn('[GridFS] Delete warning:', err.message);
    return false;
  }
}

/**
 * Close the MongoDB connection
 */
async function closeConnection() {
  if (_client) {
    await _client.close();
    _client = null;
    _bucket = null;
  }
}

/**
 * Check if GridFS is available
 */
async function isAvailable() {
  try {
    await getConnection();
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  uploadToGridFS,
  downloadFromGridFS,
  deleteFromGridFS,
  closeConnection,
  getConnection,
  isAvailable,
};
