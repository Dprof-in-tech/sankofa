import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router } from './routes/index.js';

const app = express();
const port = process.env.PORT || 3001;

// CORS allowlist — localhost for dev, plus any explicit origins set via env
// (comma-separated in CORS_ORIGINS) so tunneled demo URLs can be added
// without a redeploy. Any *.trycloudflare.com origin is also waved through so
// short-lived cloudflare tunnels don't need to be re-added by hand.
const extraOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowlist = new Set<string>([
  'http://localhost:3000',
  'http://localhost:3001',
  'https://imposed-sticky-insured-satin.trycloudflare.com',
  ...extraOrigins,
]);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / server-to-server
      if (allowlist.has(origin) || /\.trycloudflare\.com$/.test(new URL(origin).hostname)) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json());

// Routes mounted at root. Vercel Services strips the /api prefix before
// forwarding, so handlers must NOT include it. Locally (port 3001) the
// frontend calls http://localhost:3001/<route> directly.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Sankofa backend healthy' });
});

app.use('/', router);

app.listen(port, () => {
  console.log(`Sankofa backend listening on http://localhost:${port}`);
});
