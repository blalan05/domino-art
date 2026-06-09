import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import multer from 'multer';
import pg from 'pg';
import { authRouter } from './routes/auth.js';
import { colorsRouter } from './routes/colors.js';
import { projectsRouter } from './routes/projects.js';
import { sharingRouter } from './routes/sharing.js';
import { socialRouter } from './routes/social.js';
import { attachUser, attachWorkspace } from './middleware/workspace.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
const uploadDir = process.env.UPLOAD_DIR ?? './uploads';

fs.mkdirSync(uploadDir, { recursive: true });

const PgSession = connectPgSimple(session);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET ?? 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  }),
);

app.use(attachUser);
app.use(attachWorkspace);

const upload = multer({ dest: uploadDir });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/colors', colorsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', sharingRouter);
app.use('/api/social', socialRouter);

app.post('/api/uploads', upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Image required' });
    return;
  }
  res.status(201).json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    url: `/uploads/${req.file.filename}`,
  });
});

app.use('/uploads', express.static(path.resolve(uploadDir)));

app.listen(port, () => {
  console.log(`Domino Art API listening on http://localhost:${port}`);
});
