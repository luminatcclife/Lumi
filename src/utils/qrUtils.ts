import QRCode from 'qrcode';

export const QR_PREFIX_CONTAINER = 'UBICAYA:CONT:';
export const QR_PREFIX_ITEM = 'UBICAYA:ITEM:';

export function makeContainerQrPayload(containerId: string): string {
  return `${QR_PREFIX_CONTAINER}${containerId}`;
}

export function makeItemQrPayload(itemId: string): string {
  return `${QR_PREFIX_ITEM}${itemId}`;
}

export interface ParsedQr {
  type: 'container' | 'item' | 'external';
  id: string;
  raw: string;
}

export function parseQrCode(raw: string): ParsedQr {
  const trimmed = raw.trim();
  if (trimmed.startsWith(QR_PREFIX_CONTAINER)) {
    return {
      type: 'container',
      id: trimmed.replace(QR_PREFIX_CONTAINER, ''),
      raw: trimmed,
    };
  }
  if (trimmed.startsWith(QR_PREFIX_ITEM)) {
    return {
      type: 'item',
      id: trimmed.replace(QR_PREFIX_ITEM, ''),
      raw: trimmed,
    };
  }
  return {
    type: 'external',
    id: trimmed,
    raw: trimmed,
  };
}

export async function generateQrDataUrl(text: string, size = 260): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR data URL', err);
    return '';
  }
}
