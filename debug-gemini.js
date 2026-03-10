const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({path: '.env.local'});
const path = require('path');

async function debugTranscription() {
  const logFile = path.join(__dirname, 'gemini_debug.txt');
  let log = '';
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(`${accountSid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    
    // 1. Get recent calls
    log += 'Fetching recent calls...\n';
    const callsUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=10`;
    const callsRes = await fetch(callsUrl, { headers: { Authorization: `Basic ${auth}` } });
    const callsData = await callsRes.json();
    
    let targetRecordingUrl = null;
    for (const call of callsData.calls || []) {
      const recsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call.sid}/Recordings.json`, { headers: { Authorization: `Basic ${auth}` } });
      const recsData = await recsRes.json();
      if (recsData.recordings?.length > 0) {
        targetRecordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recsData.recordings[0].sid}.mp3`;
        log += `Found recording: ${targetRecordingUrl}\n`;
        break;
      }
    }
    
    if (!targetRecordingUrl) {
      log += 'No recordings found.\n';
      fs.writeFileSync(logFile, log);
      return;
    }
    
    // 2. Fetch recording manually following redirect
    let audioRes = await fetch(targetRecordingUrl, {
      headers: { Authorization: `Basic ${auth}` },
      redirect: 'manual'
    });
    
    log += `Audio fetch status 1: ${audioRes.status}\n`;
    
    if (audioRes.status >= 300 && audioRes.status < 400) {
      const loc = audioRes.headers.get('location');
      log += `Redirecting to: ${loc.substring(0, 50)}...\n`;
      audioRes = await fetch(loc);
    }
    
    log += `Audio fetch final status: ${audioRes.status}\n`;
    if (!audioRes.ok) {
        log += 'Failed to get audio\n';
        fs.writeFileSync(logFile, log);
        return;
    }
    
    const audioBuffer = await audioRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    log += `Base64 length: ${base64Audio.length}\n`;
    
    // 3. Send to Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const prompt = `אתה עוזר אישי של עורך דין. הקשב להקלטת השיחה הזאת עם לקוח פוטנציאלי.\nחלץ JSON עם: summary, sentiment, nextSteps, keyDetails, fullTranscription. השתמש בשפה עברית. רק JSON.`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { data: base64Audio, mimeType: 'audio/mpeg' } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
    });
    
    log += `Gemini status: ${geminiResponse.status}\n`;
    const geminiData = await geminiResponse.json();
    log += `Gemini response: ${JSON.stringify(geminiData).substring(0, 1000)}\n`;
    
  } catch (e) {
    log += `Error: ${e.message}\n`;
  }
  
  fs.writeFileSync(logFile, log);
}

debugTranscription();
