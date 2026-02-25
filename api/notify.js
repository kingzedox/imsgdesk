// Vercel Serverless Function - Telegram Notifications
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Set this in Vercel Environment Variables
if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is missing!');
}
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET' && req.query.action === 'getUpdates') {
        // Get recent bot updates to find chat IDs
        const response = await fetch(`${TG_API}/getUpdates`);
        const data = await response.json();
        return res.json(data);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const { chatIds, message } = req.body;
    if (!chatIds || !message) return res.status(400).json({ error: 'chatIds and message required' });

    const results = [];
    for (const chatId of chatIds) {
        try {
            const response = await fetch(`${TG_API}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
            });
            const data = await response.json();
            results.push({ chatId, ok: data.ok });
        } catch (e) {
            results.push({ chatId, ok: false, error: e.message });
        }
    }

    return res.json({ ok: true, results });
}
