const WHATSAPP_BOT_URL = process.env.WHATSAPP_BOT_URL || 'http://localhost:3001';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || 'sue-chef-secret-whatsapp-key-123';

export async function sendWhatsAppWelcome(phone: string, clientName: string) {
    if (!phone) return { success: false, error: 'No phone' };

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
            body: JSON.stringify({ phone, message })
        });

        return await response.json();
    } catch (err: any) {
        console.error('Error invoking WhatsApp bot:', err);
        return { success: false, error: err.message };
    }
}

export async function sendWhatsAppMessage(phone: string, message: string) {
    if (!phone) return { success: false, error: 'No phone' };

    try {
        const response = await fetch(`${WHATSAPP_BOT_URL}/api/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WHATSAPP_API_KEY}`
            },
            body: JSON.stringify({ phone, message })
        });

        return await response.json();
    } catch (err: any) {
        console.error('Error invoking WhatsApp bot for generic message:', err);
        return { success: false, error: err.message };
    }
}
