import { handleAi } from '../../server/ai.js';
import type { CfEnv } from '../_env.js';

export const onRequestPost: PagesFunction<CfEnv> = ({ request, env }) => handleAi(request, env);
