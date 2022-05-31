/**
 * Server for providing the website and serving the web APIs.
 */

import * as path from 'path';
import express from 'express';
import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import sgMail from '@sendgrid/mail';

import { loadAndCheckEnvVars } from './util/env_util';
import { checkAllEmails } from './util/email_util';
import { connectDB, getDB } from '../backend/integrations/postgres';
import { sessionware } from '../backend/integrations/sessionware';
import { router as authApi } from './apis/auth_api';
import { router as clusterApi } from './apis/cluster_api';
import { router as locationApi } from './apis/location_api';
import { router as specimenApi } from './apis/specimen_api';
import { router as userApi } from './apis/user_api';
import { router as taxaApi } from './apis/taxa_api';
import { Session } from './model/session';
import { LogType, Logs } from './model/logs';

const SESSION_TIMEOUT_MILLIS = 2 * 60 * 60 * 1000; // logs out after 2 hours unused
const EXPIRATION_CHECK_MILLIS = 5 * 60 * 1000; // check for expiration every 5 mins
const PUBLIC_FILE_DIR = path.join(__dirname, '../../public');
const SPA_INDEX_FILE = path.join(PUBLIC_FILE_DIR, 'index.html');

// Initialize configuration.

loadAndCheckEnvVars(true);
const devMode = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.CAVESITE_PORT!);

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
app.use(sessionware);

// Set up application routes.

app.use(express.static(PUBLIC_FILE_DIR));
app.use('/api/auth', authApi);
app.use('/api/user', userApi);
app.use('/api/taxa', taxaApi);
app.use('/api/location', locationApi);
app.use('/api/specimenApi', specimenApi);
app.use('/api/cluster', clusterApi);
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
  await checkAllEmails();
  await connectDB({
    host: process.env.CAVESITE_DB_HOST,
    database: process.env.CAVESITE_DB_NAME,
    port: parseInt(process.env.CAVESITE_DB_PORT!),
    user: process.env.CAVESITE_DB_USER,
    password: process.env.CAVESITE_DB_PASSWORD
  });
  await Session.init(getDB(), {
    sessionTimeoutMillis: SESSION_TIMEOUT_MILLIS,
    expirationCheckMillis: EXPIRATION_CHECK_MILLIS
  });
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  console.log(`Server listening on port ${port}`);
});
