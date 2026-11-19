import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  IMAGE_ALLOWED_EXTENSIONS,
  IMAGE_ALLOWED_MIME_TYPES,
  IMAGE_FILE_ACCEPT,
  PRODUCT_ITEM_IMAGE_ACCEPT,
  PRODUCT_ITEM_IMAGE_EXTENSIONS,
  PRODUCT_ITEM_IMAGE_MIME_TYPES,
  validateImageFile,
} from '../src/views/sale-management/utils/imageUpload';

describe('Sale Management image upload validation', () => {
  it('accepts standard image files with matching MIME type and extension', () => {
    const cases = [
      { name: 'photo.png', type: 'image/png', size: 1024 },
      { name: 'PHOTO.JPG', type: 'image/jpeg', size: 2048 },
      { name: 'banner.jpeg', type: 'image/jpeg', size: 2048 },
      { name: 'avatar.webp', type: 'image/webp', size: 512 },
      { name: 'anim.gif', type: 'image/gif', size: 4096 },
      { name: 'scan.bmp', type: 'image/bmp', size: 4096 },
      { name: 'logo.svg', type: 'image/svg+xml', size: 1024 },
      { name: 'pic.avif', type: 'image/avif', size: 1024 },
    ];

    for (const file of cases) {
      const result = validateImageFile(file);
      assert.deepEqual(result, { valid: true }, `Expected ${file.name} (${file.type}) to be accepted`);
    }
  });

  it('rejects all non-image files (PDF, Word, Excel, text, CSV, archives, video, executable)', () => {
    const invalidFiles = [
      { name: 'invoice.pdf', type: 'application/pdf', size: 1024 },
      { name: 'quote.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 },
      { name: 'sheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 1024 },
      { name: 'customers.csv', type: 'text/csv', size: 512 },
      { name: 'notes.txt', type: 'text/plain', size: 256 },
      { name: 'archive.zip', type: 'application/zip', size: 2048 },
      { name: 'clip.mp4', type: 'video/mp4', size: 4096 },
      { name: 'audio.mp3', type: 'audio/mpeg', size: 4096 },
      { name: 'installer.exe', type: 'application/x-msdownload', size: 4096 },
      { name: 'script.js', type: 'text/javascript', size: 256 },
    ];

    for (const file of invalidFiles) {
      const result = validateImageFile(file);
      assert.equal(result.valid, false, `Expected ${file.name} (${file.type}) to be rejected`);
    }
  });

  it('rejects files with spoofed MIME or mismatched non-image extensions', () => {
    const spoofed = [
      { name: 'fake.png', type: 'application/pdf', size: 1024 },
      { name: 'fake.jpg', type: 'text/plain', size: 1024 },
      { name: 'document.pdf', type: 'image/png', size: 1024 },
      { name: 'payload.exe', type: 'image/jpeg', size: 1024 },
      { name: 'scan.tiff', type: 'image/tiff', size: 1024 },
    ];

    for (const file of spoofed) {
      const result = validateImageFile(file);
      assert.equal(result.valid, false, `Expected ${file.name} (${file.type}) to be rejected`);
    }
  });

  it('handles empty MIME safely by checking filename extension strictly', () => {
    assert.deepEqual(validateImageFile({ name: 'photo.webp', type: '', size: 100 }), { valid: true });
    assert.equal(validateImageFile({ name: 'invoice.pdf', type: '', size: 100 }).valid, false);
    assert.equal(validateImageFile({ name: 'noextension', type: '', size: 100 }).valid, false);
    assert.equal(validateImageFile({ name: 'bad.', type: '', size: 100 }).valid, false);
  });

  it('enforces maxSizeBytes when configured', () => {
    const fiveMb = 5 * 1024 * 1024;
    assert.deepEqual(
      validateImageFile({ name: 'ok.png', type: 'image/png', size: fiveMb }, { maxSizeBytes: fiveMb }),
      { valid: true },
    );
    const oversized = validateImageFile(
      { name: 'big.png', type: 'image/png', size: fiveMb + 1 },
      { maxSizeBytes: fiveMb, tooLargeMessage: 'Too large' },
    );
    assert.deepEqual(oversized, { valid: false, error: 'Too large' });
  });

  it('supports restricted product item image subsets and exposes explicit accept strings', () => {
    const opts = {
      allowedMimeTypes: PRODUCT_ITEM_IMAGE_MIME_TYPES,
      allowedExtensions: PRODUCT_ITEM_IMAGE_EXTENSIONS,
    };
    assert.deepEqual(validateImageFile({ name: 'item.jpg', type: 'image/jpeg', size: 500 }, opts), { valid: true });
    assert.equal(validateImageFile({ name: 'item.svg', type: 'image/svg+xml', size: 500 }, opts).valid, false);
    assert.equal(validateImageFile({ name: 'item.pdf', type: 'application/pdf', size: 500 }, opts).valid, false);

    assert.ok(!IMAGE_FILE_ACCEPT.includes('*'));
    assert.ok(!PRODUCT_ITEM_IMAGE_ACCEPT.includes('*'));
    for (const ext of IMAGE_ALLOWED_EXTENSIONS) {
      assert.ok(IMAGE_FILE_ACCEPT.includes(ext));
    }
    for (const mime of IMAGE_ALLOWED_MIME_TYPES) {
      assert.ok(IMAGE_FILE_ACCEPT.includes(mime));
    }
  });
});
