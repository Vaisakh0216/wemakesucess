// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules(); // docs.ts caches the list in module state
});

describe('My Documents store', () => {
  it('migrates the old single draft, keeping its id so a past purchase still applies', async () => {
    localStorage.setItem('wms.draft.v1', JSON.stringify({ contact: { name: 'Old Draft' } }));
    localStorage.setItem('wms.rid.v1', '11111111-2222-4333-8444-555555555555');
    const { listDocs } = await import('../src/docs');
    const docs = listDocs();
    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe('11111111-2222-4333-8444-555555555555');
    expect(docs[0].data.contact.name).toBe('Old Draft');
  });

  it('creates, renames, duplicates and deletes documents', async () => {
    const { createDoc, duplicateDoc, deleteDoc, listDocs, saveDoc } = await import('../src/docs');
    const a = createDoc({ template: 'classic' });
    expect(a.data.template).toBe('classic');
    saveDoc(a.id, { title: 'For Infosys', tags: ['IT'] });
    const b = duplicateDoc(a.id)!;
    expect(b.title).toBe('For Infosys (copy)');
    expect(b.id).not.toBe(a.id);
    expect(listDocs()).toHaveLength(2);
    deleteDoc(a.id);
    expect(listDocs().map((d) => d.id)).toEqual([b.id]);
    // persisted
    vi.resetModules();
    const again = await import('../src/docs');
    expect(again.listDocs()[0].title).toBe('For Infosys (copy)');
  });

  it('keeps purchases per document', async () => {
    const { loadUnlock, saveUnlock } = await import('../src/payments');
    saveUnlock({ rid: 'a', orderId: 'order_A', token: 't1' });
    saveUnlock({ rid: 'b', orderId: 'order_B', token: 't2' });
    expect(loadUnlock('a')?.orderId).toBe('order_A');
    expect(loadUnlock('b')?.orderId).toBe('order_B');
    expect(loadUnlock('c')).toBeNull();
  });
});
