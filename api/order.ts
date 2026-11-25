import { handleOrder } from '../server/handlers.js';
import { env } from './_env.js';

export function POST(request: Request): Promise<Response> {
  return handleOrder(request, env());
}
