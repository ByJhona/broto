import { randomUUID } from 'expo-crypto';

export function storagePathFromPublicUrl(bucket: string, url: string): string | null {
  const marker = `/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

export function uniquePhotoFilename(): string {
  return `${randomUUID()}.jpg`;
}
