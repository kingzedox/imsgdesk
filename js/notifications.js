/* ImsgDesk - Notifications (Browser + Telegram) */
const Notifier = {
    _interval: null,
    _permission: false,
    _chatIds: ['5513249262', '6433235055'],
    _notifyEndpoint: '/api/notify', // Will be active after Vercel deploy

    async init() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') this._permission = true;
            else if (Notification.permission !== 'denied') {
                this._permission = (await Notification.requestPermission()) === 'granted';
            }
        }
        this._interval = setInterval(() => this._check(), 60000);
        this._check();
    },

    _check() {
        const now = new Date();
        const in20 = new Date(now.getTime() + 20 * 60000);
        Store.getCalls({}).forEach(call => {
            if (call.completed || call.notified20) return;
            const t = new Date(call.time);
            if (t > now && t <= in20) {
                const mins = Math.round((t - now) / 60000);
                const label = call.type === 'meetup' ? 'Meeting' : 'Call';
                const msg = `⏰ ${label} in ${mins} min: ${call.name} - ${t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })}`;

                this.send(msg, '');
                this.sendTelegram(`<b>REACH OUT ALERT</b>\n\n${msg}`);
                Store.updateCall(call.id, { notified20: true });
            }
        });
    },

    send(title, body) {
        if (this._permission) try { new Notification(title, { body }); } catch (e) { }
        App.showToast(`${title} ${body}`, 'warning');
    },

    async sendTelegram(message) {
        if (!this._chatIds || this._chatIds.length === 0) return;

        // Only try to send if we are on Vercel or have a way to reach the API
        try {
            const res = await fetch(this._notifyEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatIds: this._chatIds,
                    message: message
                })
            });
            const data = await res.json();
            console.log('Telegram sync:', data);
        } catch (e) {
            console.warn('Telegram notification failed (likely local dev or no API):', e);
        }
    },

    notify(msg, role) {
        // App Internal Notification
        App.addNotification(msg);

        // Browser Notification
        if (this._permission) try { new Notification('ImsgDesk', { body: msg }); } catch (e) { }

        // Telegram Ping
        const by = role === 'va' ? 'VA' : 'Boss';
        this.sendTelegram(`<b>UPDATE from ${by}</b>\n\n${msg}`);
    }
};
