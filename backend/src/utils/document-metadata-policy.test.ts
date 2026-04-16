import { describe, expect, it } from 'vitest';
import {
  CLIENT_METADATA_ALLOWLIST,
  sanitizeCreateMetadataList,
  sanitizeUpdateMetadataList,
} from './document-metadata-policy';

describe('document metadata policy', () => {
  it('defines a stable allowlist for client-managed metadata keys', () => {
    expect(CLIENT_METADATA_ALLOWLIST).toEqual([
      'departmentOrgId',
      'departmentOrgName',
      'published',
    ]);
  });

  it('accepts create metadata when all keys are allowed', () => {
    expect(
      sanitizeCreateMetadataList([
        { key: 'departmentOrgId', value: '42' },
        { key: 'departmentOrgName', value: 'Stadsbyggnadskontoret' },
      ])
    ).toEqual([
      { key: 'departmentOrgId', value: '42' },
      { key: 'departmentOrgName', value: 'Stadsbyggnadskontoret' },
    ]);
  });

  it('rejects unknown metadata keys on create', () => {
    expect(() => sanitizeCreateMetadataList([{ key: 'customTag', value: 'x' }])).toThrow(
      'Unsupported metadata keys: customTag'
    );
  });

  it('rejects duplicate metadata keys on create', () => {
    expect(() =>
      sanitizeCreateMetadataList([
        { key: 'departmentOrgId', value: '42' },
        { key: 'departmentOrgId', value: '43' },
      ])
    ).toThrow('Duplicate metadata keys are not allowed: departmentOrgId');
  });

  it('preserves existing backend-owned metadata on update', () => {
    const existing = [
      { key: 'public:category', value: 'Policy' },
      { key: 'departmentOrgId', value: '42' },
      { key: 'published', value: 'false' },
    ];

    expect(sanitizeUpdateMetadataList([{ key: 'published', value: 'true' }], existing)).toEqual([
      { key: 'public:category', value: 'Policy' },
      { key: 'departmentOrgId', value: '42' },
      { key: 'published', value: 'true' },
    ]);
  });

  it('rejects creating new unknown metadata keys on update', () => {
    expect(() =>
      sanitizeUpdateMetadataList([{ key: 'customTag', value: 'new' }], [
        { key: 'published', value: 'false' },
      ])
    ).toThrow('Unsupported metadata keys: customTag');
  });

  it('rejects modifying existing backend-owned metadata keys on update', () => {
    expect(() =>
      sanitizeUpdateMetadataList([{ key: 'public:category', value: 'Changed' }], [
        { key: 'public:category', value: 'Policy' },
      ])
    ).toThrow('Unsupported metadata keys: public:category');
  });

  it('allows pass-through of existing backend-owned metadata keys', () => {
    expect(
      sanitizeUpdateMetadataList([{ key: 'public:category', value: 'Policy' }], [
        { key: 'public:category', value: 'Policy' },
      ])
    ).toEqual([{ key: 'public:category', value: 'Policy' }]);
  });
});
