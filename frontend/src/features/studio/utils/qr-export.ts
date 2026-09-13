/** Draw QR canvas onto an opaque white background for print-friendly downloads/shares. */
export const canvasWithWhiteBackground = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = source.width;
  exportCanvas.height = source.height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return source;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  ctx.drawImage(source, 0, 0);
  return exportCanvas;
};

export const canvasToPngFile = async (
  canvas: HTMLCanvasElement,
  fileName: string,
): Promise<File> => {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not encode QR'))),
      'image/png',
    );
  });
  return new File([blob], fileName, { type: 'image/png' });
};

export const shareQrPayload = async (input: {
  canvas: HTMLCanvasElement | null;
  albumName: string;
  viewerUrl: string;
}): Promise<'shared' | 'copied'> => {
  const safeName = `${input.albumName.replace(/\s+/g, '-').toLowerCase() || 'storypix'}-qr.png`;
  const white = input.canvas ? canvasWithWhiteBackground(input.canvas) : null;
  const file = white ? await canvasToPngFile(white, safeName) : null;

  if (navigator.share) {
    try {
      const data: ShareData = {
        title: input.albumName,
        text: `Scan to open ${input.albumName} on Story-PIX`,
        url: input.viewerUrl,
      };
      if (file && navigator.canShare?.({ files: [file] })) {
        data.files = [file];
      }
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') throw error;
      // Fall through to clipboard when share is unavailable for this payload.
    }
  }

  await navigator.clipboard.writeText(input.viewerUrl);
  return 'copied';
};
