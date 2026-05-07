import { NextResponse } from 'next/server';
import { getLeads } from '@/utils/storage';

// Google Drive API using raw fetch (no npm dependency needed)
async function getGoogleAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!email || !keyBase64) {
    throw new Error('Missing Google Service Account credentials');
  }

  const key = Buffer.from(keyBase64, 'base64').toString('utf-8');
  const keyObj = JSON.parse(key);
  const privateKey = keyObj.private_key || key;

  // Create JWT
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claimSet = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signInput = `${header}.${claimSet}`;
  
  // Sign with crypto
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${signInput}.${signature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

async function deleteOldBackups(accessToken: string, folderId: string) {
  // List files in folder
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+name+contains+'suechef-backup'&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = await listRes.json();
  
  if (listData.files && listData.files.length > 0) {
    for (const file of listData.files) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  }
}

async function uploadToGoogleDrive(accessToken: string, folderId: string, fileName: string, content: string) {
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
  };

  const boundary = 'suechef_backup_boundary';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const result = await res.json();
  if (!result.id) {
    throw new Error(`Upload failed: ${JSON.stringify(result)}`);
  }
  return result;
}

export async function GET() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  
  if (!folderId || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return NextResponse.json({ 
      success: false, 
      error: 'Google Drive credentials not configured' 
    }, { status: 500 });
  }

  try {
    // 1. Get all leads
    const leads = await getLeads();
    
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      system: 'Sue-Chef CRM (Auto Backup)',
      totalLeads: leads.length,
      leads,
    };

    const content = JSON.stringify(backup, null, 2);
    const fileName = `suechef-backup-${new Date().toISOString().split('T')[0]}.json`;

    // 2. Get access token
    const accessToken = await getGoogleAccessToken();

    // 3. Delete old backups
    await deleteOldBackups(accessToken, folderId);

    // 4. Upload new backup
    const result = await uploadToGoogleDrive(accessToken, folderId, fileName, content);

    return NextResponse.json({ 
      success: true, 
      message: `Backup uploaded: ${fileName}`,
      fileId: result.id,
      leadsCount: leads.length
    });
  } catch (error: any) {
    console.error('Auto backup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
