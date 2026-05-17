import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const confId = searchParams.get('confId');

    if (!confId) {
      console.error('Conference Join Error: Missing confId');
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>`, {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    console.log(`Participant joining conference: ${confId}`);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>
        <Conference startConferenceOnEnter="false" endConferenceOnExit="true">${confId}</Conference>
    </Dial>
</Response>`;

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (err: any) {
    console.error('Conference Join TwiML Error:', err);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>`, {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
