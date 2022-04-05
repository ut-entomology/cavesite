/// <reference types="@sveltejs/kit" />

import type { User } from './model/user';

declare global {
  declare namespace App {
    interface Locals {
      user: User | null;
      sessionID: string | null;
    }
    // interface Platform {}
    interface Session {
      user?: {
        firstName: string;
        lastName: string;
        email: string;
        affiliation: string | null;
        permissions: number;
        lastLoginDate: Date | null;
        lastLoginIP: string | null;
      };
    }
    // interface Stuff {}
  }
}
