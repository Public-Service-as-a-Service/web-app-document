import { HttpException } from '@exceptions/http.exception';
import type { DocumentMetadata } from '@/interfaces/document.interface';

export const CLIENT_METADATA_ALLOWLIST = ['departmentOrgId', 'departmentOrgName'];

const CLIENT_METADATA_KEY_SET = new Set<string>(CLIENT_METADATA_ALLOWLIST);

const invalidMetadataPayloadError = () => new HttpException(400, 'Invalid metadataList payload');

const unsupportedMetadataKeysError = (keys: string[]) =>
  new HttpException(400, `Unsupported metadata keys: ${keys.join(', ')}`);

const duplicateMetadataKeysError = (keys: string[]) =>
  new HttpException(400, `Duplicate metadata keys are not allowed: ${keys.join(', ')}`);

const isMetadataEntry = (value: unknown): value is DocumentMetadata => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const item = value as Partial<DocumentMetadata>;
  return typeof item.key === 'string' && typeof item.value === 'string';
};

const parseMetadataList = (value: unknown): DocumentMetadata[] => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw invalidMetadataPayloadError();
  }

  return value.map((item) => {
    if (!isMetadataEntry(item)) {
      throw invalidMetadataPayloadError();
    }

    return { key: item.key, value: item.value };
  });
};

const uniqueKeys = (keys: string[]): string[] => [...new Set(keys)];

const assertNoDuplicateKeys = (metadataList: DocumentMetadata[]): void => {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const item of metadataList) {
    if (seen.has(item.key)) {
      duplicates.push(item.key);
      continue;
    }

    seen.add(item.key);
  }

  if (duplicates.length > 0) {
    throw duplicateMetadataKeysError(uniqueKeys(duplicates));
  }
};

export const sanitizeCreateMetadataList = (metadataList: unknown): DocumentMetadata[] => {
  const nextMetadata = parseMetadataList(metadataList);
  assertNoDuplicateKeys(nextMetadata);

  const unsupportedKeys = uniqueKeys(
    nextMetadata
      .filter((item) => !CLIENT_METADATA_KEY_SET.has(item.key))
      .map((item) => item.key)
  );

  if (unsupportedKeys.length > 0) {
    throw unsupportedMetadataKeysError(unsupportedKeys);
  }

  return nextMetadata;
};

export const sanitizeUpdateMetadataList = (
  metadataList: unknown,
  existingMetadata: DocumentMetadata[] = []
): DocumentMetadata[] => {
  const incomingMetadata = parseMetadataList(metadataList);
  assertNoDuplicateKeys(incomingMetadata);

  const mergedMetadataByKey = new Map<string, string>();
  const mergedKeyOrder: string[] = [];

  for (const item of existingMetadata) {
    if (!mergedMetadataByKey.has(item.key)) {
      mergedKeyOrder.push(item.key);
    }

    mergedMetadataByKey.set(item.key, item.value);
  }

  const unsupportedKeys = new Set<string>();

  for (const item of incomingMetadata) {
    if (!CLIENT_METADATA_KEY_SET.has(item.key)) {
      const existingValue = mergedMetadataByKey.get(item.key);
      if (existingValue === undefined || existingValue !== item.value) {
        unsupportedKeys.add(item.key);
      }
      continue;
    }

    if (!mergedMetadataByKey.has(item.key)) {
      mergedKeyOrder.push(item.key);
    }

    mergedMetadataByKey.set(item.key, item.value);
  }

  if (unsupportedKeys.size > 0) {
    throw unsupportedMetadataKeysError([...unsupportedKeys]);
  }

  return mergedKeyOrder.map((key) => ({
    key,
    value: mergedMetadataByKey.get(key) ?? '',
  }));
};
