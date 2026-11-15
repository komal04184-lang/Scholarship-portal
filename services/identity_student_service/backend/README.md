# Identity Student Service (identity-student-service)

Independent authentication, student profile, and role-based access control microservice for the Online Scholarship Portal (ApexScholar).

## Architecture & Technology Stack
- **Runtime**: Node.js & Express
- **Database**: PostgreSQL (`identity_db`) - 100% independent schema, zero MongoDB/Mongoose dependencies.
- **Authentication**: JWT (JSON Web Tokens) with dual-mode support (HTTP-Only cookies + Authorization Bearer header) and rotating refresh tokens.
- **Port**: `3001`

---

## PostgreSQL Database (`identity_db`)

### Connection Configuration (.env)
```dotenv
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=identity_db
DB_USER=postgres
DB_PASSWORD=Kom@l007

JWT_SECRET=dev_jwt_secret_change_in_production_k9x2m4p7
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_EXPIRES_IN=30d
```

### Database Tables in `identity_db`
1. `users` - Core accounts (id UUID, username, email, password_hash, role, status, email_verified, timestamps).
2. `student_profiles` - Extended academic and socio-economic information (id UUID, user_id, enrollment_no, dob, gender, phone, address, city, state, country, category, family_income, family_size, institution_name, course, branch, academic_year, semester, cgpa, passing_year, marks_percentage, profile_complete, timestamps).
3. `user_sessions` - Active refresh token hashes and sessions for revocation and rotation.
4. `password_reset_tokens` - Cryptographic tokens for secure password recovery.
5. `email_verification_tokens` - Tokens for email confirmation.
6. `user_audit_logs` - Audit trail of critical user actions (registration, login, status changes).
7. `student_addresses` - Multi-address support for student accounts.

---

## Database Migrations
Run migrations against PostgreSQL (`identity_db`):
```powershell
npm run migrate
```
This automatically verifies or creates the `identity_db` database, creates all 7 tables with indexes, and seeds the default administrator (`admin@scholarship.gov.in` / `Admin@123`) and a sample student (`student@scholarship.gov.in` / `Student@123`).

---

## REST API Endpoints

### 1. Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` - Register a new student account and create student profile.
- `POST /api/v1/auth/login` - Login with email or username and password. Returns JWT and refresh token.
- `POST /api/v1/auth/logout` - Revokes refresh session and clears authentication cookies.
- `POST /api/v1/auth/refresh` - Rotates refresh token and issues new access token.
- `POST /api/v1/auth/forgot-password` - Dispatches password reset token.
- `POST /api/v1/auth/reset-password` - Resets password with token.
- `POST /api/v1/auth/verify-email` - Confirms student email address.
- `GET /api/v1/auth/me` - Returns authenticated user details and profile.

### 2. Student Profiles (`/api/v1/profile` & `/api/v1/students`)
- `GET /api/v1/profile/me` - Fetch own profile.
- `PUT /api/v1/profile/me` - Update own personal and academic profile.
- `GET /api/v1/profile/:id` - Fetch profile by ID (Owner or Admin).
- `PUT /api/v1/profile/:id` - Update profile by ID (Owner or Admin).
- `GET /api/v1/students/:id/basic-info` - Public basic identity info for cross-service checks.

### 3. Admin & User Management (`/api/v1/admin`)
- `GET /api/v1/admin/dashboard` - High-level system statistics (total students, reviewers, admins).
- `GET /api/v1/admin/users` - Paginated user listing with search and role/status filtering.
- `GET /api/v1/admin/users/:id` - Detailed user and profile information.
- `PATCH /api/v1/admin/users/:id/status` - Activate, deactivate, or suspend accounts.
- `PATCH /api/v1/admin/users/:id/role` - Assign role (`student`, `reviewer`, `admin`).

### 4. Health
- `GET /api/v1/health` or `GET /health` - Service health and PostgreSQL connection status.

---

## Running the Service
```powershell
# In services/identity_student_service/backend
npm start
```

