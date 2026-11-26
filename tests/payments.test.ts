import { afterEach, describe, expect, it, vi } from 'vitest';
import { hmacHex, signUnlock, verifyRazorpaySignature, verifyUnlock } from '../server/crypto';
import { handleConfig, handleOrder, handlePdf, handleRestore, handleUpiClaim, handleVerify } from '../server/handlers';
import { refFor, upiLink } from '../src/shared/upi';

const order = (c: { request: Request; env: any }) => handleOrder(c.request, c.env);
const verify = (c: { request: Request; env: any }) => handleVerify(c.request, c.env);
const restore = (c: { request: Request; env: any }) => handleRestore(c.request, c.env);
const config = (c: { env: any }) => handleConfig(c.env, false);

const env = { RAZORPAY_KEY_ID: 'rzp_test_abc', RAZORPAY_KEY_SECRET: 'sek', UNLOCK_SECRET: 'unlock-secret', } as any;
const RID = '3f2b8c1e-5d4a-4b6f-9e2d-1a2b3c4d5e6f';
const ctx = (body: unknown, e = env) =>
  ({ request: new Request('https://x/api', { method: 'POST', body: JSON.stringify(body) }), env: e }) as any;
const rzOrder = (over: object = {}) => ({
  id: 'order_ABC123456',
  amount: 29900,
  amount_paid: 29900,
  currency: 'INR',
  status: 'paid',
  receipt: 'r',
  notes: { rid: RID },
  ...over,
});
const mockRazorpay = (o: object | null) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/orders') && init?.method === 'POST') {
        const b = JSON.parse(String(init.body));
        return Response.json({ ...rzOrder({ status: 'created', amount_paid: 0 }), amount: b.amount, notes: b.notes });
      }
      return o ? Response.json(o) : new Response('{}', { status: 404 });
    }),
  );
afterEach(() => vi.unstubAllGlobals());

describe('config', () => {
  it('shares Supabase settings only when both are set', async () => {
    const off = await handleConfig({ SUPABASE_URL: 'https://x.supabase.co' }, false).json();
    expect(off.auth).toBeNull();
    const on = await handleConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' }, false).json();
    expect(on.auth).toEqual({ url: 'https://x.supabase.co', anonKey: 'anon' });
  });
});

describe('unlock tokens', () => {
  it('round-trips and rejects tampering', async () => {
    const t = await signUnlock({ rid: RID, oid: 'order_1', iat: 1 }, 's');
    expect(await verifyUnlock(t, 's')).toEqual({ rid: RID, oid: 'order_1', iat: 1 });
    expect(await verifyUnlock(t, 'other')).toBeNull();
    const [body, sig] = t.split('.');
    const forged = btoa(JSON.stringify({ rid: 'x', oid: 'order_1', iat: 1 })).replace(/=+$/, '');
    expect(await verifyUnlock(`${forged}.${sig}`, 's')).toBeNull();
    expect(await verifyUnlock(`${body}.`, 's')).toBeNull();
    expect(await verifyUnlock(42, 's')).toBeNull();
  });
  it('checks Razorpay signatures', async () => {
    const sig = await hmacHex('sek', 'order_1|pay_1');
    expect(await verifyRazorpaySignature('order_1', 'pay_1', sig, 'sek')).toBe(true);
    expect(await verifyRazorpaySignature('order_1', 'pay_2', sig, 'sek')).toBe(false);
  });
});

describe('/api/config', () => {
  it('reports demo mode without keys', async () => {
    const r = await (await config({ env: {} } as any)).json();
    expect(r).toMatchObject({ payments: false, serverPdf: false });
  });
  it('reports test mode with test keys and never leaks the secret', async () => {
    const text = await (await config({ env } as any)).text();
    expect(JSON.parse(text)).toMatchObject({ payments: true, testMode: true, amount: 29900 });
    expect(text).not.toContain('sek');
  });
});

describe('/api/order', () => {
  it('creates a ₹299 order tagged with the resume id', async () => {
    mockRazorpay(null);
    const res = await order(ctx({ rid: RID, amount: 1 }));
    const b = await res.json();
    expect(b).toMatchObject({ orderId: 'order_ABC123456', amount: 29900, keyId: 'rzp_test_abc' });
    const sent = JSON.parse(String((fetch as any).mock.calls[0][1].body));
    expect(sent).toMatchObject({ amount: 29900, currency: 'INR', notes: { rid: RID } });
  });
  it('rejects bad ids and unconfigured servers', async () => {
    expect((await order(ctx({ rid: 'nope' }))).status).toBe(400);
    expect((await order(ctx({ rid: RID }, {}))).status).toBe(503);
  });
});

