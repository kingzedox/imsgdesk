/* ImsgDesk - Notifications */
const Notifier = {
    _interval: null,
    _permission: false,

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
                this.send(`⏰ ${label} in ${mins} min`, `${call.name} - ${t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })}`);
                Store.updateCall(call.id, { notified20: true });
            }
        });
    },

    send(title, body) {
        if (this._permission) try { new Notification(title, { body }); } catch (e) { }
        App.showToast(`${title}: ${body}`, 'warning');
    },

    notify(msg) {
        if (this._permission) try { new Notification('ImsgDesk', { body: msg }); } catch (e) { }
        App.addNotification(msg);
    }
};
