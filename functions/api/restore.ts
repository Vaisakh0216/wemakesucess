import { handleRestore } from '../../server/handlers.js';
import type { CfEnv } from '../_env.js';

export const onRequestPost: PagesFunction<CfEnv> = ({ request, env }) => handleRestore(request, env);
