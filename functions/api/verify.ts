import { handleVerify } from '../../server/handlers.js';
import type { CfEnv } from '../_env.js';

export const onRequestPost: PagesFunction<CfEnv> = ({ request, env }) => handleVerify(request, env);
