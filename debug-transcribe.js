const fs = require('fs');
const path = require('path');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('debug_log.txt', msg + '\n');
}

function parseEnv() {
    const envPath = path.join(__dirname, '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    for (const line of lines) {
        const [key, ...val] = line.split('=');
        if (key && val.length) {
            env[key.trim()] = val.join('=').trim();
        }
    }
    return env;
}

async function runDebug() {
    if (fs.existsSync('debug_log.txt')) fs.unlinkSync('debug_log.txt');
    log("--- DEBUG START ---");
    try {
        const env = parseEnv();
        const accountSid = env.TWILIO_ACCOUNT_SID;
        const authToken = env.TWILIO_AUTH_TOKEN;
        const geminiKey = env.GEMINI_API_KEY;

        if (!accountSid || !authToken || !geminiKey) {
            log("Missing keys in .env.local");
            return;
        }

        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        log("1. Fetching latest call with recording...");
        const callsUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=1`;
        const res = await fetch(callsUrl, { headers: { Authorization: `Basic ${auth}` } });
        const data = await res.json();
        
        if (!data.calls || data.calls.length === 0) {
            log("No calls found in Twilio account.");
            return;
        }

        const call = data.calls[0];
        log(`Checking call ${call.sid} from ${call.from}`);

        const recUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call.sid}/Recordings.json`;
        const recRes = await fetch(recUrl, { headers: { Authorization: `Basic ${auth}` } });
        const recData = await recRes.json();

        if (!recData.recordings || recData.recordings.length === 0) {
            log("No recording found for this call.");
            return;
        }

        const recording = recData.recordings[0];
        const mp3Url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recording.sid}.mp3`;
        log(`2. Attempting to download recording: ${mp3Url}`);

        let audioRes = await fetch(mp3Url, {
            headers: { Authorization: `Basic ${auth}` },
            redirect: 'manual'
        });

        if (audioRes.status >= 300 && audioRes.status < 400) {
            const redirectLocation = audioRes.headers.get('location');
            log(`Following redirect to: ${redirectLocation.substring(0, 50)}...`);
            audioRes = await fetch(redirectLocation);
        }

        if (!audioRes.ok) {
            log(`Download failed: ${audioRes.status} ${audioRes.statusText}`);
            return;
        }

        const buffer = await audioRes.arrayBuffer();
        log(`Audio size: ${buffer.byteLength} bytes`);
        const base64Audio = Buffer.from(buffer).toString('base64');

        log("3. Sending to Gemini...");
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        
        const gemRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Transcribe in Hebrew and return JSON with summary, sentiment, fullTranscription." },
                        { inlineData: { data: base64Audio, mimeType: "audio/mpeg" } }
                    ]
                }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const gemData = await gemRes.json();
        if (!gemRes.ok) {
            log("Gemini Error: " + JSON.stringify(gemData));
            return;
        }

        log("--- GEMINI SUCCESS ---");
        log(gemData.candidates[0].content.parts[0].text);

    } catch (err) {
        log("CRITICAL ERROR: " + err.message);
    }
}

runDebug();
