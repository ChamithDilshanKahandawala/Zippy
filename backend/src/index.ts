import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// ─── Load env vars BEFORE importing firebase config ─────────────────────────
dotenv.config();

// ─── Firebase Admin (initialises on import) ──────────────────────────────────
import './config/firebase';

// ─── Routes ──────────────────────────────────────────────────────────────────
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';

// ─── Middleware ───────────────────────────────────────────────────────────────
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();
const PORT = Number(process.env.PORT) || 3000;

// ─── Allowed CORS origins ─────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// ─── Core middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Zippy backend listening on http://0.0.0.0:${PORT}`);
  console.log(`   Environment  : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   Health check : http://localhost:${PORT}/api/health`);
  console.log(`   Auth register: POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   Admin stats  : GET  http://localhost:${PORT}/api/admin/stats\n`);
});

export default app;
