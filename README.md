# CivicReport

CivicReport is a civic issue reporting platform where residents can report local problems and follow their progress. Administrators can triage reports, update status, and keep a public history of decisions.

## Live Demo

- Frontend: [issue-tracking-app-seven.vercel.app](https://issue-tracking-app-seven.vercel.app)
- API health: [issue-tracking-ngcx.vercel.app/health](https://issue-tracking-ngcx.vercel.app/health)

Create a citizen account from the app to explore reporting and discussion. Administrator access is created separately through the backend seed command. Image uploads are disabled on the hosted API until persistent object storage is configured.

## Features

- Citizen registration, sign-in, and password reset
- Issue reports with categories, severity, location, and image evidence
- Map-based location selection and address lookup
- Search, filtering, pagination, and issue status tracking
- Admin status transitions with an audit history and rejection reasons
- Comments, upvotes, and notifications
- Admin dashboard with reporting and resolution metrics
- Role-based API authorization and secure HTTP-only authentication cookies

## Technology

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Express 4, TypeScript |
| Data | PostgreSQL, Prisma 7 |
| Authentication | JWT in HTTP-only cookies |
| Deployment | Vercel, Docker Compose |

## Repository Layout

```text
backend/       Express API, Prisma schema, and database migrations
frontend/      Next.js web application
.github/       Continuous integration workflow
docker-compose.yml
```

## Run Locally

Clone the repository and enter the project folder:

```bash
git clone https://github.com/Anki-0015/issue-tracking.git
cd issue-tracking
```

### Requirements

- Node.js 22 and npm
- Docker with Docker Compose

### 1. Configure and start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Configure and start the API

```bash
cd backend
cp .env.example .env
```

Set `DATABASE_URL` to your local PostgreSQL connection string, choose a unique `JWT_SECRET`, and set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` to the administrator account you want to create. Configure the SMTP variables to enable password reset email delivery.

Then install dependencies, apply migrations, seed the administrator, and start the API:

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The API runs at `http://localhost:4000`.

### 3. Start the frontend

In another terminal:

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`. Sign in with the administrator credentials configured in `backend/.env`, or create a citizen account from the signup page.

## Docker Compose

To build and run all three services together:

```bash
docker compose up --build
```

This starts PostgreSQL, the API, and the frontend. The compose setup provides a development database and a placeholder JWT secret; replace those values before using it beyond local development. Admin account seeding is done from the backend development setup above.

## Environment Variables

The frontend reads `NEXT_PUBLIC_API_URL`. The backend requires `DATABASE_URL` and `JWT_SECRET`; `FRONTEND_URL` controls allowed browser origins. Optional `SMTP_*` and `MAIL_FROM*` variables configure reset emails. See `backend/.env.example` and `frontend/.env.example` for the full local configuration templates.

## Continuous Integration

The GitHub Actions workflow installs dependencies, builds both applications, runs frontend linting, and audits runtime dependencies.
