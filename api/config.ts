import { handleConfig } from '../server/handlers.js';
import { env } from './_env.js';

export function GET(): Response {
  return handleConfig(env(), true);
}
