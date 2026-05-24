const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env.local' });

// ==================== CONFIGURATION ====================
// SANDBOX MODE: Set to true to ONLY send messages to the owner's testing number (0522818541).
// This is extremely safe for testing so no real clients receive test messages during tests.
// Set to false when you want to go live and send to all real clients.
const SANDBOX_MODE = false;

// GEMINI AI PROMPT TEMPLATE: Customize how Gemini analyzes client replies.
// [REPLY_TEXT] will be automatically replaced by the client's actual message.
const GEMINI_PROMPT_TEMPLATE = `
אתה עוזר משפטי חכם עבור משרד עורכי דין.
קיבלת הודעה מלקוח בווטסאפ בתגובה להודעת הפתיחה שלנו.
עליך לנתח את ההודעה ולחלץ ממנה מידע קריטי בצורה מובנית בתוך כותרות מסודרות בעברית.
היה קצר וממוקד ביותר! כתוב משפטים קצרים ותמציתיים ללא פירוט יתר.

ההודעה של הלקוח:
"[REPLY_TEXT]"

אנא חלץ את המידע הבא באופן תמציתי ומקצועי מאוד:
- 📋 פרטי המקרה בקצרה (עד 2 משפטים)
- 🏥 אבחנות רפואיות (רק כדורים/מחלות/פגיעות בנקודות קצרות)
- 💼 סטטוס תעסוקתי (סטטוס נוכחי ועבר בנקודה אחת)
- 🧠 שורת מחץ / רלוונטיות ראשונית (משפט אחד קצר בלבד)

החזר את התשובה מעוצבת יפה עם כותרות ברורות, מותאמת ישירות להצגה בתיק המעקב של הלקוח. אל תוסיף הקדמות או סיומות, רק את הניתוח המובנה והמקוצר ביותר.
`;
// ========================================================

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = process.env.API_KEY || 'sue-chef-secret-whatsapp-key-123';
const PORT = process.env.PORT || 3001;

// Setup PostgreSQL pool connected to Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Handle errors on idle clients to prevent connection drops from crashing the Node process
pool.on('error', async (err, client) => {
    console.error('⚠️ Unexpected error on idle client in pg Pool:', err.message);
    await notifyOwnerCrash(`שגיאה לא צפויה בחיבור ל-Postgres (Pool Error): ${err.message}`, err);
});

let client;
let isRestarting = false;
let isClientReady = false;
let wasRecovered = false;
const processedMessageIds = new Set();

const QRCodeImage = require('qrcode');
const path = require('path');
const fs = require('fs');

