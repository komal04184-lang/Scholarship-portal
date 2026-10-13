# ApexScholar — Online Scholarship Management Portal 🎓

A full-stack, enterprise-grade university scholarship portal designed for academic institutions to manage, scrutinize, award, and disburse student scholarships with complete transparency.

Built with **PostgreSQL** (relational core, RBAC, financial ledger), **MongoDB** (document metadata, GridFS artifacts, audit trails), **Express/Node.js** (REST API), and **React + Vite** (responsive single-page application).

---

## 🌟 Key Features

### 1. Student Portal
- **Scholarship Discovery & Live Filtering**: Filter awards by Category (*Merit, STEM, Need-Based, Research, International*), Department, Minimum CGPA, and Maximum Annual Income.
- **Application Submission Wizard**:
  - Step 1: Academic profile & eligibility confirmation.
  - Step 2: Statement of Purpose (SOP) & motivation essay.
  - Step 3: Secure multi-file document upload (*mark sheets, income proof, recommendations*).
  - Step 4: Submission confirmation with celebratory confetti.
- **Real-Time Application Tracker**: Interactive timeline visualizing review milestones (*Submitted → Under Review → Approved → Disbursed*).
- **Academic Profile Editor**: Update contact details, CGPA, and income records.

### 2. Administrative & Directorate Console
- **Executive KPI Dashboard**: Live tracking of Total Applications, Disbursed Funds (₹), Approval Rates, Pending Scrutiny Queue, and Average CGPA.
- **Application Scrutiny Desk**: Filter queue by status (*Submitted, Under Review, Approved, Rejected, Disbursed*), inspect applicant credentials, and submit audit decision notes.
- **Scholarship Scheme Management**: Create and configure new scholarship grants with custom eligibility criteria, quotas, and deadlines.
- **System Diagnostics**: Real-time health monitor inspecting PostgreSQL connection pools and MongoDB cluster status.

---

## 🏗️ Architecture & Database Design

- **PostgreSQL (`portal` schema)**:
  - `student`: Academic profiles, UID, CGPA, family annual income, department.
  - `admin_user`: Committee members and reviewers with role-based access control (`admin`, `officer`, `superadmin`).
  - `scholarship`: Program details, funding amounts, slot allocations, GPA/income eligibility thresholds.
  - `application`: Core student applications, submission timestamps, and current state.
  - `application_status_history`: Auditable timeline tracking every status change and review remark.
  - `disbursement`: Transaction records, sanctioned amounts, and transfer confirmation numbers.
- **MongoDB**:
  - `document_metadata`: File metadata, MIME types, GridFS chunks, and verification flags.
  - `audit_logs`: Immutable logging for compliance and governance.

---

## 🚀 Quick Start Guide

### 1. Backend Server Setup

```bash
cd server

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env and adjust PostgreSQL / MongoDB credentials if needed:
# cp .env.example .env

# Run database schema migrations
npm run migrate

# Seed database with realistic demo scholarships and applicants
npm run seed

# Start API Server (Runs on http://localhost:3000)
npm run dev
```

### 2. Frontend Client Setup

```bash
cd client

# Install dependencies
npm install

# Start Vite Development Server (Runs on http://localhost:5173)
npm run dev
```

The Vite dev server proxies `/api` and `/uploads` directly to `http://localhost:3000`.

---

## 🔑 Demo & Evaluator Accounts

For rapid testing and grading, pre-seeded accounts and one-click demo login buttons are provided on the interface:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Student** | `aarav.sharma@example.edu` | `Password123!` | Browse, apply, edit academic profile, track status |
| **Review Officer** | `reviewer@scholarship.edu` | `ReviewerPass123!` | Application scrutiny, document verification, remarks |
| **Administrator** | `admin@scholarship.edu` | `AdminPass123!` | Full control, approve/reject grants, create scholarships |

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System health check (PostgreSQL + MongoDB status) |
| `POST` | `/api/v1/auth/register` | Register new student account |
| `POST` | `/api/v1/auth/login` | Student login (returns JWT Bearer token) |
| `POST` | `/api/v1/auth/admin/login`| Admin/Officer login |
| `GET` | `/api/v1/scholarships` | List public scholarships with search & filters |
| `GET` | `/api/v1/scholarships/:id` | Get scholarship details & eligibility rules |
| `GET` | `/api/v1/student/profile` | Get authenticated student academic profile |
| `PUT` | `/api/v1/student/profile` | Update student profile and contact details |
| `GET` | `/api/v1/applications/my-applications` | Get authenticated student's applications |
| `POST` | `/api/v1/applications` | Submit application with multipart documents |
| `GET` | `/api/v1/admin/dashboard/stats` | Executive KPI analytics |
| `GET` | `/api/v1/admin/applications` | Review queue with status filters |
| `PATCH`| `/api/v1/admin/applications/:id/status` | Update status (`UNDER_REVIEW`, `APPROVED`, etc.) |
| `POST` | `/api/v1/admin/scholarships` | Create new scholarship scheme |
