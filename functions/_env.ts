import type { Env } from '../server/env.js';

/** Cloudflare Pages bindings: the shared settings plus the Browser Rendering binding. */
export interface CfEnv extends Env {
  BROWSER?: Fetcher;
}
