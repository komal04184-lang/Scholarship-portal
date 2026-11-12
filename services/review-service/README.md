# Scholarship Review Service

An independent Node.js + Express microservice for reviewing scholarship applications.

## Features
- Create and list reviews
- View a review by ID or application ID
- Verify submitted documents
- Record eligibility review
- Approve, reject, or request corrections
- Health endpoint
- In-memory demo mode (default) and optional PostgreSQL persistence

## 1. Run without installing a database
Requirements: Node.js 18+

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, if `cp` does not work:
```powershell
Copy-Item .env.example .env
```

The service starts at `http://localhost:5004`. In-memory data resets when the server restarts.

## 2. Optional PostgreSQL setup
Create a PostgreSQL database, for example `scholarship_review`, then set `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/scholarship_review
DB_AUTO_INIT=true
```

Restart the server. The SQL schema is in `sql/schema.sql`. If you prefer to run it manually, execute that file in your database and keep `DB_AUTO_INIT=false`.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/reviews` | Create a review for an application |
| GET | `/api/reviews` | List reviews (optional `?status=PENDING`) |
| GET | `/api/reviews/:id` | Get review by review ID |
| GET | `/api/reviews/application/:applicationId` | Get review for an application |
| PATCH | `/api/reviews/:id/documents` | Update document verification |
| PATCH | `/api/reviews/:id/eligibility` | Record eligibility check |
| PATCH | `/api/reviews/:id/decision` | Approve, reject, or request correction |

## Example requests

### Create review
`POST http://localhost:5004/api/reviews`
```json
{
  "applicationId": "APP101",
  "studentId": "STU101",
  "scholarshipId": "SCH101",
  "documents": [
    { "name": "Income Certificate", "status": "PENDING" },
    { "name": "Marks Card", "status": "PENDING" }
  ]
}
```

### Verify documents
`PATCH http://localhost:5004/api/reviews/REVIEW_ID/documents`
```json
{
  "documents": [
    { "name": "Income Certificate", "status": "VERIFIED", "remarks": "Valid certificate" },
    { "name": "Marks Card", "status": "REJECTED", "remarks": "Image is not readable" }
  ]
}
```

### Record eligibility
`PATCH http://localhost:5004/api/reviews/REVIEW_ID/eligibility`
```json
{
  "eligible": true,
  "remarks": "Meets the scholarship criteria"
}
```

### Final decision
`PATCH http://localhost:5004/api/reviews/REVIEW_ID/decision`
```json
{
  "decision": "APPROVED",
  "remarks": "Documents verified and eligibility confirmed",
  "reviewedBy": "REVIEWER01"
}
```

Allowed decisions: `APPROVED`, `REJECTED`, `CORRECTION_REQUIRED`.
A review cannot be approved unless all documents are verified and eligibility is marked true.

## Important integration note
This service stores identifiers (`applicationId`, `studentId`, `scholarshipId`) rather than owning student, scholarship, or application data. During local development you can create reviews using the sample JSON above. Later, connect it to the Application and Scholarship services using their agreed REST APIs or events. Do not share another service's database tables directly.
