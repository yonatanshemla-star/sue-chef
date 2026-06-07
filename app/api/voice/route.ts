import { NextResponse } from 'next/server';
import { logVoiceRequest, getLeads } from '@/utils/storage';
import { sendWhatsAppMessage } from '@/utils/whatsapp';

export async function POST(req: Request) {
  try {
     const bodyText = await req.text();
     const params = new URLSearchParams(bodyText);
     const rawData: Record<string, string> = {};
     params.forEach((value, key) => { rawData[key] = value; });
     
     await logVoiceRequest(rawData);

     const from = rawData['From'] || '';
     const to = rawData['To'] || rawData['to'] || ''; 
     
     const fromStr = from.toString();
     const toStr = to.toString();

     const isFromApp = fromStr.startsWith('client:');
     const isFromSip = fromStr.startsWith('sip:');
     
     const digitsOnly = toStr.split('@')[0].replace('sip:', '').replace(/[^\d+]/g, '');
     let toValue = digitsOnly;

     if (toValue.startsWith('0') && toValue.length === 10) {
         toValue = '+972' + toValue.substring(1);
     } else if (!toValue.startsWith('+') && toValue.length >= 9 && !toValue.startsWith('972')) {
         toValue = '+972' + (toValue.startsWith('0') ? toValue.substring(1) : toValue);
     } else if (toValue.startsWith('972') && !toValue.startsWith('+')) {
         toValue = '+' + toValue;
     }

     const isOutbound = isFromApp || (isFromSip && /^\+?\d+$/.test(toValue));
     let callerId = process.env.TWILIO_PHONE_NUMBER || process.env.MY_PHONE_NUMBER || '';
     
     if (callerId.startsWith('0') && callerId.length === 10) {
         callerId = '+972' + callerId.substring(1);
     } else if (callerId && !callerId.startsWith('+')) {
         callerId = '+' + callerId;
     }

     let twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n`;

     if (isOutbound && toValue) {
         if (!callerId) {
             twiml += `  <Say language="he-IL">שגיאה: חסר מספר מזוהה.</Say>\n`;
         }
         twiml += `  <Dial callerId="${callerId}">\n`;
         twiml += `    <Number>${toValue}</Number>\n`;
         twiml += `  </Dial>\n`;
      } else if (!isOutbound) {
          // Send incoming call notifications (SMS & WhatsApp) asynchronously
          try {
              const leads = await getLeads();
              const fromNormalized = fromStr.replace(/\D/g, '').slice(-9);
              const matchedLead = (fromNormalized && fromNormalized.length >= 7)
                  ? leads.find(l => l.phone && l.phone.replace(/\D/g, '').includes(fromNormalized))
                  : undefined;

              let displayCallerNumber = fromStr;
              if (displayCallerNumber.startsWith('+972')) {
                  displayCallerNumber = '0' + displayCallerNumber.substring(4);
              } else if (displayCallerNumber.startsWith('972')) {
                  displayCallerNumber = '0' + displayCallerNumber.substring(3);
              }

              const notificationText = matchedLead && matchedLead.clientName
                  ? `📞 שיחה נכנסת מ-${matchedLead.clientName} (${displayCallerNumber})`
                  : `📞 שיחה נכנסת ממספר חדש: ${displayCallerNumber}`;

              const accountSid = process.env.TWILIO_ACCOUNT_SID;
              const authToken = process.env.TWILIO_AUTH_TOKEN;
              const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
              const myPhone = process.env.MY_PHONE_NUMBER;

              if (accountSid && authToken && twilioPhone && myPhone) {
                  // Send SMS via Twilio Messages API
                  const smsAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
                  const smsParams = new URLSearchParams();
                  smsParams.append('To', myPhone);
                  smsParams.append('From', twilioPhone);
                  smsParams.append('Body', notificationText);

                  fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
                      method: 'POST',
                      headers: {
                          'Authorization': `Basic ${smsAuth}`,
                          'Content-Type': 'application/x-www-form-urlencoded'
                      },
                      body: smsParams.toString()
                  }).catch(err => console.error("Failed to send incoming call notification SMS:", err));

                  // Send WhatsApp message
                  sendWhatsAppMessage(myPhone, notificationText)
                      .catch(err => console.error("Failed to send incoming call notification WhatsApp:", err));
              }
          } catch (notifErr) {
              console.error("Error generating incoming call notifications:", notifErr);
          }

          // ADD callerId so Israeli networks don't block the forwarded call as spoofed
          twiml += `  <Dial callerId="${callerId}" timeout="60" action="/api/twilio/voicemail">\n`;
          if (process.env.MY_PHONE_NUMBER) {
             twiml += `    <Number>${process.env.MY_PHONE_NUMBER}</Number>\n`;
          }
          twiml += `  </Dial>\n`;
      } else {
         twiml += `  <Say language="he-IL">יעד לא תקין.</Say>\n`;
     }

     twiml += `</Response>`;

     return new NextResponse(twiml, {
         status: 200,
         headers: { 'Content-Type': 'application/xml' },
     });
  } catch (err: any) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>`, {
         status: 200,
         headers: { 'Content-Type': 'application/xml' }
      });
  }
}

export async function GET(req: Request) {
    return POST(req);
}