describe('/api/verify', () => {
  const body = async (over: object = {}) => ({
    rid: RID,
    razorpay_order_id: 'order_ABC123456',
    razorpay_payment_id: 'pay_1',
    razorpay_signature: await hmacHex('sek', 'order_ABC123456|pay_1'),
    ...over,
  });
  it('issues a token for a correctly signed payment', async () => {
    mockRazorpay(rzOrder());
    const res = await verify(ctx(await body()));
    expect(res.status).toBe(200);
    const { token } = await res.json();
    expect((await verifyUnlock(token, 'unlock-secret'))?.rid).toBe(RID);
  });
  it('rejects a forged signature', async () => {
    mockRazorpay(rzOrder());
    expect((await verify(ctx(await body({ razorpay_signature: 'f'.repeat(64) })))).status).toBe(400);
  });
  it('rejects an order bought for a different resume', async () => {
    mockRazorpay(rzOrder({ notes: { rid: '00000000-0000-4000-8000-000000000000' } }));
    expect((await verify(ctx(await body()))).status).toBe(400);
  });
});

describe('/api/restore', () => {
  it('restores a paid order for the same resume', async () => {
    mockRazorpay(rzOrder());
    expect((await restore(ctx({ rid: RID, orderId: 'order_ABC123456' }))).status).toBe(200);
  });
  it('refuses unpaid orders and other resumes', async () => {
    mockRazorpay(rzOrder({ status: 'attempted', amount_paid: 0 }));
    expect((await restore(ctx({ rid: RID, orderId: 'order_ABC123456' }))).status).toBe(404);
    mockRazorpay(rzOrder({ notes: { rid: '00000000-0000-4000-8000-000000000000' } }));
    expect((await restore(ctx({ rid: RID, orderId: 'order_ABC123456' }))).status).toBe(403);
  });
});

describe('/api/pdf', () => {
  const resume = { contact: { name: 'Asha Rao' } };
  const render = vi.fn(async (html: string) => new TextEncoder().encode(html));
  const pdfCtx = (body: unknown) => new Request('https://site.example/api/pdf', { method: 'POST', body: JSON.stringify(body) });
  it('renders only with a valid token for the same resume', async () => {
    const token = await signUnlock({ rid: RID, oid: 'order_1', iat: 1 }, 'unlock-secret');
    const ok = await handlePdf(pdfCtx({ rid: RID, token, resume }), env, render);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-disposition')).toContain('Asha_Rao_Resume.pdf');
    const html = await ok.text();
    expect(html).toContain('https://site.example/fonts/');
    expect(html).toContain('Asha Rao');
    const other = await handlePdf(pdfCtx({ rid: '00000000-0000-4000-8000-000000000000', token, resume }), env, render);
    expect(other.status).toBe(402);
    expect((await handlePdf(pdfCtx({ rid: RID, token: 'x.y', resume }), env, render)).status).toBe(402);
  });
  it('reports when no renderer is available', async () => {
    expect((await handlePdf(pdfCtx({}), env, null)).status).toBe(501);
  });
});

describe('cover letters (₹99)', () => {
  const render = vi.fn(async (html: string) => new TextEncoder().encode(html));
  const pdfReq = (body: unknown) => new Request('https://site.example/api/pdf', { method: 'POST', body: JSON.stringify(body) });
  const coverNotes = { rid: RID, product: 'pdf_unlock_one_cover_letter' };

  it('creates a ₹99 order tagged as a cover letter', async () => {
    mockRazorpay(null);
    const res = await order(ctx({ rid: RID, product: 'cover' }));
    expect(res.status).toBe(200);
    expect((await res.json()).amount).toBe(9900);
  });

  it('issues a cover-only token for a ₹99 order, and rejects a ₹99 order posing as a resume', async () => {
    mockRazorpay(rzOrder({ amount: 9900, amount_paid: 9900, notes: coverNotes }));
    const res = await verify(ctx({ rid: RID, razorpay_order_id: 'order_ABC123456', razorpay_payment_id: 'pay_1', razorpay_signature: await hmacHex('sek', 'order_ABC123456|pay_1') }));
    expect(res.status).toBe(200);
    expect((await verifyUnlock((await res.json()).token, 'unlock-secret'))?.p).toBe('cover');
    mockRazorpay(rzOrder({ amount: 9900, amount_paid: 9900 }));
    expect((await restore(ctx({ rid: RID, orderId: 'order_ABC123456' }))).status).toBe(404);
  });

  it('a cover token renders only cover letters, and a resume token only resumes', async () => {
    const coverToken = await signUnlock({ rid: RID, oid: 'order_1', iat: 1, p: 'cover' }, 'unlock-secret');
    const resumeToken = await signUnlock({ rid: RID, oid: 'order_2', iat: 1 }, 'unlock-secret');
    const cover = { contact: { name: 'Asha Rao' }, recipient: { company: 'Infosys' }, body: 'Para one.\n\nPara two.' };
    const ok = await handlePdf(pdfReq({ rid: RID, token: coverToken, kind: 'cover', cover }), env, render);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-disposition')).toContain('Asha_Rao_Cover_Letter_Infosys.pdf');
    expect(await ok.text()).toContain('<p>Para two.</p>');
    expect((await handlePdf(pdfReq({ rid: RID, token: coverToken, resume: { contact: { name: 'X' } } }), env, render)).status).toBe(402);
    expect((await handlePdf(pdfReq({ rid: RID, token: resumeToken, kind: 'cover', cover }), env, render)).status).toBe(402);
  });
});

