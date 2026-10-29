import { Capacitor } from '@capacitor/core';

/** True inside the installed Android/iOS app, false in a browser or installed PWA. */
export const isNative = Capacitor.isNativePlatform();
