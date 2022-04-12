import type { UserInfo } from '../shared/user_auth';

declare module 'express-session' {
  interface SessionData {
    user: UserInfo;
  }
}
