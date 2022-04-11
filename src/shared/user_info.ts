export enum Permission {
  // values are bit flags and therefore powers of 2
  Admin = 1, // add/remove users and reset passwords; implies Edit/Coords
  Edit = 2, // modify data, such as the precise coordinates; implies Coords
  Coords = 4 // can see precise coordinates
}

export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string | null;
  permissions: number;
  lastLoginDate: Date | null;
  lastLoginIP: string | null;
}
