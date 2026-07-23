// scripts/generate-og-image.ts
import { ImageResponse } from '@vercel/og';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Simple OG image generator for a stream.
 * Generates a 1200x630 PNG with Fluxora branding, stream name, status pill and recipient.
 * This script is intended to be used as a Vite dev server middleware or serverless function.
 */
export async function handler(req: Request) {
  const url = new URL(req.url);
  const streamId = url.pathname.replace(/^\/og-image\//, '').replace(/\.png$/, '');
  // In a real implementation you would fetch stream data from the API.
  // Here we use placeholder data for demonstration.
  const stream = {
    id: streamId,
    name: `Stream ${streamId}`,
    status: 'Active',
    recipientName: 'Recipient',
  };

  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf');
  let interBold: ArrayBuffer | null = null;
  try {
    interBold = readFileSync(fontPath);
  } catch { /* ignore */ }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
          color: 'white',
          fontFamily: interBold ? 'Inter' : 'sans-serif',
        }}
      >
        <div style={{ fontSize: '64px', fontWeight: 700, marginBottom: '20px' }}>{stream.name}</div>
        <div style={{ fontSize: '32px' }}>Status: {stream.status}</div>
        <div style={{ fontSize: '24px', marginTop: '10px' }}>Recipient: {stream.recipientName}</div>
        <div style={{ position: 'absolute', bottom: '20px', right: '20px', fontSize: '18px' }}>Fluxora</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: interBold ? [{ name: 'Inter', data: interBold, weight: 700 }] : [],
    },
  );
}
