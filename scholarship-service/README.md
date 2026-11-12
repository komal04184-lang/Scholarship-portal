# Scholarship Service (Microservice)

This folder is an independent Node.js + Express + PostgreSQL microservice for the Scholarship Portal. It owns scholarship information only.

## Responsibility boundary

**Included:** create/update/delete scholarships, browse/search/filter scholarships, eligibility criteria, required documents, deadlines, amount, slots and open/closed/draft status.

**Not included:** student login/accounts, application forms/submissions, application review, payment processing or notifications. Those belong to other microservices.

## Requirements

- Node.js 18 or newer
- PostgreSQL 14 or newer
- VS Code
- Postman (recommended for API testing)

## 1. Create the database

Open pgAdmin Query Tool or the PostgreSQL terminal and run:

```sql
CREATE DATABASE scholarship_service;
```

Then open the `scholarship_service` database and execute `database/schema.sql`.

## 2. Configure environment

In VS Code terminal, make sure terminal is inside the `scholarship-service` folder:

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace `YOUR_PASSWORD` in `DATABASE_URL` with your PostgreSQL password. Set `JWT_SECRET` to the same secret used by the Auth service.

Example:

```env
PORT=5002
NODE_ENV=development
DATABASE_URL=postgresql://postgres:myPassword@localhost:5432/scholarship_service
JWT_SECRET=my_shared_development_secret
CORS_ORIGIN=http://localhost:5173
```

Do not upload `.env` to GitHub.

## 3. Install and run

```powershell
npm install
npm run dev
```

For normal start:

```powershell
npm start
```

Expected terminal message:

```text
Scholarship Service running at http://localhost:5002
```

Open `http://localhost:5002/health`. Expected response:

```json
{
  "success": true,
  "service": "scholarship-service",
  "status": "running"
}
```

## API endpoints

Base URL: `http://localhost:5002/api/v1/scholarships`

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/` | Public | List and filter scholarships |
| GET | `/:id` | Public | Get one scholarship |
| POST | `/admin` | Admin JWT | Create scholarship |
| PUT | `/admin/:id` | Admin JWT | Update scholarship |
| PATCH | `/admin/:id/status` | Admin JWT | Open/close/draft |
| DELETE | `/admin/:id` | Admin JWT | Delete scholarship |

### Filters

Example:

`GET /api/v1/scholarships?category=Merit&department=Computer%20Science&minCgpa=7&maxIncome=500000&status=open&page=1&limit=10&search=merit`

Supported query parameters: `category`, `department`, `minCgpa`, `maxIncome`, `status`, `search`, `page`, `limit`.

### Create request body

```json
{
  "name": "Women in Technology Scholarship",
  "description": "Scholarship for eligible technology students.",
  "category": "STEM",
  "amount": 40000,
  "min_cgpa": 7.5,
  "max_income": 600000,
  "department": "Computer Science",
  "deadline": "2027-05-30",
  "total_slots": 25,
  "eligibility_criteria": ["Currently enrolled student", "Minimum CGPA 7.5"],
  "required_documents": ["Latest marksheet", "College ID", "Income certificate"]
}
```

### Admin authentication integration

Write APIs require:

`Authorization: Bearer <JWT_FROM_AUTH_SERVICE>`

The Auth service must sign the token with the same `JWT_SECRET`, and the decoded token must contain `role: "admin"` (or `"administrator"`). This service does not create student/admin accounts; it verifies the shared JWT contract. For local API testing, use a real admin token from the Auth service.

## Microservice integration

- Run this service on port `5002`.
- API Gateway should forward `/api/v1/scholarships/*` to `http://localhost:5002`.
- Other services should call this service through the API Gateway or its internal service URL.
- This service owns its own PostgreSQL database (`scholarship_service`); it must not directly read or write another service's tables.

## Folder structure

```text
scholarship-service/
├── database/
│   └── schema.sql
├── postman/
│   └── Scholarship-Service.postman_collection.json
├── src/
│   ├── config/db.js
│   ├── controllers/scholarshipController.js
│   ├── middleware/auth.js
│   ├── middleware/errorHandler.js
│   ├── routes/scholarshipRoutes.js
│   ├── services/scholarshipService.js
│   ├── utils/validation.js
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Important note

This is a standalone Scholarship Service implementation. I could not fetch the linked GitHub repository in this environment, so this package has not been merged against the repository's exact existing files or database schema. Before connecting it, align the API Gateway route and JWT signing secret/claim names with your team's implementation.
