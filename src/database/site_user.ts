import type { UserRow } from './schema';

export class SiteUser implements UserRow {
	userID: number;
	username: string;
	passwordHash: string;
	privileges: string;
	email: string;
	createdOn: Date;
	createdBy: number | null;
	lastLogin: Date | null;

	constructor(row: UserRow) {
		this.userID = row.userID;
		this.username = row.username;
		this.passwordHash = row.passwordHash;
		this.privileges = row.privileges;
		this.email = row.email;
		this.createdOn = row.createdOn;
		this.createdBy = row.createdBy;
		this.lastLogin = row.lastLogin;
	}
}