// Generic function to notify owner of critical errors (WhatsApp message if possible, fallback to Desktop alert + Windows Toast)
async function notifyOwnerCrash(messageText, errObj = null) {
    const ownerChatId = '972522818541@c.us';
    
    // 1. Try sending WhatsApp message first (if connected and ready)
    if (isClientReady && client) {
        try {
            await client.sendMessage(ownerChatId, `🤖 התראה מבוט ה-WhatsApp:\n${messageText}`);
            console.log('✅ Sent error alert to owner via WhatsApp.');
            return;
        } catch (sendErr) {
            console.error('❌ Failed to send WhatsApp alert, falling back to local crash triggers:', sendErr.message);
            if (sendErr.message && (
                sendErr.message.includes('detached') || 
                sendErr.message.includes('Protocol error') || 
                sendErr.message.includes('closed') || 
                sendErr.message.includes('context was destroyed')
            )) {
                console.log('⚠️ Puppeteer browser/page became unresponsive during alert sending. Triggering client recovery...');
                isClientReady = false;
                recreateAndInitClient();
            }
        }
    }

    // 2. Fallback: Write a CRASH_ALERT file to Desktop & open it in Notepad
    try {
        const desktopPath = path.join('C:', 'Users', 'Yonatan', 'Desktop');
        const workspacePath = __dirname;
        const alertFileDir = fs.existsSync(desktopPath) ? desktopPath : workspacePath;
        const alertFilePath = path.join(alertFileDir, 'CRASH_ALERT.txt');
        
        const fileContent = `
⚠️⚠️⚠️ התראת שגיאה בבוט ה-WhatsApp ⚠️⚠️⚠️
זמן: ${new Date().toLocaleString('he-IL')}

הודעה:
${messageText}

${errObj ? `פרטי השגיאה:\n${errObj.stack || errObj.message || errObj}\n` : ''}
אנא בדוק את השרת!
`;
        fs.writeFileSync(alertFilePath, fileContent);
        console.log(`💾 Saved crash alert file to: ${alertFilePath}`);
        
        // Open the file automatically in Notepad
        const { exec } = require('child_process');
        exec(`start notepad.exe "${alertFilePath}"`);
        
        // 3. Trigger a Windows system toast/balloon notification via PowerShell
        const psCommand = `
[void] [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");
$objNotifyIcon = New-Object System.Windows.Forms.NotifyIcon;
$objNotifyIcon.Icon = [System.Drawing.SystemIcons]::Warning;
$objNotifyIcon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Warning;
$objNotifyIcon.BalloonTipTitle = "שגיאה בבוט ה-WhatsApp!";
$objNotifyIcon.BalloonTipText = "${messageText.replace(/"/g, "'").slice(0, 100)}";
$objNotifyIcon.Visible = $True;
$objNotifyIcon.ShowBalloonTip(15000);
`;
        // Execute PowerShell toast notification
        const tempPsFile = path.join(workspacePath, 'temp_toast.ps1');
        fs.writeFileSync(tempPsFile, psCommand, 'utf8');
        exec(`powershell.exe -ExecutionPolicy Bypass -File "${tempPsFile}"`, () => {
            try { fs.unlinkSync(tempPsFile); } catch (e) {}
        });
        
    } catch (localErr) {
        console.error('❌ Failed to trigger local notification systems:', localErr.message);
    }
}

// Uncaught exception and rejection handlers to notify the owner before crashing
process.on('uncaughtException', async (err) => {
    console.error('❌ CRITICAL UNCAUGHT EXCEPTION:', err);
    await notifyOwnerCrash(`קריסה קריטית בשרת הבוט (Uncaught Exception): ${err.message}. השרת ייסגר.`, err);
    // Give some time for notepad to open before exiting
    setTimeout(() => {
        process.exit(1);
    }, 2000);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('❌ CRITICAL UNHANDLED REJECTION:', reason);
    const reasonMsg = reason instanceof Error ? reason.message : String(reason);
    await notifyOwnerCrash(`שגיאה לא מטופלת בשרת הבוט (Unhandled Rejection): ${reasonMsg}`, reason instanceof Error ? reason : null);
});

async function recreateAndInitClient() {
    if (isRestarting) return;
    isRestarting = true;
    isClientReady = false;
    wasRecovered = true;
    console.log('🔄 Starting WhatsApp Client Re-initialization / Recovery...');
    try {
        if (client) {
            await client.destroy();
            console.log('🛑 Previous Client destroyed.');
        }
    } catch (destroyErr) {
        console.error('⚠️ Error destroying previous client:', destroyErr.message);
    }
    
    try {
        initWhatsAppClient();
        console.log('🚀 New WhatsApp Client initialized.');
    } catch (initErr) {
        console.error('❌ Failed to initialize new client:', initErr.message);
        await notifyOwnerCrash(`כשל קריטי באתחול מנוע הדפדפן של בוט ה-WhatsApp: ${initErr.message}`, initErr);
    } finally {
        isRestarting = false;
    }
}

