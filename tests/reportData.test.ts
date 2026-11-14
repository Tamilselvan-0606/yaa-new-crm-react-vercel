import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllReportRows } from '../src/utils/reportData';

describe('fetchAllReportRows', () => {
  it('walks every page until hasNextPage is false', async () => {
    const calls: number[] = [];
    const rows = await fetchAllReportRows<number>(async (page) => {
      calls.push(page);
      return { items: [page * 10, page * 10 + 1], hasNextPage: page < 3 };
    });
    assert.deepEqual(calls, [1, 2, 3]);
    assert.deepEqual(rows, [10, 11, 20, 21, 30, 31]);
  });

  it('stops using totalPages when hasNextPage is absent', async () => {
    const calls: number[] = [];
    await fetchAllReportRows<number>(async (page) => {
      calls.push(page);
      return { items: [1], totalPages: 2 };
    });
    assert.deepEqual(calls, [1, 2]);
  });

  it('stops using totalRecords when only that is sent', async () => {
    const calls: number[] = [];
    const rows = await fetchAllReportRows<number>(async (page, size) => {
      calls.push(page);
      return { items: Array.from({ length: size }, (_, i) => i), totalRecords: 250 };
    }, 100);
    assert.deepEqual(calls, [1, 2, 3]);
    assert.equal(rows.length, 300);
  });

  it('stops on a short page when the API sends no pagination info', async () => {
    const calls: number[] = [];
    const rows = await fetchAllReportRows<number>(async (page, size) => {
      calls.push(page);
      return { items: page === 1 ? Array.from({ length: size }, () => 1) : [1, 2] };
    }, 5);
    assert.deepEqual(calls, [1, 2]);
    assert.equal(rows.length, 7);
  });

  it('stops on an empty page and returns nothing for an empty list', async () => {
    assert.deepEqual(await fetchAllReportRows<number>(async () => ({ items: [], hasNextPage: true })), []);
  });

  it('propagates API errors so no partial report is produced', async () => {
    await assert.rejects(
      fetchAllReportRows<number>(async (page) => {
        if (page === 2) throw new Error('boom');
        return { items: [1], hasNextPage: true };
      }),
      /boom/,
    );
  });
});
