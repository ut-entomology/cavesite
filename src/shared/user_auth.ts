/**
 * Types and structures for managing user authentication.
 */

import { QueryColumnID } from './general_query';

export const CSRF_TOKEN_HEADER = 'X-XSRF-TOKEN';

export enum Permission {
  // values are bit flags and therefore powers of 2
  None = 0,
  Admin = 1, // add/remove users, reset passwords, schedule uploads; implies Edit
  Edit = 2, // modify server-side data
  Coords = 4 // placeholder permission, needed for testing functioning of permission
}

export interface UserInfo {
  userID: number;
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string | null;
  permissions: number;
  priorLoginDate: Date | null;
  priorLoginIP: string | null;
  lastLoginDate: Date | null;
  lastLoginIP: string | null;
}

export interface AdminUserInfo extends UserInfo {
  createdOn: Date;
  createdByName: string | null;
}

export type NewUserInfo = Omit<UserInfo, 'lastLoginDate' | 'lastLoginIP'>;

export interface AppInfo {
  appTitle: string;
  appSubtitle: string;
  welcomeHTML: string;
  defaultQueryFields: QueryColumnID[];
  hiddenRoutes: string[];
  mapToken: string;
}

export interface LoginInfo extends AppInfo {
  userInfo?: UserInfo;
  expiration?: number;
}

export interface PasswordChangeInfo {
  oldPassword: string;
  newPassword: string;
}

export interface PasswordResetInfo {
  email: string;
  resetCode: string;
  password: string;
}

export function toResetQueryStr(email: string, resetCode: string) {
  return `?action=reset&email=${encodeURI(email)}&code=${resetCode}`;
}
