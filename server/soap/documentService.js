const DocumentModel = require('../models/documentModel');

const documentService = {
  DocumentPort: {
    GetDocumentStatus: async (args) => {
      const docId = args.document_id;
      const doc = await DocumentModel.findById(docId);
      if (!doc) {
        return { status: 'NOT_FOUND', document: null };
      }
      return {
        status: 'SUCCESS',
        document: {
          document_id: doc.document_id || doc.application_document_id,
          application_id: doc.application_id,
          document_name: doc.document_name || doc.original_name,
          verification_status: doc.verification_status,
          uploaded_at: doc.uploaded_at ? doc.uploaded_at.toISOString() : '',
        },
      };
    },
  },
};

module.exports = documentService;
