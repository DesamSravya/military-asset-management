# Deployment Guide — Vercel + Render

## Architecture

React/Vite frontend → Vercel
Node/Express backend → Render
PostgreSQL → Render PostgreSQL

## Step 1 — GitHub

Create a GitHub repository and upload the contents of this project.

Do not upload `.env` files or real secrets.

## Step 2 — Deploy backend to Render

1. Create a Render account.
2. Create a PostgreSQL database.
3. Create a Web Service from the GitHub repository.
4. Set Root Directory to `backend`.
5. Build Command:
   `npm install && npx prisma generate`
6. Start Command:
   `npm start`
7. Add environment variables:
   DATABASE_URL = your Render PostgreSQL connection string
   JWT_SECRET = a long random secret
   FRONTEND_URL = your Vercel frontend URL
8. Deploy.

The backend health endpoint is:
`https://YOUR-BACKEND.onrender.com/api/health`

## Step 3 — Load demo database data

The repository contains `database/dump.sql`.

For evaluation, load it into the PostgreSQL database using a PostgreSQL client such as psql or a database GUI.

Alternatively, create the schema using Prisma:
`npx prisma generate`
`npx prisma migrate deploy`

## Step 4 — Deploy frontend to Vercel

1. Create a Vercel account.
2. Import the GitHub repository.
3. Set Root Directory to `frontend`.
4. Framework preset: Vite.
5. Add environment variable:

`VITE_API_URL=https://YOUR-BACKEND.onrender.com/api`

6. Deploy.

## Step 5 — Update backend CORS

In Render, set:

`FRONTEND_URL=https://YOUR-FRONTEND.vercel.app`

Redeploy the backend if required.

## Step 6 — Test

Open the Vercel URL and sign in.

Demo accounts:
- Admin: admin@example.com / Admin@123
- Base Commander: commander@example.com / Commander@123
- Logistics Officer: logistics@example.com / Logistics@123

## Important

These are fictional demonstration credentials. Change them and use proper secret management for any production deployment.
