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

describe('account sync helpers', () => {
  it('remembers deletions until the account has them', async () => {
    const { createDoc, deleteDoc, deletedIds, forgetDeleted } = await import('../src/docs');
    const a = createDoc();
    deleteDoc(a.id);
    expect(deletedIds()).toEqual([a.id]);
    forgetDeleted([a.id]);
    expect(deletedIds()).toEqual([]);
  });

  it('merges account copies: newer wins, local newer stays, deletions apply', async () => {
    const { createDoc, getDoc, listDocs, mergeDocs, saveDoc } = await import('../src/docs');
    const a = createDoc({ title: 'A' });
    const b = createDoc({ title: 'B' });
    saveDoc(b.id, { title: 'B local edit' });
    const old = '2000-01-01T00:00:00.000Z';
    const future = '2999-01-01T00:00:00.000Z';
    mergeDocs(
      [
        { ...a, title: 'A from phone', updatedAt: future },
        { ...getDoc(b.id)!, title: 'B stale', updatedAt: old },
        { id: '99999999-2222-4333-8444-555555555555', title: 'Only in account', data: {}, createdAt: old, updatedAt: old },
      ],
      [],
    );
    expect(getDoc(a.id)!.title).toBe('A from phone');
    expect(getDoc(b.id)!.title).toBe('B local edit');
    expect(getDoc('99999999-2222-4333-8444-555555555555')!.title).toBe('Only in account');
    mergeDocs([], [a.id]);
    expect(listDocs().map((d) => d.id)).not.toContain(a.id);
  });
});
