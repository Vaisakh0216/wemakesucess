import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleAi } from '../server/ai';

const env = { ANTHROPIC_API_KEY: 'sk-test', SUPABASE_URL: 'https://sb.test', SUPABASE_ANON_KEY: 'anon', AI_DAILY_LIMIT: '5' };
const req = (body: unknown, token: string | null = 'jwt') =>
  new Request('http://x/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

function fakeClaude(reply: object | 'refusal') {
  const create = vi.fn(async () =>
    reply === 'refusal'
      ? { stop_reason: 'refusal', content: [] }
      : { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(reply) }] },
  );
  return { client: { beta: { messages: { create } } } as any, create };
}

function supabaseLeft(left: number | 'unauthorized') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://sb.test/rest/v1/rpc/use_ai_credit');
      expect((init.headers as Record<string, string>).authorization).toBe('Bearer jwt');
      expect(JSON.parse(init.body as string)).toEqual({ p_limit: 5 });
      return left === 'unauthorized' ? new Response('{}', { status: 401 }) : Response.json(left);
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('AI writing help', () => {
  it('is off without keys and needs a signed-in user', async () => {
    expect((await handleAi(req({ kind: 'summary' }), {})).status).toBe(503);
    expect((await handleAi(req({ kind: 'summary' }, null), env)).status).toBe(401);
    supabaseLeft('unauthorized');
    expect((await handleAi(req({ kind: 'summary', context: { title: 'Engineer' } }), env, fakeClaude({}).client)).status).toBe(401);
  });

  it('enforces the daily limit before calling Claude', async () => {
    supabaseLeft(-1);
    const { client, create } = fakeClaude({ suggestions: ['x'] });
    const res = await handleAi(req({ kind: 'summary', context: { title: 'Engineer' } }), env, client);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'daily_limit' });
    expect(create).not.toHaveBeenCalled();
  });

  it('returns cleaned suggestions and what is left today', async () => {
    supabaseLeft(3);
    const { client, create } = fakeClaude({ suggestions: ['- Led a team of [N]', '  ', '• Cut costs by [X%]'] });
    const res = await handleAi(req({ kind: 'bullets', context: { title: 'Engineer', role: 'SDE', text: 'Built APIs' } }), env, client);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ suggestions: ['Led a team of [N]', 'Cut costs by [X%]'], remaining: 3 });
    const args = (create.mock.calls[0] as any[])[0];
    expect(args.model).toBe('claude-opus-5-5');
    expect(args.output_config.format.type).toBe('json_schema');
    expect(args.messages[0].content).toContain('Built APIs');
  });

  it('rejects bad input and reports refusals', async () => {
    expect((await handleAi(req({ kind: 'poem' }), env)).status).toBe(400);
    expect((await handleAi(req({ kind: 'improve', context: { title: 'X' } }), env)).status).toBe(400);
    supabaseLeft(2);
    expect((await handleAi(req({ kind: 'summary', context: { title: 'X' } }), env, fakeClaude('refusal').client)).status).toBe(422);
  });
});
