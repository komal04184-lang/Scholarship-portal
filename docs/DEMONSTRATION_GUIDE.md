# ApexScholar — Demonstration & cURL Runbook

This guide contains executable demonstration commands for the Online Scholarship Portal.
All commands use the API Gateway on port `3000` (or direct ports for protocol-specific interfaces like SOAP/GraphQL).

---

## 1. System Health & Gateway Monitoring

### Health Check across all Microservices
```bash
curl -s http://localhost:3000/health
```

---

## 2. Student Authentication & Session Lifecycle

### Register a New Student
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demostudent2026",
    "email": "demo.student2026@example.com",
    "password": "Password123!",
    "role": "student"
  }'
```

### Student Login
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo.student2026@example.com",
    "password": "Password123!"
  }'
```
*Save the returned `token` as `$STUDENT_TOKEN` and `refreshToken` as `$REFRESH_TOKEN`.*

### Get Student Profile
```bash
curl -s http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

### Refresh Token (Rotation)
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'
```

---

## 3. Scholarship Catalog (REST, SOAP, GraphQL)

### List All Scholarships (REST)
```bash
curl -s http://localhost:3000/api/v1/scholarships
```

### Filter Scholarships by Category and Status (REST)
```bash
curl -s "http://localhost:3000/api/v1/scholarships?status=open&category=Merit"
```

### Get Single Scholarship by ID (REST)
```bash
curl -s http://localhost:3000/api/v1/scholarships/1
```

### Query Scholarships via GraphQL
```bash
curl -s -X POST http://localhost:3002/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ scholarships(limit: 5) { id name amount status min_cgpa max_income } }"
  }'
```

### Query Single Scholarship Details via GraphQL
```bash
curl -s -X POST http://localhost:3002/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ scholarship(id: \"1\") { id name amount status deadline } }"
  }'
```

### Inspect SOAP WSDL Contract
```bash
curl -s http://localhost:3002/soap/wsdl
```

### Evaluate Eligibility via SOAP Web Service
```bash
curl -s -X POST http://localhost:3002/soap/eligibility \
  -H "Content-Type: text/xml; charset=utf-8" \
  -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://apexscholar.local/soap/scholarship">
   <soapenv:Header/>
   <soapenv:Body>
      <sch:CheckEligibilityRequest>
         <sch:scholarshipId>1</sch:scholarshipId>
         <sch:cgpa>8.5</sch:cgpa>
         <sch:familyIncome>150000</sch:familyIncome>
      </sch:CheckEligibilityRequest>
   </soapenv:Body>
</soapenv:Envelope>'
```

---

## 4. Application Submission & Document Processing

### Submit Scholarship Application
```bash
curl -s -X POST http://localhost:3000/api/v1/applications \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "scholarship_id": "1",
    "statement": "Application for Merit scholarship support.",
    "sop": "Statement of Purpose describing academic qualifications.",
    "cgpa": 8.5,
    "family_income": 150000,
    "annual_income": 150000
  }'
```
*Save the returned application ID as `$APP_ID`.*

### Upload Verified Document (PDF with valid magic bytes `%PDF-`)
```bash
curl -s -X POST http://localhost:3000/api/v1/applications/<APP_ID>/documents \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  -F "document=@sample_marksheet.pdf;type=application/pdf" \
  -F "document_type=Academic Marksheet"
```

### List Documents for Application
```bash
curl -s http://localhost:3000/api/v1/applications/<APP_ID>/documents \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

### Download Document
```bash
curl -s -O -J http://localhost:3000/api/v1/applications/<APP_ID>/documents/<DOC_ID>/download \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

### Track Application Progress & Timeline
```bash
curl -s http://localhost:3000/api/v1/applications/<APP_ID>/track \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

---

## 5. Reviewer Workflow & Scrutiny

### Reviewer Login
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "reviewer@scholarship.gov.in",
    "password": "<REVIEWER_PASSWORD>"
  }'
```
*Save the reviewer token as `$REVIEWER_TOKEN`.*

### List Reviews
```bash
curl -s http://localhost:3000/api/reviews \
  -H "Authorization: Bearer <REVIEWER_TOKEN>"
```

### Verify Application Documents
```bash
curl -s -X PATCH http://localhost:3000/api/reviews/<REVIEW_ID>/documents \
  -H "Authorization: Bearer <REVIEWER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      { "name": "Academic Marksheet", "status": "VERIFIED", "remarks": "Marksheet verified against university portal" }
    ]
  }'
```

### Evaluate Eligibility
```bash
curl -s -X PATCH http://localhost:3000/api/reviews/<REVIEW_ID>/eligibility \
  -H "Authorization: Bearer <REVIEWER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "eligible": true,
    "remarks": "Candidate meets minimum CGPA and family income requirements."
  }'
```

### Record Final Decision (Approve)
```bash
curl -s -X PATCH http://localhost:3000/api/reviews/<REVIEW_ID>/decision \
  -H "Authorization: Bearer <REVIEWER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "APPROVED",
    "remarks": "Scholarship awarded."
  }'
```

---

## 6. Admin Management & Dashboard

### Admin Login
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@scholarship.gov.in",
    "password": "<ADMIN_PASSWORD>"
  }'
```
*Save the admin token as `$ADMIN_TOKEN`.*

### View Live Admin Aggregates
```bash
curl -s http://localhost:3000/api/v1/applications/admin/stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### List All Applications (Admin View)
```bash
curl -s "http://localhost:3000/api/v1/applications/admin/all?page=1&limit=10" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## 7. Interactive API Documentation (Swagger UI)

Open in any browser:
- **Identity Student Service:** `http://localhost:3001/api-docs`
- **Scholarship Service:** `http://localhost:3002/api-docs`
- **Application Service:** `http://localhost:3003/api-docs`
- **Review Service:** `http://localhost:3004/api-docs`
