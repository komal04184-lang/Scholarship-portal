# ApexScholar – Review Microservice

Node.js 18+ / Express service for reviewer workflows. The service owns review records and review history; it does not read another microservice's database.

## Configuration

Copy `.env.example` to `.env` and set:

- `PORT=3004` (standardized with the ApexScholar architecture)
- `DATABASE_URL` for the Review PostgreSQL database
- `JWT_SECRET` to the same HS256 signing secret used by Identity Service
- `INTERNAL_SERVICE_TOKEN` to the same shared token configured in Application Service
- `APPLICATION_SERVICE_URL=http://localhost:3003`

For the integrated project, use PostgreSQL (`DB_AUTO_INIT=true` for local schema initialization). In-memory mode is intended only for isolated local tests/demo and resets on restart.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
npm install
npm test
npm run dev
```

Service URL: `http://localhost:3004`; health: `GET /api/health`.

## Authentication and trust boundaries

- `POST /api/reviews` is an internal endpoint. It requires `x-service-token: <INTERNAL_SERVICE_TOKEN>` and may be called by Application Service after all application documents have been uploaded.
- Reviewer endpoints require `Authorization: Bearer <JWT>`. JWT must use HS256 and be signed with `JWT_SECRET`. The token must contain a user ID (`id`, `userId`, `user.id`, or `sub`) and `role` (or `user.role`) of `reviewer` or `admin`.
- The reviewer identity is taken from the verified token; clients cannot choose `reviewedBy` in the request body.

## API

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |
| POST | `/api/reviews` | Internal service token | Create review |
| GET | `/api/reviews` | Reviewer/Admin | List reviews; optional `?status=` |
| GET | `/api/reviews/:id` | Reviewer/Admin | Get review |
| GET | `/api/reviews/application/:applicationId` | Reviewer/Admin | Get review for application |
| GET | `/api/reviews/:id/history` | Reviewer/Admin | Audit history |
| PATCH | `/api/reviews/:id/documents` | Reviewer/Admin | Verify/update document records |
| PATCH | `/api/reviews/:id/eligibility` | Reviewer/Admin | Record eligibility result |
| PATCH | `/api/reviews/:id/decision` | Reviewer/Admin | Approve, reject, or request correction |

### Create review (Application Service → Review Service)

```http
POST /api/reviews
x-service-token: <INTERNAL_SERVICE_TOKEN>
x-caller-service: application-service
Content-Type: application/json
```

```json
{
  "applicationId": "APP101",
  "studentId": "STU101",
  "scholarshipId": "SCH101",
  "documents": [
    { "documentId": "DOC-1", "name": "Income Certificate", "status": "PENDING" },
    { "documentId": "DOC-2", "name": "Marks Card", "status": "PENDING" }
  ]
}
```

Pass the actual uploaded document identifiers/metadata from Application Service, not placeholder documents. Document file storage remains owned by Application Service.

### Verify documents

```json
{
  "documents": [
    { "documentId": "DOC-1", "name": "Income Certificate", "status": "VERIFIED", "remarks": "Valid" }
  ]
}
```

Updates merge by `documentId` (or by name when no ID is provided), preserving other documents. Finalized reviews cannot be edited.

### Eligibility

```json
{ "eligible": true, "remarks": "Meets the scholarship criteria" }
```

### Final decision

```json
{ "decision": "APPROVED", "remarks": "All checks passed" }
```

Allowed decisions: `APPROVED`, `REJECTED`, `CORRECTION_REQUIRED`. Approval is blocked unless at least one document exists, every document is `VERIFIED`, and eligibility is true. The reviewer ID is derived from the JWT.

## Application Service callback

After saving a final decision, Review Service calls:

`PATCH ${APPLICATION_SERVICE_URL}/internal/applications/:applicationId/status`

with `x-service-token`, `x-caller-service: review-service`, and body `{ "status": "APPROVED|REJECTED|CORRECTION_REQUIRED", "remarks": "...", "caller_service": "review-service" }`.

The Application Service must expose this endpoint and validate the same internal service token. If the callback fails, the decision remains saved, the API responds `202 Accepted` with `callbackStatus: PENDING`, and the service retries pending callbacks every 30 seconds. The response is `200` when the callback succeeds.

## Database

`sql/schema.sql` creates `reviews` and `review_history`, including callback retry fields. Existing databases receive the two callback columns through `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Set `DB_AUTO_INIT=true` only where this service is allowed to create/alter its schema, or run the SQL manually.

## Tests

`npm test` runs unit tests with a mock Application Service callback. These tests do not replace a full four-service integration test. Confirm the Application Service accepts the documented callback payload and status values before the group demo.
