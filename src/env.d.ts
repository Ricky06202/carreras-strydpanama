import type { Database } from '../lib/db';

declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: {
          DB: Database;
        };
      };
    }
  }
}