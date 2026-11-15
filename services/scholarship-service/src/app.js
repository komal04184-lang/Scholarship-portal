const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { buildSchema, graphql } = require('graphql');
const scholarshipRoutes = require('./routes/scholarshipRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const service = require('./services/scholarshipService');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.text({ type: ['text/xml', 'application/xml', 'application/soap+xml'], limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 }));

// ─── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'scholarship-service',
    status: 'running',
    port: process.env.PORT || 3002,
    database: 'scholarship_db',
  });
});

// ─── Swagger UI ───────────────────────────────────────────────────────────────
try {
  const swaggerUi = require('swagger-ui-express');
  const yaml = require('js-yaml');
  const swaggerPath = path.join(__dirname, '../docs/openapi.yaml');
  if (fs.existsSync(swaggerPath)) {
    const swaggerDoc = yaml.load(fs.readFileSync(swaggerPath, 'utf8'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    console.log('Swagger UI available at /api-docs');
  }
} catch (e) {
  console.warn('Swagger UI not available:', e.message);
}

// ─── GraphQL ─────────────────────────────────────────────────────────────────
const gqlSchema = buildSchema(`
  type Scholarship {
    id: ID!
    name: String!
    description: String
    category: String
    amount: Float
    status: String
    deadline: String
    min_cgpa: Float
    max_income: Float
    total_slots: Int
    department: String
    created_at: String
  }
  type Query {
    scholarships(status: String, limit: Int, category: String): [Scholarship!]!
    scholarship(id: ID!): Scholarship
  }
`);

const gqlRootValue = {
  scholarships: async ({ status, limit, category }) => {
    try {
      const result = await service.list({ status, limit: limit || 10, category });
      return result.items;
    } catch (e) {
      throw new Error('Failed to fetch scholarships: ' + e.message);
    }
  },
  scholarship: async ({ id }) => {
    try {
      return await service.getById(id);
    } catch (e) {
      throw new Error('Failed to fetch scholarship: ' + e.message);
    }
  },
};

app.post('/graphql', async (req, res) => {
  try {
    const { query, variables, operationName } = req.body;
    if (!query) return res.status(400).json({ errors: [{ message: 'query is required' }] });
    const result = await graphql({
      schema: gqlSchema,
      source: query,
      rootValue: gqlRootValue,
      variableValues: variables,
      operationName,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ errors: [{ message: e.message }] });
  }
});

app.get('/graphql', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head><title>GraphQL - ApexScholar Scholarship Service</title></head>
<body style="font-family:sans-serif;max-width:800px;margin:2rem auto;padding:1rem">
<h2>🎓 ApexScholar GraphQL Endpoint</h2>
<p>POST to <code>/graphql</code> with <code>Content-Type: application/json</code></p>
<h3>Example Query:</h3>
<pre style="background:#f5f5f5;padding:1rem;border-radius:4px">
POST /graphql
Content-Type: application/json

{
  "query": "{ scholarships(limit: 5) { id name amount status category deadline } }"
}
</pre>
<h3>Available Types:</h3>
<pre style="background:#f5f5f5;padding:1rem;border-radius:4px">
type Scholarship {
  id, name, description, category, amount,
  status, deadline, min_cgpa, max_income,
  total_slots, department, created_at
}
type Query {
  scholarships(status: String, limit: Int, category: String): [Scholarship!]!
  scholarship(id: ID!): Scholarship
}
</pre>
</body></html>`);
});

// ─── SOAP ─────────────────────────────────────────────────────────────────────
const wsdlPath = path.join(__dirname, '../soap/EligibilityService.wsdl');

app.get('/soap/wsdl', (req, res) => {
  if (fs.existsSync(wsdlPath)) {
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    return res.send(fs.readFileSync(wsdlPath, 'utf8'));
  }
  res.status(404).json({ error: 'WSDL not found' });
});

app.post('/soap/eligibility', async (req, res) => {
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});

  const getTag = (tag) => {
    const m = body.match(new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([^<]+)<`, 'i'));
    return m ? m[1].trim() : null;
  };

  const scholarshipId = getTag('scholarshipId');
  const studentCgpa = parseFloat(getTag('studentCgpa') || getTag('cgpa') || '0');
  const familyIncome = parseFloat(getTag('familyIncome') || getTag('family_income') || '0');

  let eligible = true;
  let reason = 'Student meets all eligibility criteria';

  try {
    if (scholarshipId) {
      const scholarship = await service.getById(scholarshipId);
      if (!scholarship) {
        eligible = false;
        reason = `Scholarship ID ${scholarshipId} not found`;
      } else if (!['open', 'published', 'active'].includes((scholarship.status || '').toLowerCase())) {
        eligible = false;
        reason = `Scholarship is ${scholarship.status} and not accepting applications`;
      } else if (scholarship.min_cgpa && studentCgpa < parseFloat(scholarship.min_cgpa)) {
        eligible = false;
        reason = `CGPA ${studentCgpa} is below minimum required CGPA of ${scholarship.min_cgpa}`;
      } else if (scholarship.max_income && familyIncome > parseFloat(scholarship.max_income)) {
        eligible = false;
        reason = `Family income ₹${familyIncome} exceeds maximum allowed ₹${scholarship.max_income}`;
      }
    }
  } catch (e) {
    eligible = false;
    reason = 'Error checking eligibility: ' + e.message;
  }

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://apexscholar.local/eligibility">
  <soap:Body>
    <tns:CheckEligibilityResponse>
      <tns:eligible>${eligible}</tns:eligible>
      <tns:reason>${reason.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</tns:reason>
      <tns:scholarshipId>${scholarshipId || ''}</tns:scholarshipId>
      <tns:checkedAt>${new Date().toISOString()}</tns:checkedAt>
    </tns:CheckEligibilityResponse>
  </soap:Body>
</soap:Envelope>`);
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/scholarships', scholarshipRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
