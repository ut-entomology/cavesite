export const CSRF_TOKEN_HEADER = 'X-XSRF-TOKEN';

export enum Permission {
  // values are bit flags and therefore powers of 2
  Admin = 1, // add/remove users and reset passwords; implies Edit/Coords
  Edit = 2, // modify data, such as the precise coordinates; implies Coords
  Coords = 4 // can see precise coordinates
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
  hiddenRoutes: string[];
  preloadData: boolean;
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
