function canvasToBlobPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<number[]> {
  const blob = await canvasToBlobPng(canvas);
  if (!blob) return [];
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const out = new Array<number>(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i]!;
  }
  return out;
}
