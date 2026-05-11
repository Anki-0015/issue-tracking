# CivicReport

Civic issue reporting platform where citizens can submit local issues and admins can manage issue workflows.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, Tailwind CSS v4, TypeScript |
| Backend | Express 4, TypeScript, Prisma 7 |
| Database | PostgreSQL |
| Auth | JWT (HTTP-only cookie) |

## Project Structure

```text
issue-tracking/
├── backend/
└── frontend/
```

## Prerequisites

- Node.js 18+
- npm 10+
- PostgreSQL running locally

## Local Setup

### 1. Clone

```bash
git clone https://github.com/your-username/issue-tracking.git
cd issue-tracking
```

### 2. Create database

```bash
psql -U your_pg_user -c "CREATE DATABASE civicreport;"
```

### 3. Configure backend

```bash
cd backend
cp .env.example .env
```

Important backend env variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

The default admin credentials in `backend/.env.example` are:

- email: `admin@civicreport.local`
- password: `Admin@12345`

Change these in real environments.