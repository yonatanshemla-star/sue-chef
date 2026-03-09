import { NextResponse } from 'next/server';
import fs from 'fs';

const logFile = 'webhook.log';
function logInfo(msg: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`, 'utf8');
}

export async function POST(req: Request) {
  logInfo('Incoming Voice GET/POST (Initial Call)');
  // Return XML (TwiML) to instruct Twilio what to do when a call connects
  const twiml = `
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="+19787014880">
        +972522818541
    </Dial>
</Response>
  `.trim();

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