function initWhatsAppClient() {
    console.log('Initializing WhatsApp Client instance...');
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', async (qr) => {
        console.log('Scan the QR code below to authenticate in WhatsApp:');
        qrcode.generate(qr, { small: true });
        
        // Save QR code as PNG image
        try {
            // 1. Save to CRM public folder so they can access it on http://localhost:3000/qr.png
            const publicDir = path.join(__dirname, '..', 'public');
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true });
            }
            const publicQrPath = path.join(publicDir, 'qr.png');
            await QRCodeImage.toFile(publicQrPath, qr, {
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                },
                width: 500
            });
            console.log(`🖼️ Saved QR code PNG to ${publicQrPath}`);

            // 2. Save to the Brain/Artifacts folder so the Assistant can display it directly in the markdown transcript!
            const brainDir = `C:\\Users\\Yonatan\\.gemini\\antigravity\\brain\\482c84de-13c1-47c3-b2be-1182c08aa65f`;
            if (fs.existsSync(brainDir)) {
                const brainQrPath = path.join(brainDir, 'qr.png');
                await QRCodeImage.toFile(brainQrPath, qr, {
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    },
                    width: 500
                });
                console.log(`🖼️ Saved QR code PNG to Brain at ${brainQrPath}`);
            }
        } catch (err) {
            console.error('❌ Failed to generate QR code PNG:', err.message);
        }
    });

    client.on('ready', async () => {
        console.log('✅ WhatsApp Bot is Ready and Connected!');
        isClientReady = true;
        
        if (wasRecovered) {
            wasRecovered = false;
            try {
                const ownerChatId = '972522818541@c.us';
                await client.sendMessage(ownerChatId, `🤖 הבוט שוחזר בהצלחה לאחר ניתוק זמני בדפדפן, וכעת חזר לפעילות מלאה! 🎉`);
                console.log('✅ Sent recovery notification to owner.');
            } catch (notifyErr) {
                console.error('❌ Failed to send recovery notification:', notifyErr.message);
            }
        }
        
        // Initial DB poll after 5 seconds
        setTimeout(checkAndSendPendingWhatsAppMessages, 5000);
    });

    client.on('auth_failure', async (msg) => {
        console.error('AUTH FAIL', msg);
        await notifyOwnerCrash(`בוט ה-WhatsApp נכשל באימות (Auth Failure): ${msg}. נדרש לסרוק קוד QR חדש כדי להפעיל מחדש!`);
    });

    client.on('disconnected', async (reason) => {
        console.log('Disconnected', reason);
        isClientReady = false;
        
        // Notify owner about temporary disconnection
        const alertMsg = `⚠️ בוט ה-WhatsApp נותק מהדפדפן (סיבה: ${reason}). מנסה לבצע שחזור אוטומטי כעת...`;
        await notifyOwnerCrash(alertMsg);
        
        setTimeout(recreateAndInitClient, 10000);
    });

    client.on('message', async (msg) => {
        await handleIncomingMessage(msg, 'message');
    });

    client.on('message_create', async (msg) => {
        await handleIncomingMessage(msg, 'message_create');
    });

    client.initialize();
}

// Start the client for the first time
initWhatsAppClient();

// Helper function to check if a lead has a duplicate (phone or name) in Neon DB
async function checkIfLeadIsDuplicate(leadId, phone, clientName) {
    // 1. Check phone duplicate (last 9 digits, matching JS normalization in page.tsx)
    if (phone) {
        const normPhone = phone.replace(/\D/g, '').slice(-9);
        if (normPhone.length >= 7) {
            const query = `
                SELECT id, data->>'clientName' as "clientName"
                FROM leads
                WHERE id != $1
                  AND (data->>'phone' IS NOT NULL)
                  AND (right(regexp_replace(data->>'phone', '\\D', '', 'g'), 9) = $2)
                LIMIT 1
            `;
            const res = await pool.query(query, [leadId, normPhone]);
            if (res.rows.length > 0) {
                return { isDuplicate: true, matchType: 'phone', originalName: res.rows[0].clientName };
            }
        }
    }

    // 2. Check name duplicate (matching JS normalization in page.tsx)
    if (clientName && clientName.trim()) {
        const normName = clientName.trim().toLowerCase();
        if (normName.length >= 2) {
            const query = `
                SELECT id, data->>'clientName' as "clientName"
                FROM leads
                WHERE id != $1
                  AND (data->>'clientName' IS NOT NULL)
                  AND (LOWER(TRIM(data->>'clientName')) = $2)
                LIMIT 1
            `;
            const res = await pool.query(query, [leadId, normName]);
            if (res.rows.length > 0) {
                return { isDuplicate: true, matchType: 'name', originalName: res.rows[0].clientName };
            }
        }
    }

    return { isDuplicate: false };
}

