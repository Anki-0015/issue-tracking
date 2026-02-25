# CivicReport

A citizen issue reporting platform where users can sign up, log in, and track civic issues in their community.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Next.js 16, Tailwind CSS v4, TypeScript |
| Backend  | Express 4, TypeScript, Prisma 5     |
| Database | PostgreSQL                          |
| Auth     | JWT (HTTP-only cookies)             |

## Project Structure

```
issue-tracking/
├── backend/       # Express + Prisma API
└── frontend/      # Next.js app
```

## Prerequisites

- Node.js 18+
- PostgreSQL (running locally)

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/issue-tracking.git
cd issue-tracking
```

### 2. Set up the database

Create a PostgreSQL database:

```bash
psql -U your_pg_user -c "CREATE DATABASE civicreport;"
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and fill in your values:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/civicreport"
JWT_SECRET="your-super-secret-jwt-key"
PORT=4000
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
```

Install dependencies and run the Prisma migration:

```bash
npm install
npx prisma migrate dev --name init
```

### 4. Configure the frontend

```bash
cd ../frontend
cp .env.local.example .env.local
```

`frontend/.env.local` should contain:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

Install dependencies:

```bash
npm install
```

### 5. Run the app

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
Runs on http://localhost:4000

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Runs on http://localhost:3000

## Features

- Sign up / Log in with JWT auth (HTTP-only cookies)
- Protected dashboard and profile pages
- Show password toggle on auth forms
- Profile page displays real user data from DB
- Responsive dark navy + white UI
