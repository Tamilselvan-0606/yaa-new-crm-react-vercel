import { describe, it } from 'node:test';
import assert from 'node:assert';
// printUtils pulls in app code that reads localStorage when it loads; Node has none, so give it a small stand-in
// and import the module afterwards.
const memory = new Map<string, string>();
(globalThis as any).localStorage ??= {
  getItem: (k: string) => (memory.has(k) ? memory.get(k)! : null),
  setItem: (k: string, v: string) => void memory.set(k, String(v)),
  removeItem: (k: string) => void memory.delete(k),
  clear: () => memory.clear(),
  key: (i: number) => Array.from(memory.keys())[i] ?? null,
  get length() {
    return memory.size;
  },
};
const { numberToWordsIndian } = await import('../src/utils/printUtils');

describe('Print Utilities & Financial Formatting', () => {
  it('converts small integer amounts to Indian currency words', () => {
    assert.strictEqual(numberToWordsIndian(500), 'Five Hundred Rupees Only');
    assert.strictEqual(numberToWordsIndian(1250), 'One Thousand Two Hundred Fifty Rupees Only');
  });

  it('converts lakh and crore amounts correctly', () => {
    assert.strictEqual(numberToWordsIndian(100000), 'One Lakh Rupees Only');
    assert.strictEqual(numberToWordsIndian(1500000), 'Fifteen Lakh Rupees Only');
    assert.strictEqual(numberToWordsIndian(10000000), 'One Crore Rupees Only');
  });

  it('converts decimal paisa amounts correctly', () => {
    assert.strictEqual(numberToWordsIndian(125.50), 'One Hundred Twenty Five Rupees and Fifty Paise Only');
    assert.strictEqual(numberToWordsIndian(0.75), 'Seventy Five Paise Only');
  });

  it('handles zero gracefully', () => {
    assert.strictEqual(numberToWordsIndian(0), 'Zero Rupees Only');
  });
});
