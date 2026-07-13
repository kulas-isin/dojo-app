import * as ImageManipulator from 'expo-image-manipulator';

// 原生：用 expo-image-manipulator 縮圖 + 壓縮成 JPEG。
export async function makeVariant(uri: string, maxW: number, quality: number): Promise<Blob> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxW } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );
  const res = await fetch(result.uri);
  return await res.blob();
}
