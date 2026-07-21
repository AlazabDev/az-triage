// Render each page of a PDF file to a PNG blob using pdf.js
import * as pdfjs from 'pdfjs-dist';
// Use a bundled worker URL so we don't rely on a CDN
// @ts-ignore - vite worker import
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';

pdfjs.GlobalWorkerOptions.workerSrc = PdfWorker;

export interface RenderedPage {
  pageIndex: number; // 1-based
  blob: Blob;
  width: number;
  height: number;
}

export async function renderPdfToImages(file: File, scale = 2): Promise<RenderedPage[]> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: RenderedPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png', 0.92),
    );
    out.push({ pageIndex: i, blob, width: viewport.width, height: viewport.height });
  }
  return out;
}

export async function imageFileToBlob(file: File): Promise<RenderedPage> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d')!.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png', 0.92));
  return { pageIndex: 1, blob, width: canvas.width, height: canvas.height };
}
