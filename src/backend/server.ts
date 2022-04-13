/**
 * Server for providing the website and serving the web APIs.
 */

import * as path from 'path';
import express from 'express';
import morgan from 'morgan';
import rfs from 'rotating-file-stream';
import helmet from 'helmet';
import session from 'express-session';
import memorystore from 'memorystore';
import csurf from 'csurf';

import { loadAndCheckEnvVars } from './util/env_util';
import * as auth from './apis/auth';
import { CSRF_TOKEN_HEADER } from '../shared/user_auth';
import { setSessionStore } from './integrations/user_sessions';

const MAX_SESSION_LENGTH_MINS = 2 * 60;

loadAndCheckEnvVars(true);

const devMode = process.env.NODE_ENV !== 'production';
const port = process.env.CAVESITE_PORT || 80;
const MemoryStore = memorystore(session);
const maxSessionLengthMillis = MAX_SESSION_LENGTH_MINS * 60000;
const sessionStore = new MemoryStore({ checkPeriod: maxSessionLengthMillis });
setSessionStore(sessionStore);

const csrfProtection = csurf({
  // @ts-ignore
  value: (req) => req.headers[CSRF_TOKEN_HEADER]
});

const app = express();
app.use(helmet);
app.use(
  morgan('combined', {
    stream: rfs.createStream('access.log', {
      interval: '1w',
      path: process.env.CAVESITE_LOG_DIRECTORY,
      maxFiles: 16
    })
  })
);
if (!devMode) {
  app.set('trust proxy', 1);
  app.use(express.static(path.join(__dirname, '../../public')));
}

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
app.use((req, res, next) => {
  // Only apply CSRF protection to logged-in users.
  if (!req.session || !req.session.user) return next();
  csrfProtection(req, res, next);
});

app.use('/auth', auth.router);
app.use((err: any, _req: any, res: any, next: any) => {
  if (err.code == 'EBADCSRFTOKEN') {
    return res.status(403).send('detected tampering');
  }
  next(err);
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
