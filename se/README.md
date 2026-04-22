# School ERP — Complete MERN Stack Application

A production-style School ERP system built on MERN stack, merging the College Management System and Timetable module into one unified platform.

## Features

- **Multi-role system**: Super Admin, Admin, Principal, Teacher, Class Teacher, Accountant, Librarian, Admission Staff, Student, Parent
- **Grade 11 & 12 Group System**: Science (Biology), Science (Maths), Commerce, Arts — Biology students don't get Commerce subjects
- **Timetable Engine**: Conflict detection, auto-generation, manual editing, substitution management
- **Student Management**: Admission, activation, roll number generation
- **Fees**: Structures, assignment, payment collection, ledger
- **Library**: Book management, issue/return, fines
- **Attendance**, **Leave**, **Outpass**, **Circulars**, **Expenses**

## Project Structure

```
school-erp/
├── backend/
│   ├── config/         # DB connection
│   ├── controllers/    # All business logic
│   ├── middleware/      # Auth, role guards
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API routes
│   ├── seeds/          # Seed script
│   ├── utils/          # Helpers
│   ├── server.js
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/        # Axios instance
    │   ├── components/ # Layout, common UI
    │   ├── context/    # Auth context
    │   ├── pages/      # All page components
    │   └── App.jsx
    └── index.html
```

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — add your MongoDB URI and JWT secret
npm install
npm run seed      # Creates super admin + demo data
npm run dev       # Start dev server on port 5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev       # Start on port 5173
```

### 3. Default Login

```
URL:      http://localhost:5173
Email:    admin@school.edu
Password: admin@123
```

## Grade 11 & 12 Group System

Classes for Grade 11 and 12 are created as **group classes**:

| Group            | Subjects                                    |
|------------------|---------------------------------------------|
| Science (Biology)| Physics, Chemistry, Biology, English, Tamil, PE |
| Science (Maths)  | Physics, Chemistry, Mathematics, English, Tamil, PE |
| Commerce         | Accountancy, Business Maths, Economics, Commerce, English, Tamil, PE |
| Arts             | History, Geography, Political Science, Economics, English, Tamil, PE |

- When assigning subjects to a class, only group-compatible subjects appear
- The timetable engine validates group compatibility before slot assignment
- Students in Biology group cannot be assigned Commerce subjects

## API Endpoints

```
POST   /api/auth/login
GET    /api/auth/me
GET    /api/classes
POST   /api/classes
GET    /api/subjects
POST   /api/subjects
GET    /api/teachers
POST   /api/teachers
GET    /api/students
POST   /api/students
PUT    /api/students/:id/activate
GET    /api/class-subjects
POST   /api/class-subjects
GET    /api/class-subjects/available-subjects
GET    /api/periods
POST   /api/periods/generate
GET    /api/timetable/class/:classId
GET    /api/timetable/teacher/:teacherId
POST   /api/timetable/slot
POST   /api/timetable/auto-generate/:classId
GET    /api/timetable/workload
GET    /api/substitutions
POST   /api/substitutions
GET    /api/substitutions/suggest
POST   /api/attendance
GET    /api/fees/structures
POST   /api/fees/assign
POST   /api/fees/payment
GET    /api/library/books
POST   /api/library/issue
PUT    /api/library/return/:id
GET    /api/dashboard
GET    /api/settings
PUT    /api/settings
```
