const WHATSAPP_BOT_URL = process.env.WHATSAPP_BOT_URL || 'http://localhost:3001';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || 'sue-chef-secret-whatsapp-key-123';

// Set to true to disable the WhatsApp integration completely.
// Change back to false to re-enable.
const IS_WHATSAPP_DISABLED = true;

export async function sendWhatsAppWelcome(phone: string, clientName: string) {
    if (IS_WHATSAPP_DISABLED) {
        console.log('[WHATSAPP] Bot is disabled, skipping welcome message');
        return { success: true, disabled: true };
    }
    if (!phone) return { success: false, error: 'No phone' };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const message = `שלום ותודה שפנית למשרדנו,
הפנייה שלך התקבלה ונציג מהמשרד ייצור קשר בהקדם.

בכדי שנוכל לתת מענה מדויק יותר נשמח לקבל ממך בקצרה את פרטי המקרה, אבחנות רפואיות וסטטוס תעסוקתי בכדי שנוכל להתכונן מראש לשיחה.`;
        
        const response = await fetch(`${WHATSAPP_BOT_URL}/api/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WHATSAPP_API_KEY}`
            },
            body: JSON.stringify({ phone, message }),
            signal: controller.signal
        });

        return await response.json();
    } catch (err: any) {
        console.error('Error invoking WhatsApp bot:', err);
        return { success: false, error: err.name === 'AbortError' ? 'Timeout' : err.message };
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function sendWhatsAppMessage(phone: string, message: string) {
    if (IS_WHATSAPP_DISABLED) {
        console.log('[WHATSAPP] Bot is disabled, skipping message send');
        return { success: true, disabled: true };
    }
    if (!phone) return { success: false, error: 'No phone' };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(`${WHATSAPP_BOT_URL}/api/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WHATSAPP_API_KEY}`
            },
            body: JSON.stringify({ phone, message }),
            signal: controller.signal
        });

        return await response.json();
    } catch (err: any) {
        console.error('Error invoking WhatsApp bot for generic message:', err);
        return { success: false, error: err.name === 'AbortError' ? 'Timeout' : err.message };
    } finally {
        clearTimeout(timeoutId);
    }
}
