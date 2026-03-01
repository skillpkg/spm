/** R2 storage service for .skl packages and sigstore bundles. */

const PACKAGE_PREFIX = 'packages';
const BUNDLE_PREFIX = 'bundles';

const packageKey = (name: string, version: string): string =>
  `${PACKAGE_PREFIX}/${name}/${version}.skl`;

const bundleKey = (name: string, version: string): string =>
  `${BUNDLE_PREFIX}/${name}/${version}.sigstore`;

export const uploadPackage = async (
  bucket: R2Bucket,
  name: string,
  version: string,
  data: ArrayBuffer,
): Promise<string> => {
  const key = packageKey(name, version);
  await bucket.put(key, data);
  return key;
};

export const uploadBundle = async (
  bucket: R2Bucket,
  name: string,
  version: string,
  data: ArrayBuffer,
): Promise<string> => {
  const key = bundleKey(name, version);
  await bucket.put(key, data);
  return key;
};

export const getObject = async (bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> => {
  return bucket.get(key);
};

export const deleteObject = async (bucket: R2Bucket, key: string): Promise<void> => {
  await bucket.delete(key);
};