describe('pay by UPI QR (until Razorpay is set up)', () => {
  const upiReq = (body: unknown) => new Request('https://x/api/upi', { method: 'POST', body: JSON.stringify(body) });
  it('offers UPI only while Razorpay is not configured, and can be turned off', async () => {
    expect((await (await config({ env: {} })).json()).upi).toEqual({ id: '8921630688@pthdfc', name: 'wemakesucess' });
    expect((await (await config({ env })).json()).upi).toBeNull();
    expect((await (await config({ env: { UPI_ID: 'off' } })).json()).upi).toBeNull();
  });
  it('builds a upi://pay link with the amount and a reference to the document', () => {
    const link = upiLink({ id: '8921630688@pthdfc', name: 'wemakesucess', rupees: 299, note: `${refFor(RID)} resume` });
    expect(link).toBe('upi://pay?pa=8921630688%40pthdfc&pn=wemakesucess&am=299.00&cu=INR&tn=WMS3F2B8C1E%20resume');
  });
  it('unlocks with a 12-digit UPI reference, logs it, and signs a token of the right product', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const e = { UNLOCK_SECRET: 'unlock-secret' };
    const res = await handleUpiClaim(upiReq({ rid: RID, utr: '4335 1234 5678', product: 'cover' }), e);
    expect(res.status).toBe(200);
    const { orderId, token } = await res.json();
    expect(orderId).toBe('upi_433512345678');
    expect(await verifyUnlock(token, 'unlock-secret')).toMatchObject({ rid: RID, oid: orderId, p: 'cover' });
    expect(String(log.mock.calls[0][0])).toContain('"event":"upi_claim"');
    expect(String(log.mock.calls[0][0])).toContain('"rupees":99');
    log.mockRestore();
  });
  it('rejects bad references, and works without a signing secret (browser print)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect((await handleUpiClaim(upiReq({ rid: RID, utr: '12345' }), {})).status).toBe(400);
    expect((await handleUpiClaim(upiReq({ rid: 'x', utr: '433512345678' }), {})).status).toBe(400);
    expect((await handleUpiClaim(upiReq({ rid: RID, utr: '433512345678' }), env)).status).toBe(503);
    const r = await (await handleUpiClaim(upiReq({ rid: RID, utr: '433512345678' }), {})).json();
    expect(r.token).toBeUndefined();
  });
  it('needs a signed-in account when sign-in is on, and names it in the log', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const e = { SUPABASE_URL: 'https://sb.example', SUPABASE_ANON_KEY: 'anon', UNLOCK_SECRET: 'unlock-secret' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) =>
        String(url) === 'https://sb.example/auth/v1/user' && new Headers(init?.headers).get('authorization') === 'Bearer good'
          ? Response.json({ id: 'user-1', email: 'asha@example.com' })
          : new Response('{}', { status: 401 }),
      ),
    );
    const req = (token?: string) =>
      new Request('https://x/api/upi', {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({ rid: RID, utr: '433512345678' }),
      });
    expect((await handleUpiClaim(req(), e)).status).toBe(401);
    expect((await handleUpiClaim(req('forged'), e)).status).toBe(401);
    const ok = await handleUpiClaim(req('good'), e);
    expect(ok.status).toBe(200);
    expect(String(log.mock.calls.at(-1)?.[0])).toContain('"account":"asha@example.com"');
    log.mockRestore();
  });
});
