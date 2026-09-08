import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const PHOTO_UPLOAD_MAX_WIDTH = 1280;
export const AVATAR_UPLOAD_MAX_WIDTH = 512;

export async function resizeImageForUpload(uri: string, maxWidth: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri).resize({ width: maxWidth });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
  return result.uri;
}
