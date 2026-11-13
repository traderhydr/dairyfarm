// The farm profile picture: the chosen photo is cropped to a square and shrunk to a small JPEG so it stays tiny
// (about 10-20 KB) in the saved farm data and syncs like any other record.
const PREFIX = 'data:image/jpeg;base64,';

/** Only our own small JPEG data URLs are ever shown as a picture; anything else in saved data is ignored. */
export const validPhoto = (value) => typeof value === 'string' && value.startsWith(PREFIX) && value.length < 400000 && /^[A-Za-z0-9+/=]+$/.test(value.slice(PREFIX.length));

/** File -> square JPEG data URL (default 256 px). Rejects when the file is not a readable image. */
export async function photoFromFile(file, size = 256) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('Not an image');
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
    const url = canvas.toDataURL('image/jpeg', 0.8);
    if (!validPhoto(url)) throw new Error('Could not read the photo');
    return url;
  } finally {
    if (bitmap.close) bitmap.close();
  }
}
