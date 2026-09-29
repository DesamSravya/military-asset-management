# Military Asset Management System

A full-stack demonstration project for managing fictional asset inventory across multiple bases.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- ORM: Prisma
- Authentication: JWT
- Password hashing: bcryptjs
- Validation: Zod

## Features
- Dashboard with Opening Balance, Closing Balance, Net Movement, Assigned and Expended
- Date/Base/Equipment Type filters
- Purchases and purchase history
- Transfers with movement history
- Assignments and expenditures
- JWT authentication and RBAC
- Base-level access restrictions for Base Commanders
- Audit logging
- PostgreSQL schema and SQL dump

## Demo data
All data is fictional. No real military, operational, personnel, location, or inventory data is included.

## Setup

### 1. Database
Create a PostgreSQL database named `military_assets`.

Then run:
```bash
psql -U postgres -d military_assets -f database/dump.sql
```

Or use the Prisma schema:
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
```

### 2. Backend
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Default API: `http://localhost:5000`

Set `DATABASE_URL` and `JWT_SECRET` in `.env`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Default UI: `http://localhost:5173`

### Demo credentials
- Admin: `admin@example.com` / `Admin@123`
- Base Commander: `commander@example.com` / `Commander@123`
- Logistics Officer: `logistics@example.com` / `Logistics@123`

These credentials are for local demonstration only and must be changed for any real deployment.


## Deployment

Deployment-ready files are included:
- `frontend/vercel.json`
- `frontend/.env.example`
- `backend/.env.example`
- `render.yaml`
- `DEPLOYMENT.md`

Recommended hosting:
- Frontend: Vercel
- Backend: Render
- Database: Render PostgreSQL

The frontend reads the production backend URL from `VITE_API_URL`.
The backend reads allowed frontend origins from `FRONTEND_URL`.