// Function to poll Neon DB for unsent WhatsApp leads (3 to 30 minutes elapsed)
async function checkAndSendPendingWhatsAppMessages() {
    if (!isClientReady) {
        console.log('⏳ Client is not ready yet, skipping DB polling.');
        return;
    }
    
    console.log('🔍 Polling Neon Database for pending WhatsApp messages...');
    try {
        const query = `
            SELECT id, data 
            FROM leads 
            WHERE (data->>'source' = 'LeadIM' OR data->>'source' = 'Twilio')
              AND (data->>'phone' IS NOT NULL AND data->>'phone' != 'לא ידוע')
              AND (data->>'whatsappSent' IS NULL OR data->>'whatsappSent' = 'false')
            ORDER BY created_at ASC
        `;
        const res = await pool.query(query);
        
        if (res.rows.length === 0) {
            console.log('✅ No pending WhatsApp messages found.');
            return;
        }
        
        console.log(`Found ${res.rows.length} pending leads in DB.`);
        
        for (const row of res.rows) {
            const leadId = row.id;
            const lead = row.data;
            
            const clientName = lead.clientName || 'לקוח';
            const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, '') : '';
            const isOwner = cleanPhone.endsWith('522818541');

            if (SANDBOX_MODE) {
                // --- SANDBOX MODE ACTIVE ---
                if (!isOwner) {
                    // Skip all non-owner leads during sandbox testing to ensure complete safety
                    console.log(`🛡️ [SANDBOX MODE] Skipping lead ${clientName} (${lead.phone}) - only owner testing number is allowed.`);
                    lead.whatsappSent = 'skipped_sandbox';
                    lead.whatsappSentAt = new Date().toISOString();
                    
                    const updateQuery = `UPDATE leads SET data = $1 WHERE id = $2`;
                    await pool.query(updateQuery, [JSON.stringify(lead), leadId]);
                    continue;
                } else {
                    console.log(`🚀 [SANDBOX MODE] Owner testing lead detected! Bypassing all safety checks, wait times, and duplicates for instant testing.`);
                }
            } else {
                // --- PRODUCTION MODE ACTIVE ---
                const createdAtStr = lead.createdAt || lead.created_at;
                if (!createdAtStr) continue;
                
                const createdTime = new Date(createdAtStr).getTime();
                const elapsedMinutes = (Date.now() - createdTime) / (1000 * 60);
                
                // Safety 1: Send instantly, no wait time!
                
                // Safety 2: Check if too old (older than 30 minutes) - mark as expired so we don't spam or poll again
                if (elapsedMinutes > 30) {
                    console.log(`Lead ${clientName} (${lead.phone}) is too old (${elapsedMinutes.toFixed(1)} mins elapsed). Marking as expired.`);
                    lead.whatsappSent = 'skipped_expired';
                    lead.whatsappSentAt = new Date().toISOString();
                    
                    const updateQuery = `UPDATE leads SET data = $1 WHERE id = $2`;
                    await pool.query(updateQuery, [JSON.stringify(lead), leadId]);
                    continue;
                }
                
                // Safety 3: Skip owner's own number in production to avoid self-loops
                if (isOwner) {
                    console.log(`⚠️ Lead ${clientName} is the owner. Skipping welcome message.`);
                    lead.whatsappSent = 'skipped_owner';
                    lead.whatsappSentAt = new Date().toISOString();
                    
                    const updateQuery = `UPDATE leads SET data = $1 WHERE id = $2`;
                    await pool.query(updateQuery, [JSON.stringify(lead), leadId]);
                    continue;
                }
                
                // Safety 4: Only send to valid Israeli mobile numbers
                const isMobile = cleanPhone.startsWith('05') || cleanPhone.startsWith('9725');
                if (!isMobile) {
                    console.log(`⚠️ Lead ${clientName} (${lead.phone}) has non-mobile number. Skipping welcome message.`);
                    lead.whatsappSent = 'skipped_non_mobile';
                    lead.whatsappSentAt = new Date().toISOString();
                    
                    const updateQuery = `UPDATE leads SET data = $1 WHERE id = $2`;
                    await pool.query(updateQuery, [JSON.stringify(lead), leadId]);
                    continue;
                }
                
                // Safety 5: Check if lead is duplicate
                const dupCheck = await checkIfLeadIsDuplicate(leadId, lead.phone, lead.clientName);
                if (dupCheck.isDuplicate) {
                    console.log(`⚠️ Lead ${clientName} is a duplicate (${dupCheck.matchType} match). Skipping welcome message and notifying owner.`);
                    
                    // Send notification warning to owner's private number
                    const ownerPhone = '0522818541';
                    let formattedOwnerPhone = '972' + ownerPhone.substring(1);
                    const ownerChatId = `${formattedOwnerPhone}@c.us`;
                    const ownerMessage = `לא נשלחה הודעת פתיחה לליד בשם "${clientName}" בגלל שהוא ליד כפול.`;
                    
                    try {
                        await client.sendMessage(ownerChatId, ownerMessage);
                        console.log(`✅ Notified owner about duplicate lead ${clientName}`);
                    } catch (ownerErr) {
                        console.error(`❌ Failed to send duplicate notification to owner:`, ownerErr.message);
                    }
                    
                    // Mark as skipped in database
                    lead.whatsappSent = 'skipped_duplicate';
                    lead.whatsappSentAt = new Date().toISOString();
                    
                    const updateQuery = `UPDATE leads SET data = $1 WHERE id = $2`;
                    await pool.query(updateQuery, [JSON.stringify(lead), leadId]);
                }
                
                // Safety 6: Check if already contacted or status is not 'חדש'
                const hasBeenContacted = lead.lastContacted || (lead.callCount && lead.callCount > 0);
                const isNotNew = lead.status && lead.status !== 'חדש';
                if (hasBeenContacted || isNotNew) {
                    console.log(`⚠️ Lead ${clientName} (${lead.phone}) has already been contacted or is not new (status: ${lead.status}). Skipping welcome message.`);
                    lead.whatsappSent = 'skipped_already_contacted';
                    lead.whatsappSentAt = new Date().toISOString();
                    
                    const updateQuery = `UPDATE leads SET data = $1 WHERE id = $2`;
                    await pool.query(updateQuery, [JSON.stringify(lead), leadId]);
                    continue;
                }
            }
            
            console.log(`✉️ Sending automatic WhatsApp message to ${clientName} (${lead.phone})...`);
            
            const message = `שלום ותודה שפנית למשרדנו,
הפנייה שלך התקבלה ונציג מהמשרד ייצור קשר בהקדם.

בכדי שנוכל לתת מענה מדויק יותר נשמח לקבל ממך בקצרה את פרטי המקרה, אבחנות רפואיות וסטטוס תעסוקתי בכדי שנוכל להתכונן מראש לשיחה.`;
            
            let formattedPhone = cleanPhone;
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '972' + formattedPhone.substring(1);
            }
            const chatId = `${formattedPhone}@c.us`;
            
            try {
                await client.sendMessage(chatId, message);
                console.log(`✅ WhatsApp successfully sent to ${chatId} for lead ${clientName}`);
                
                // Mark as successfully sent in DB
                lead.whatsappSent = true;
                lead.whatsappSentAt = new Date().toISOString();
                
                // Update generalNotes with "נשלחה הודעת פתיחה"
                let newNotes = lead.generalNotes || '';
                if (newNotes.trim()) {
                    newNotes += '\nנשלחה הודעת פתיחה';
                } else {
                    newNotes = 'נשלחה הודעת פתיחה';
                }
                lead.generalNotes = newNotes;
                
                const updateQuery = `UPDATE leads SET data = $1 WHERE id = $2`;
                await pool.query(updateQuery, [JSON.stringify(lead), leadId]);
                console.log(`💾 Database updated: whatsappSent = true & generalNotes updated for lead ${clientName}`);
            } catch (sendErr) {
                console.error(`❌ Failed to send WhatsApp or update DB for ${clientName}:`, sendErr.message);
                if (sendErr.message && (
                    sendErr.message.includes('detached') || 
                    sendErr.message.includes('Protocol error') || 
                    sendErr.message.includes('closed') || 
                    sendErr.message.includes('context was destroyed')
                )) {
                    console.log('⚠️ Puppeteer browser/page became unresponsive. Triggering client recovery...');
                    isClientReady = false;
                    await notifyOwnerCrash(`⚠️ דפדפן הבוט איבד קשר או נסגר במהלך שליחה ל-${clientName}. מנסה לשחזר את הבוט אוטומטית כעת...`, sendErr);
                    recreateAndInitClient();
                }
            }
        }
    } catch (err) {
        console.error('❌ Error during WhatsApp DB polling:', err.message);
        await notifyOwnerCrash(`שגיאה קריטית בסנכרון/שילוב מסד הנתונים של הבוט: ${err.message}`, err);
    }
}

