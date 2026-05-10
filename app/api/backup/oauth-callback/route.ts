import { NextResponse } from 'next/server';

// Step 2: Exchange auth code for refresh token
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: `OAuth denied: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
  }

  const redirectUri = new URL('/api/backup/oauth-callback', req.url).toString();

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.refresh_token) {
      return NextResponse.json({ 
        error: 'No refresh token received. Try again.',
        details: tokenData 
      }, { status: 400 });
    }

    // Show the refresh token for the user to copy to Vercel
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head><meta charset="utf-8"><title>Sue-Chef - Google Drive Connected</title>
      <style>
        body { font-family: system-ui; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; border-radius: 24px; padding: 48px; max-width: 600px; text-align: center; }
        h1 { color: #34d399; }
        .token { background: #0f172a; border: 2px solid #334155; border-radius: 12px; padding: 16px; font-family: monospace; font-size: 11px; word-break: break-all; margin: 24px 0; direction: ltr; text-align: left; user-select: all; }
        .steps { text-align: right; background: #334155; border-radius: 12px; padding: 20px; margin-top: 24px; }
        .steps li { margin: 8px 0; }
        code { background: #0f172a; padding: 2px 8px; border-radius: 6px; font-size: 13px; }
      </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ Google Drive מחובר!</h1>
          <p>העתק את ה-Refresh Token הבא והוסף אותו ב-Vercel:</p>
          <div class="token">${tokenData.refresh_token}</div>
          <div class="steps">
            <ol>
              <li>לך ל-Vercel → Settings → Environment Variables</li>
              <li>הוסף משתנה: <code>GOOGLE_DRIVE_REFRESH_TOKEN</code></li>
              <li>הדבק את הטוקן למעלה כערך</li>
              <li>לחץ Deploy (או רק שמור — ה-cron ישתמש בזה)</li>
            </ol>
          </div>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
