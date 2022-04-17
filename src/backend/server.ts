/**
 * Server for providing the website and serving the web APIs.
 */

import * as path from 'path';
import express from 'express';
import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import helmet from 'helmet';
import session from 'express-session';
import cookieParser from 'cookie-parser';

import { loadAndCheckEnvVars } from './util/env_util';
import { connectDB, getDB } from '../backend/integrations/postgres';
import * as auth from './apis/auth';
//import { CSRF_TOKEN_HEADER } from '../shared/user_auth';
import { SessionStore } from './integrations/session_store';
import { Session } from './model/session';

const MAX_SESSION_LENGTH_MINS = 2 * 60;
const PUBLIC_FILE_DIR = path.join(__dirname, '../../public');
const SPA_INDEX_FILE = path.join(PUBLIC_FILE_DIR, 'index.html');

// Initialize configuration.

loadAndCheckEnvVars(true);
const devMode = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.CAVESITE_PORT!);
const maxSessionLengthMillis = MAX_SESSION_LENGTH_MINS * 60000;

// Set up pre-route stack.

const app = express();
app.use(
  morgan('combined', {
    stream: createStream('access.log', {
      interval: '7d',
      path: process.env.CAVESITE_LOG_DIR,
      maxFiles: 16
    })
  })
);
if (!devMode) {
  app.set('trust proxy', 1);
  app.use(helmet());
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    store: new SessionStore(),
    // @ts-ignore
    max: 32000,
    resave: false,
    saveUninitialized: false,
    secret: process.env.CAVESITE_SESSION_KEY!,
    cookie: { secure: !devMode, sameSite: true, maxAge: maxSessionLengthMillis }
  })
);
//app.use(sessionChecker);

// Set up application routes.

app.use(express.static(PUBLIC_FILE_DIR));
app.use('/apis/auth', auth.router);
app.use('/apis/*', (_req, _res, next) => {
  const err = Error('Not found') as any;
  err.status = 404;
  next(err);
});
app.use('*', (_req, res) => {
  res.sendFile(SPA_INDEX_FILE);
});
app.use((err: any, _req: any, res: any) => {
  if (err.code == 'EBADCSRFTOKEN') {
    return res.status(403).send('detected tampering');
  }
  // TODO: Log this error
  res.status(err.status || 500).send({
    error: {
      status: err.status || 500,
      message: err.message || 'Internal Server Error'
    }
  });
});

// Launch server.

app.listen(port, async () => {
  await connectDB({
    host: process.env.CAVESITE_DB_HOST,
    database: process.env.CAVESITE_DB_NAME,
    port: parseInt(process.env.CAVESITE_DB_PORT!),
    user: process.env.CAVESITE_DB_USER,
    password: process.env.CAVESITE_DB_PASSWORD
  });
  await Session.init(getDB());
  console.log(`Server listening on port ${port}`);
});

// function sessionChecker(req: any, _res: any, next: any) {
//   console.log(req.session);
//   next();
// }
