import 'dotenv/config';
import type { Express } from 'express';
import { createApiApp } from '../server/app.ts';

let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApiApp().catch((err) => {
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: any, res: any): Promise<void> {
  try {
    const app = await getApp();
    app(req, res);
  } catch (err) {
    console.error('[Vercel API Handler Error]', err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error:
            err instanceof Error && err.message.includes('DATABASE_URL')
              ? err.message
              : 'Internal server error.',
        }),
      );
    }
  }
}
