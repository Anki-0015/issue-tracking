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

## Deploy with Vercel and Supabase

The frontend and Express API are deployed as separate Vercel projects. Supabase provides PostgreSQL and image storage.

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com/).
2. Save the database password you set during project creation.
3. In **Storage**, create a bucket named `issue-images` and enable **Public bucket** access. The API writes to this bucket using a server-only service-role key.
4. In **Project Settings → API**, copy the Project URL and the `service_role` key. Keep the service-role key private; never add it to frontend environment variables.
5. In **Connect**, copy both the Supavisor connection strings: the **Transaction** pooler URL (port `6543`) and the **Session** pooler URL (port `5432`). Replace the password placeholder in each URL. Append `pgbouncer=true` to the transaction URL.

Use the transaction URL as `DATABASE_URL` for Vercel Functions and the session URL as `DIRECT_URL` for Prisma migrations.

### 2. Apply database migrations and create the admin

From a terminal, run these commands in the `backend` directory. Replace each placeholder locally; do not commit or share the URLs or password.

```bash
cd backend
npm ci
export DATABASE_URL='YOUR_SUPABASE_TRANSACTION_URL_WITH_PGBOUNCER_TRUE'
export DIRECT_URL='YOUR_SUPABASE_SESSION_URL'
npm run db:migrate:deploy
export ADMIN_NAME='System Admin'
export ADMIN_EMAIL='YOUR_ADMIN_EMAIL'
export ADMIN_PASSWORD='YOUR_STRONG_ADMIN_PASSWORD'
npm run db:seed
unset DATABASE_URL DIRECT_URL ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
```

### 3. Deploy the API to Vercel

1. In Vercel, import the GitHub repository as a new project.
2. Set **Root Directory** to `backend` and choose Node.js `22.x` if Vercel asks for a runtime version. Vercel detects the Express app in `src/index.ts`.
3. Add these **Production** environment variables:
	- `DATABASE_URL`: Supabase Transaction pooler URL with `pgbouncer=true`
	- `DIRECT_URL`: Supabase Session pooler URL
	- `JWT_SECRET`: a unique, long random secret
	- `FRONTEND_URL`: temporarily `https://example.vercel.app`; replace it after deploying the frontend
	- `SUPABASE_URL`: the Supabase Project URL
	- `SUPABASE_SERVICE_ROLE_KEY`: the Supabase service-role key
4. Deploy and copy the API's Vercel URL. Test `https://YOUR-API-URL/health`; it should return `{"status":"ok",...}`.

### 4. Deploy the frontend to Vercel

1. Add another Vercel project from the same GitHub repository.
2. Set **Root Directory** to `frontend`. Keep the default Next.js build settings.
3. Add a **Production** environment variable named `BACKEND_URL` with the API URL from step 3, for example `https://your-api.vercel.app` (no trailing slash).
4. Deploy and copy the frontend's Vercel URL.

### 5. Finish the API configuration

1. Return to the Vercel API project and change `FRONTEND_URL` to the frontend URL, for example `https://your-app.vercel.app` (no trailing slash).
2. Redeploy the API project.
3. Open the frontend URL and test registration, login, and submitting an issue with an image. Image uploads are limited to 4 MB to fit within Vercel Function request limits.

Password-reset emails require SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`) in the API project's environment variables.