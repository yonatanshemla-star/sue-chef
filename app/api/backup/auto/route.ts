import { NextResponse } from 'next/server';
import { getLeads } from '@/utils/storage';

// Use OAuth2 refresh token (user's own Drive quota, not Service Account)
async function getAccessTokenFromRefresh(): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google OAuth credentials. Run /api/backup/oauth-setup to configure.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function deleteOldBackups(accessToken: string, folderId: string) {
  try {
    const q = `'${folderId}' in parents and trashed = false`;
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    console.log('Found old backups to delete:', listData);
    
    if (listData.files && listData.files.length > 0) {
      for (const file of listData.files) {
        if (file.name?.includes('suechef-backup')) {
          console.log(`Deleting old backup: ${file.name} (${file.id})`);
          const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          console.log(`Delete status for ${file.name}:`, delRes.status);
        }
      }
    }
  } catch (err) {
    console.error('Error deleting old backups:', err);
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
  
  if (!folderId) {
    return NextResponse.json({ 
      success: false, 
      error: 'GOOGLE_DRIVE_FOLDER_ID not configured' 
    }, { status: 500 });
  }

  try {
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

    const accessToken = await getAccessTokenFromRefresh();
    await deleteOldBackups(accessToken, folderId);
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
