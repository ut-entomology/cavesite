/**
 * Server for providing the website and serving the web APIs.
 */

import * as path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import rfs from 'rotating-file-stream';
import helmet from 'helmet';
import session from 'express-session';
import memorystore from 'memorystore';
import csurf from 'csurf';

import * as auth from './apis/auth';
import { CSRF_TOKEN_HEADER } from '../shared/user_auth';
import { setSessionStore } from './integrations/user_sessions';

const MIN_SESSION_KEY_CHARS = 40;
const MAX_SESSION_LENGTH_MINS = 2 * 60;

checkEnvironmentVars();
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

app.listen(port, () => console.log(`Server listening on port ${port}`));

function checkEnvironmentVars() {
  const errs: string[] = [];
  dotenv.config();

  if (!process.env.CAVESITE_BASE_URL) {
    errs.push('Missing CAVESITE_BASE_URL');
  } else if (!process.env.CAVESITE_BASE_URL.startsWith('https://')) {
    errs.push(`CAVESITE_BASE_URL must start with 'https://'`);
  }

  if (!process.env.CAVESITE_SESSION_KEY) {
    errs.push(`Missing CAVESITE_SESSION_KEY (min ${MIN_SESSION_KEY_CHARS} characters)`);
  } else if (process.env.CAVESITE_SESSION_KEY.trim().length < MIN_SESSION_KEY_CHARS) {
    errs.push(
      `CAVESITE_SESSION_KEY must have at least ${MIN_SESSION_KEY_CHARS} characters`
    );
  }

  if (!process.env.CAVESITE_LOG_DIRECTORY) {
    errs.push('CAVESITE_LOG_DIRECTORY not assigned');
  } else {
    if (!'/\\'.includes(process.env.CAVESITE_LOG_DIRECTORY[0])) {
      process.env.CAVESITE_LOG_DIRECTORY = path.join(
        process.cwd(),
        process.env.CAVESITE_LOG_DIRECTORY
      );
    }
  }

  if (errs.length > 0) {
    console.log('Problems with required environment variables:\n');
    for (const err of errs) {
      console.log('-', err);
    }
    console.log('(You may define these as X=Y in the .env file.)\n');
    process.exit(1);
  }
}
