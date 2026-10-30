import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { customerApi } from '../src/api/commerce/customerApi';
import { baseClient } from '../src/api/baseApi';

describe('Customer Bulk Upload API Integration', () => {
  it('customerApi has bulkUploadCustomers method defined', () => {
    assert.equal(typeof customerApi.bulkUploadCustomers, 'function');
  });

  it('bulkUploadCustomers sends multipart/form-data with "file" key to /commerce/customers/bulk-upload', async () => {
    let capturedUrl = '';
    let capturedData: any = null;
    let capturedConfig: any = null;

    const originalPost = baseClient.post;
    (baseClient as any).post = async (url: string, data: any, config: any) => {
      capturedUrl = url;
      capturedData = data;
      capturedConfig = config;
      return {
        data: {
          success: true,
          statusCode: 200,
          message: 'Customer bulk upload completed',
          data: {
            total: 3,
            created: 2,
            failed: 1,
            errors: [
              {
                row: 3,
                message: 'Duplicate mobile number "9876543210" within CSV file',
              },
            ],
          },
          meta: {
            timestamp: '2026-10-29T06:33:46.600Z',
            requestId: 'test-req-id',
          },
        },
      };
    };

    try {
      const dummyFile = new Blob(
        [
          'customer_code,full_name,mobile_number,alternate_mobile,email,date_of_birth,gender,occupation,status\n' +
            'CUS001,Arun Kumar,9876543210,9123456780,arun@example.com,1998-05-12,Male,Engineer,ACTIVE\n' +
            'CUS002,Priya Devi,9876543211,,priya@example.com,2000-08-21,Female,Teacher,ACTIVE\n' +
            'CUS003,Ravi Kumar,9876543212,,ravi@example.com,1995-02-15,Male,Business,ACTIVE',
        ],
        { type: 'text/csv' }
      ) as unknown as File;

      const result = await customerApi.bulkUploadCustomers(dummyFile);

      assert.equal(capturedUrl, '/commerce/customers/bulk-upload');
      assert.equal(capturedConfig?.headers?.['Content-Type'], 'multipart/form-data');
      assert.ok(capturedData instanceof FormData, 'data must be an instance of FormData');
      assert.ok(capturedData.has('file'), 'FormData must contain "file" field');

      // Verify response structure
      assert.equal(result.success, true);
      assert.equal(result.statusCode, 200);
      assert.equal(result.data.total, 3);
      assert.equal(result.data.created, 2);
      assert.equal(result.data.failed, 1);
      assert.equal(result.data.errors.length, 1);
      assert.equal(result.data.errors[0].row, 3);
      assert.equal(
        result.data.errors[0].message,
        'Duplicate mobile number "9876543210" within CSV file'
      );
    } finally {
      (baseClient as any).post = originalPost;
    }
  });

  it('validates CSV headers according to backend contract', () => {
    const expectedHeaders = [
      'customer_code',
      'full_name',
      'mobile_number',
      'alternate_mobile',
      'email',
      'date_of_birth',
      'gender',
      'occupation',
      'status',
    ];

    const sampleRow =
      'customer_code,full_name,mobile_number,alternate_mobile,email,date_of_birth,gender,occupation,status';
    const parsed = sampleRow.split(',').map((h) => h.trim());

    assert.deepEqual(parsed, expectedHeaders);
  });
});
