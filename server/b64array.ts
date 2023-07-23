export function fromIntArrayToBase64(u8: Uint8Array): string {
    return Buffer.from(u8).toString('base64');
}

export function fromBase64ToIntArray(str: string): Uint8Array {
    return new Uint8Array(Buffer.from(str, 'base64'));
}