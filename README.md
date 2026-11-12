# Scholarship Portal – Identity and Student Service

## 📌 Project Overview

The **Identity and Student Service** is a core microservice of a Scholarship Management Portal developed using the MERN technology stack.

This service is responsible for managing student identity, registration, authentication, authorization, and student profile information.

It provides secure user authentication using JSON Web Tokens (JWT), password hashing using bcrypt, and role-based access control to protect restricted resources.

## 🚀 Technologies Used

- **Node.js** – Backend runtime environment
- **Express.js** – REST API development
- **MongoDB** – NoSQL database
- **Mongoose** – MongoDB object modeling
- **JWT (JSON Web Token)** – Authentication and token verification
- **bcryptjs** – Password hashing
- **Cookie-parser** – Cookie management
- **dotenv** – Environment variable management

## ✨ Features

### 1. Student Registration
- Register new students with personal and academic details.
- Validate required registration fields.
- Check for existing email addresses.
- Hash passwords before storing them in MongoDB.
- Automatically assign the default student role.
- Generate JWT after successful registration.

### 2. Student Login
- Login using username or email.
- Verify credentials using bcrypt.
- Generate a JWT token after successful authentication.
- Store the token in an HTTP-only cookie.

### 3. Student Profile Management
- Fetch the logged-in student's profile.
- Update personal information.
- Update academic details.
- Prevent password exposure in profile responses.

### 4. Authentication and Authorization
- Verify JWT tokens using authentication middleware.
- Protect routes from unauthorized access.
- Implement role-based authorization.
- Restrict the admin dashboard to users with the admin role.

### 5. Logout
- Clear the authentication cookie.
- End the user's authenticated session on the client side.

## 📂 Project Structure

```text
scholarship_project/
│
├── server.js
├── package.json
├── .gitignore
│
└── src/
    ├── app.js
    │
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── profile.controller.js
    │   └── admin.controller.js
    │
    ├── db/
    │   └── db.js
    │
    ├── middleware/
    │   ├── auth.middleware.js
    │   └── role.middleware.js
    │
    ├── models/
    │   └── user.model.js
    │
    └── routes/
        ├── auth.routes.js
        ├── profile.routes.js
        └── admin.routes.js
```

## 🔗 API Endpoints

Base URL: `http://localhost:3000`

### Authentication APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a new student |
| POST | `/api/v1/auth/login` | Login using username or email |
| POST | `/api/v1/auth/logout` | Logout the user |

### Student Profile APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/profile/me` | Fetch logged-in student profile |
| PUT | `/api/v1/profile/me` | Update student profile |

### Admin APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/admin/dashboard` | Access admin dashboard |

**Note:** Profile and admin APIs require authentication. The admin dashboard additionally requires the admin role.

## 🔐 Security Implementation

- Passwords are stored in hashed format using bcryptjs.
- JWT tokens are signed using a secret key stored in environment variables.
- JWT tokens have a validity of 1 day.
- Authentication tokens are stored in HTTP-only cookies.
- Secure cookie configuration is enabled in production.
- Authentication middleware verifies tokens before allowing protected requests.
- Role-based middleware restricts access to authorized users.
- Password fields are excluded from profile API responses.

## 🗄️ Database Model

The service uses MongoDB with Mongoose.

The User model contains:

**Basic Information**
- Username
- Email
- Password
- Phone Number
- Date of Birth
- Gender

**Personal Information**
- Address
- Category
- Family Income
- State
- City

**Academic Information**
- Institution Name
- Course
- Branch
- Academic Year
- Marks Percentage

**Role Management**
- Student
- Admin
- Reviewer

## ⚙️ Installation and Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
```

### Step 2: Navigate to the Project Folder

```bash
cd scholarship_project
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Create a `.env` file in the root directory.

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
NODE_ENV=development
```

Replace the MongoDB URI and JWT secret with your own values.

### Step 5: Start the Server

```bash
node server.js
```

Server will run at:

`http://localhost:3000`

## 📊 HTTP Status Codes

| Status Code | Description |
|---|---|
| 200 | Request successful |
| 201 | Resource created successfully |
| 400 | Bad request / Missing required fields |
| 401 | Unauthorized / Invalid credentials |
| 403 | Access denied |
| 404 | User not found |
| 409 | User already exists |

## 🏗️ Architecture

This service is developed as an independent microservice within a Scholarship Management System.

The microservices approach allows different modules to maintain their own responsibilities and communicate with other services through APIs.

**Main Responsibility:** Student Identity, Authentication, Authorization and Profile Management.

## 👩‍💻 Project Development

Developed as part of a team-based Scholarship Management Portal project using the MERN stack and Microservices Architecture.

---

**Identity and Student Service – Scholarship Management Portal**
