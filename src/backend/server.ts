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
import { StatusCodes, ReasonPhrases } from 'http-status-codes';

import { loadAndCheckEnvVars } from './util/env_util';
import { connectDB, getDB } from '../backend/integrations/postgres';
import { router as authApi } from './apis/auth_api';
import { router as userApi } from './apis/user_api';
import { SessionStore } from './integrations/session_store';
import { Session } from './model/session';
import { LogType, Logs } from './model/logs';

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
  morgan('common', {
    stream: createStream('access.log', {
      interval: '7d',
      path: process.env.CAVESITE_LOG_DIR,
      maxFiles: 12
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
app.use('/api/auth', authApi);
app.use('/api/user', userApi);
app.use('/api/*', (_req, _res, next) => {
  const err = Error(ReasonPhrases.NOT_FOUND) as any;
  err.status = StatusCodes.NOT_FOUND;
  next(err);
});
app.use('*', (_req, res) => {
  res.sendFile(SPA_INDEX_FILE);
});
app.use(async (err: any, _req: any, res: any) => {
  if (err.code == 'EBADCSRFTOKEN') {
    return res.status(StatusCodes.FORBIDDEN).send('detected tampering');
  }
  await Logs.post(getDB(), LogType.Server, 'error', err.toString());
  res.status(err.status || StatusCodes.INTERNAL_SERVER_ERROR).send({
    error: {
      status: err.status || StatusCodes.INTERNAL_SERVER_ERROR,
      message: err.message || ReasonPhrases.INTERNAL_SERVER_ERROR
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
