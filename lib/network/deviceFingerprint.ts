export type DeviceType = 'iphone' | 'android' | 'laptop' | 'tablet' | 'unknown';

export async function generateFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Device fingerprint can only be generated in a browser.');
  }

  const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const source = [
    window.navigator.userAgent,
    screenInfo,
    timezone,
    window.navigator.language
  ].join('|');
  const bytes = new TextEncoder().encode(source);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function detectDeviceType(userAgent: string): DeviceType {
  const value = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk/.test(value) || (value.includes('android') && !value.includes('mobile'))) {
    return 'tablet';
  }
  if (/iphone|ipod/.test(value)) {
    return 'iphone';
  }
  if (value.includes('android')) {
    return 'android';
  }
  if (/macintosh|windows nt|x11|linux/.test(value)) {
    return 'laptop';
  }

  return 'unknown';
}
