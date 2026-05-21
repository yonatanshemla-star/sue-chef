const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env.local' });

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

const client = new Client({
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

let isClientReady = false;

client.on('qr', (qr) => {
    console.log('Scan the QR code below to authenticate in WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot is Ready and Connected!');
    isClientReady = true;
    
    // Initial DB poll after 5 seconds
    setTimeout(checkAndSendPendingWhatsAppMessages, 5000);
});

client.on('auth_failure', msg => console.error('AUTH FAIL', msg));
client.on('disconnected', (reason) => {
    console.log('Disconnected', reason);
    isClientReady = false;
});

client.initialize();

// Function to poll Neon DB for unsent WhatsApp leads (3 minutes delay)
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
            
            const createdAtStr = lead.createdAt || lead.created_at;
            if (!createdAtStr) continue;
            
            const createdTime = new Date(createdAtStr).getTime();
            const elapsedMinutes = (Date.now() - createdTime) / (1000 * 60);
            
            // Check if 3 minutes have passed since creation
            if (elapsedMinutes < 3) {
                console.log(`Lead ${lead.clientName} (${lead.phone}) is too fresh (${elapsedMinutes.toFixed(1)} mins elapsed). Waiting...`);
                continue;
            }
            
            console.log(`✉️ Sending automatic WhatsApp message to ${lead.clientName} (${lead.phone})...`);
            
            // Prepare message
            const clientName = lead.clientName || 'לקוח';
            const message = `היי ${clientName},\n\nהגעת למשרד עורכי הדין HBA. השארת אצלנו פרטים וניסיתי לחזור אלייך. אשמח אם נוכל לדבר כשיתאפשר 🙏`;
            
            let formattedPhone = lead.phone.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '972' + formattedPhone.substring(1);
            }
            const chatId = `${formattedPhone}@c.us`;
            
            try {
                await client.sendMessage(chatId, message);
                console.log(`✅ WhatsApp successfully sent to ${chatId} for lead ${lead.clientName}`);
                
                // Mark as sent in DB
                lead.whatsappSent = true;
                lead.whatsappSentAt = new Date().toISOString();
                
                const updateQuery = `
                    UPDATE leads 
                    SET data = $1 
                    WHERE id = $2
                `;
                await pool.query(updateQuery, [JSON.stringify(lead), leadId]);
                console.log(`💾 Database updated: whatsappSent = true for lead ${lead.clientName}`);
            } catch (sendErr) {
                console.error(`❌ Failed to send WhatsApp or update DB for ${lead.clientName}:`, sendErr.message);
            }
        }
    } catch (err) {
        console.error('❌ Error during WhatsApp DB polling:', err.message);
    }
}

// Set up periodic DB polling every 60 seconds
setInterval(checkAndSendPendingWhatsAppMessages, 60000);

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