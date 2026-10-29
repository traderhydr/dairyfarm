import { isNative } from './platform.js';

/**
 * Hand a text file to the user. Browsers download it; the native app writes it to the cache
 * and opens the share sheet (save to Drive/Files, WhatsApp, email...) because WebViews can't
 * download blob links.
 * @returns {Promise<'downloaded'|'shared'>}
 */
export async function saveTextFile(filename, text, mimeType) {
  if (isNative) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share')
    ]);
    const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: filename, url: uri, dialogTitle: 'Save or share your backup' });
    return 'shared';
  }

  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}
