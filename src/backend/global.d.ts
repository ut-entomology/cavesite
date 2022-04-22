import type { Session } from '../backend/model/session';

declare module 'express-serve-static-core' {
  interface Request {
    session?: Session;
    setSession: (session: Session | null) => void;
  }
}