// Set up periodic DB polling every 60 seconds
setInterval(checkAndSendPendingWhatsAppMessages, 60000);

// Helper function to call Gemini API and analyze a WhatsApp reply
async function analyzeWhatsAppReply(replyText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log('⚠️ GEMINI_API_KEY is not defined, skipping AI analysis.');
        return null;
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: GEMINI_PROMPT_TEMPLATE.replace('[REPLY_TEXT]', replyText)
                    }]
                }]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text.trim();
        }
        return null;
    } catch (err) {
        console.error('❌ Gemini API call failed:', err.message);
        return null;
    }
}

// Global in-memory buffers to group multiple consecutive messages from the same client
const clientBuffers = {};

// Handle incoming WhatsApp messages from clients (AI analysis and auto-save)
async function handleIncomingMessage(msg, eventSource) {
    if (!msg.body) return;

    const from = msg.from || '';
    const to = msg.to || '';
    const body = msg.body.trim();
    const fromMe = msg.fromMe;

    // Log raw details for diagnosis
    console.log(`💬 [Event: ${eventSource}] from: ${from}, to: ${to}, fromMe: ${fromMe}, bodyLength: ${body.length}`);

    // Robust phone number extraction using Contact object and fallback parsing
    let contactNumber = '';
    try {
        const contact = await msg.getContact();
        if (contact) {
            // 1. Try formatted number (e.g. +972 52-281-8541 -> 972522818541)
            const formatted = await contact.getFormattedNumber();
            if (formatted) {
                contactNumber = formatted.replace(/\D/g, '');
                console.log(`👤 Resolved contact formatted number: ${formatted} -> ${contactNumber}`);
            }
            
            // 2. Try raw contact number as fallback if formatted failed or looks weird
            if ((!contactNumber || contactNumber.startsWith('623')) && contact.number) {
                const rawNum = contact.number.split('@')[0].replace(/\D/g, '');
                if (rawNum && !rawNum.startsWith('623')) {
                    contactNumber = rawNum;
                    console.log(`👤 Resolved contact raw number: ${contactNumber}`);
                }
            }
        }
    } catch (contactErr) {
        console.warn('⚠️ Failed to get contact details, falling back to JID extraction:', contactErr.message);
    }

    // 3. Last fallback: parse JID suffix directly
    if (!contactNumber || contactNumber.startsWith('623')) {
        const otherPartyJid = fromMe ? to : from;
        contactNumber = otherPartyJid.split('@')[0].replace(/\D/g, '');
        console.log(`👤 Resolved fallback JID number: ${contactNumber}`);
    }

    const cleanPhone = contactNumber;
    const isOwner = cleanPhone.endsWith('522818541') || cleanPhone === '62354435903598';

    console.log(`📱 Processed clean phone for other party: ${cleanPhone} (isOwner: ${isOwner})`);

    // Skip if this is the bot's own automated welcome message to prevent self-analysis
    if (body.includes('שלום ותודה שפנית למשרדנו') || body.includes('בכדי שנוכל לתת מענה')) {
        console.log(`⏭️ Skipping welcome message/prompt sent by bot to prevent recursion.`);
        return;
    }

    // In sandbox mode, only allow messages involving the owner
    if (SANDBOX_MODE && !isOwner) {
        console.log(`🛡️ [SANDBOX MODE] Skipping analysis of message involving non-owner number: ${cleanPhone}`);
        return;
    }

    // Skip outgoing messages to other people (i.e. messages sent by the bot or manual agent to clients)
    if (fromMe && from !== to) {
        console.log(`⏭️ Skipping outbound message sent to client: ${to}`);
        return;
    }

    // To prevent duplicate processing of the same message ID
    if (processedMessageIds.has(msg.id.id)) {
        console.log(`⏭️ Message already processed: ${msg.id.id}`);
        return;
    }
    processedMessageIds.add(msg.id.id);
    if (processedMessageIds.size > 100) {
        const firstValue = processedMessageIds.values().next().value;
        processedMessageIds.delete(firstValue);
    }

    console.log(`📱 Processing message from ${cleanPhone}: "${body}"`);

    try {
        let phoneForQuery = cleanPhone;
        if (cleanPhone === '62354435903598') {
            phoneForQuery = '972522818541';
        }
        const normPhone9 = phoneForQuery.slice(-9);
        const query = `
            SELECT id, data 
            FROM leads 
            WHERE (data->>'phone' IS NOT NULL)
              AND (right(regexp_replace(data->>'phone', '\\D', '', 'g'), 9) = $1)
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const res = await pool.query(query, [normPhone9]);
        
        if (res.rows.length === 0) {
            console.log(`⚠️ No matching lead found in database for phone suffix: ${normPhone9}`);
            return;
        }

        const leadId = res.rows[0].id;
        const lead = res.rows[0].data;
        const clientName = lead.clientName || 'לקוח';
        
        console.log(`🎯 Found matching lead: ${clientName} (ID: ${leadId})`);
        
        // Safety intake check: if already processed the first welcome reply, skip any subsequent casual messages!
        const alreadyAnalyzed = lead.liveCallNotes && (
            lead.liveCallNotes.includes('🤖 --- ניתוח תשובת וואטסאפ') ||
            lead.liveCallNotes.includes('💬 --- הודעת וואטסאפ שהתקבלה')
        );
        if (alreadyAnalyzed) {
            console.log(`⏭️ Intake analysis already completed for lead ${clientName}. Skipping subsequent messages.`);
            return;
        }

        // Handle consecutive/burst messages by debouncing for 3 minutes (180000ms)
        if (clientBuffers[cleanPhone]) {
            console.log(`➕ Appending message to active buffer for ${clientName}`);
            clientBuffers[cleanPhone].messages.push(body);
            if (clientBuffers[cleanPhone].timeoutId) {
                clearTimeout(clientBuffers[cleanPhone].timeoutId);
            }
        } else {
            console.log(`🆕 Creating new message buffer for ${clientName}`);
            clientBuffers[cleanPhone] = {
                timeoutId: null,
                messages: [body],
                leadId: leadId,
                clientName: clientName
            };
        }

        console.log(`⏱️ Buffering message from ${clientName}. Waiting for consecutive messages (180s)...`);
        clientBuffers[cleanPhone].timeoutId = setTimeout(async () => {
            const session = clientBuffers[cleanPhone];
            delete clientBuffers[cleanPhone]; // Clean up from memory immediately

            if (!session) return;

            const combinedText = session.messages.join('\n');
            console.log(`🎬 Debounce finished for ${session.clientName}. Processing consolidated text (${session.messages.length} messages): "${combinedText}"`);

            try {
                // Perform AI analysis on combined messages
                console.log(`🤖 Analyzing consolidated reply with Gemini AI...`);
                const analysis = await analyzeWhatsAppReply(combinedText);
                
                let analysisText = '';
                if (analysis) {
                    analysisText = `🤖 --- ניתוח תשובת וואטסאפ (${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}) ---\n${analysis}`;
                } else {
                    analysisText = `💬 --- הודעת וואטסאפ שהתקבלה (${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}) ---\n${combinedText}`;
                }
                
                // Fetch the latest state of the lead again in case fields changed during the buffering
                const freshRes = await pool.query(`SELECT data FROM leads WHERE id = $1`, [session.leadId]);
                if (freshRes.rows.length === 0) {
                    console.log(`⚠️ Lead ${session.clientName} was deleted during buffering.`);
                    return;
                }
                const latestLead = freshRes.rows[0].data;

                // Prepend analysis to liveCallNotes
                let currentNotes = latestLead.liveCallNotes || '';
                if (currentNotes.trim()) {
                    latestLead.liveCallNotes = analysisText.trim() + '\n\n' + currentNotes.trim();
                } else {
                    latestLead.liveCallNotes = analysisText.trim();
                }

                // Update generalNotes with " - הליד ענה"
                let newGeneralNotes = latestLead.generalNotes || '';
                if (newGeneralNotes.trim()) {
                    if (!newGeneralNotes.includes('הליד ענה')) {
                        if (newGeneralNotes.includes('נשלחה הודעת פתיחה')) {
                            newGeneralNotes = newGeneralNotes.replace('נשלחה הודעת פתיחה', 'נשלחה הודעת פתיחה - הליד ענה');
                        } else {
                            newGeneralNotes = newGeneralNotes.trim() + ' - הליד ענה';
                        }
                    }
                } else {
                    newGeneralNotes = 'הליד ענה';
                }
                latestLead.generalNotes = newGeneralNotes;
                
                // Save updated lead to DB
                const updateQuery = `UPDATE leads SET data = $1 WHERE id = $2`;
                await pool.query(updateQuery, [JSON.stringify(latestLead), session.leadId]);
                console.log(`💾 Saved consolidated analysis and updated generalNotes for lead ${session.clientName}`);
            } catch (err) {
                console.error(`❌ Error in message processing or DB update for ${session.clientName}:`, err.message);
            }
        }, 180000);

    } catch (err) {
        console.error('❌ Error in message processing or DB lookup:', err.message);
    }
}

// Listeners are registered inside initWhatsAppClient() now

app.get('/qr', (req, res) => {
    const qrPath = path.join(__dirname, '..', 'public', 'qr.png');
    if (fs.existsSync(qrPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.sendFile(qrPath);
    } else {
        res.status(404).send('קוד ה-QR עדיין לא נוצר או שהבוט כבר מחובר. אם הבוט מחובר, אין צורך לסרוק.');
    }
});

app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    next();
});

app.post('/api/send', async (req, res) => {
    try {
        if (!isClientReady) return res.status(503).json({ success: false, error: 'Not ready' });
        const { phone, message } = req.body;
        if (!phone || !message) return res.status(400).json({ success: false, error: 'Missing data' });

        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = '972' + formattedPhone.substring(1);
        
        const chatId = `${formattedPhone}@c.us`;
        await client.sendMessage(chatId, message);
        console.log(`Sent to ${chatId}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => console.log(`🤑 Bot Server on ${PORT}`));