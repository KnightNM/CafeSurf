import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cafeRoutes from './routes/cafeRoutes';
import bookingRoutes from './routes/bookingRoutes';
import authRoutes from './routes/authRoutes';
import cafeManagementRoutes from './routes/cafeManagementRoutes';
import { getLocalIPv4 } from './utils/network';

const app = express();

// ── Middleware ────────────────────────────────────────
app.use(cors({ origin: '*' }));       // Wide-open for local iOS simulator / device traffic
app.use(express.json());

// ── Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/cafes', cafeRoutes);
app.use('/api/cafes/management', cafeManagementRoutes);
app.use('/api/bookings', bookingRoutes);

// ── Health check ─────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start server ─────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  const localIP = getLocalIPv4();

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║    ☕  Cafe Booking Server — Running             ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Local:    http://localhost:${PORT}               ║`);
  console.log(`║  Network:  http://${localIP}:${PORT}        ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                      ║');
  console.log('║    GET  /api/cafes                                ║');
  console.log('║    GET  /api/cafes/:id/availability?date=...      ║');
  console.log('║    POST /api/bookings                             ║');
  console.log('║    POST /api/bookings/:id/checkin                 ║');
  console.log('║    GET  /api/health                               ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
});

export default app;
