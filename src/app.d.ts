/// <reference types="@sveltejs/kit" />

import type { User } from './model/user';

declare global {
  declare namespace App {
    interface Locals {
      user: User | null;
      sessionID: string | null;
    }
    // interface Platform {}
    // interface Session {}
    // interface Stuff {}
  }
}
