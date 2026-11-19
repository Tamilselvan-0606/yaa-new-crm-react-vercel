import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DOCUMENT_NUMBER_ERROR_MESSAGE,
  HSN_CODE_ERROR_MESSAGE,
  isValidDocumentNumber,
  isValidHsnCode,
  sanitizeDocumentNumberInput,
  sanitizeHsnCodeInput,
} from '../src/utils/validation';

describe('Client Management Invoice / Proforma Number validation', () => {
  it('allows letters, numbers, and hyphens (-) only', () => {
    assert.equal(isValidDocumentNumber('INV-2026-001'), true);
    assert.equal(isValidDocumentNumber('PI-0001'), true);
    assert.equal(isValidDocumentNumber('ABC123'), true);
    assert.equal(sanitizeDocumentNumberInput('INV-2026-001'), 'INV-2026-001');
  });

  it('strips all special characters except hyphen (-) during input', () => {
    assert.equal(sanitizeDocumentNumberInput('INV@2026#001!'), 'INV2026001');
    assert.equal(sanitizeDocumentNumberInput('PI/2026_001$%^'), 'PI2026001');
    assert.equal(sanitizeDocumentNumberInput('INV - 2026*01'), 'INV-202601');
    assert.equal(sanitizeDocumentNumberInput('PRO-2026-01+()'), 'PRO-2026-01');
  });

  it('rejects empty or special-character document numbers in validation', () => {
    assert.equal(isValidDocumentNumber(''), false);
    assert.equal(isValidDocumentNumber('   '), false);
    assert.equal(isValidDocumentNumber('INV@2026'), false);
    assert.equal(isValidDocumentNumber('PI/2026/001'), false);
    assert.equal(isValidDocumentNumber('INV_2026'), false);
    assert.equal(isValidDocumentNumber('INV 2026'), false);
    assert.ok(DOCUMENT_NUMBER_ERROR_MESSAGE.includes('-'));
  });
});

describe('Client & Sale Management HSN / SAC Code validation', () => {
  it('allows digits only and strips letters/symbols on input', () => {
    assert.equal(sanitizeHsnCodeInput('998314'), '998314');
    assert.equal(sanitizeHsnCodeInput('abc9983xyz'), '9983');
    assert.equal(sanitizeHsnCodeInput('84-71@#'), '8471');
    assert.equal(sanitizeHsnCodeInput('HSN 8517'), '8517');
  });

  it('validates HSN codes as optional or digits only', () => {
    assert.equal(isValidHsnCode(''), true);
    assert.equal(isValidHsnCode('998314'), true);
    assert.equal(isValidHsnCode('8471'), true);
    assert.equal(isValidHsnCode('ABC123'), false);
    assert.equal(isValidHsnCode('9983-14'), false);
    assert.ok(HSN_CODE_ERROR_MESSAGE.toLowerCase().includes('digit'));
  });
});
