import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const to = formData.get('To');
  
  let twiml = '<?xml version="1.0" encoding="UTF-8"?>';
  
  if (to) {
    twiml += `<Response>
      <Dial callerId="${process.env.MY_PHONE_NUMBER}" trim="trim-silence">
        <Number>${to.toString()}</Number>
      </Dial>
    </Response>`;
  } else {
    twiml += `<Response>
      <Say>Invalid phone number provided.</Say>
    </Response>`;
  }

  return new NextResponse(twiml, {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
