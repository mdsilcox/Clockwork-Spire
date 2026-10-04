export const ICONS: Record<string, number>;
export function render(size: number): Buffer;
export function encodePng(rgba: Buffer, size: number): Buffer;
export function generateIcons(): Record<string, Buffer>;
