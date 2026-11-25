import { handleConfig } from '../../server/handlers.js';
import type { CfEnv } from '../_env.js';

export const onRequestGet: PagesFunction<CfEnv> = ({ env }) => handleConfig(env, !!env.BROWSER);
