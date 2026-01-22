import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export function generateSimplePdf(title, lines) {
    const doc = new PDFDocument();
    const stream = new Readable({ read() {} });
    doc.on('data', (chunk) => stream.push(chunk));
    doc.on('end', () => stream.push(null));

    doc.fontSize(18).text(title, { underline: true });
    doc.moveDown();
    lines.forEach((l) => doc.fontSize(12).text(l));
    doc.end();
    return stream;
}


