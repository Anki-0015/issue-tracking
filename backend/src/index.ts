import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import authRouter from './routes/auth';
import issuesRouter from './routes/issues';
import uploadsRouter from './routes/uploads';
import prisma from './lib/prisma';

const app = express();
const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const FRONTEND_ORIGINS = FRONTEND_URL.split(',').map((origin) => origin.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

app.set('trust proxy', 1);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please retry later.' },
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || FRONTEND_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: isProduction ? '1d' : 0,
  immutable: isProduction,
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter);
app.use('/api/auth', authRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/uploads', uploadsRouter);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness check (includes DB connectivity)
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not_ready', error: 'Database unavailable' });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message.includes('CORS')) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'Malformed JSON body' });
    return;
  }

  console.error('[unhandled-error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n  CivicReport API running on http://localhost:${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV ?? 'development'}\n`);
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.log(`\n  Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('  Database connection closed.');
      process.exit(0);
    } catch (error) {
      console.error('  Error during Prisma disconnect:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('  Force shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

export default app;
