/**
 * Server for providing the website and serving the web APIs.
 */

import * as path from 'path';
import express from 'express';
import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import helmet from 'helmet';
import session from 'express-session';
import memorystore from 'memorystore';
import cookieParser from 'cookie-parser';

import { loadAndCheckEnvVars } from './util/env_util';
import { connectDB } from '../backend/integrations/postgres';
import * as auth from './apis/auth';
//import { CSRF_TOKEN_HEADER } from '../shared/user_auth';
import { setSessionStore } from './integrations/user_sessions';

const MAX_SESSION_LENGTH_MINS = 2 * 60;

// Initialize configuration.

loadAndCheckEnvVars(true);
const devMode = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.CAVESITE_PORT!);
const MemoryStore = memorystore(session);
const maxSessionLengthMillis = MAX_SESSION_LENGTH_MINS * 60000;
const sessionStore = new MemoryStore({ checkPeriod: maxSessionLengthMillis });
setSessionStore(sessionStore);

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
    store: sessionStore,
    // @ts-ignore
    max: 32000,
    resave: false,
    saveUninitialized: false,
    secret: process.env.CAVESITE_SESSION_KEY!,
    cookie: { secure: !devMode, sameSite: true, maxAge: maxSessionLengthMillis }
  })
);

// Set up application routes.

app.use(express.static(path.join(__dirname, '../../public')));
app.use('/apis/auth', auth.router);
app.use('*', (_req, _res, next) => {
  const err = Error('Not found') as any;
  err.status = 404;
  next(err);
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

(async () => {
  await connectDB({
    host: process.env.CAVESITE_DB_HOST,
    database: process.env.CAVESITE_DB_NAME,
    port: parseInt(process.env.CAVESITE_DB_PORT!),
    user: process.env.CAVESITE_DB_USER,
    password: process.env.CAVESITE_DB_PASSWORD
  });
  app.listen(port, () => console.log(`Server listening on port ${port}`));
})();
