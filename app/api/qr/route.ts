import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const qrPath = path.join(process.cwd(), 'public', 'qr.png');
  if (fs.existsSync(qrPath)) {
    const fileBuffer = fs.readFileSync(qrPath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
  return new NextResponse('QR code not generated yet', { status: 404 });
}
