import { describe, it } from 'node:test';
import assert from 'node:assert';
import { numberToWordsIndian } from '../src/utils/printUtils';

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
