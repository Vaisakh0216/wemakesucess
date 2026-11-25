import { handleAi } from '../server/ai.js';
import { env } from './_env.js';

export function POST(request: Request): Promise<Response> {
  return handleAi(request, env());
}
