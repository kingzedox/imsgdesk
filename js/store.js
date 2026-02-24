/* ImsgDesk - Data Store (localStorage) */
const Store = {
    _key: 'imsgdesk_data',
    _listeners: [],
    _data: null,

    init() {
        const raw = localStorage.getItem(this._key);
        this._data = raw ? JSON.parse(raw) : { contacts: [], calls: [], customCategories: [], activity: [] };
        if (!raw) this._save();
    },

    _save() { localStorage.setItem(this._key, JSON.stringify(this._data)); this._listeners.forEach(fn => fn()); },
    onChange(fn) { this._listeners.push(fn); },
    _id() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); },

    // === Contacts ===
    addContact(c) {
        const entry = { id: this._id(), name: c.name, number: c.number || '', category: c.category || 'new', tags: c.tags || [], notes: c.notes || '', clientNotes: '', createdBy: c.createdBy || 'va', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        this._data.contacts.unshift(entry);
        this.logActivity(`Added contact "${entry.name}"`, entry.createdBy);
        this._save();
        return entry;
    },

    updateContact(id, updates) {
        const c = this._data.contacts.find(x => x.id === id);
        if (!c) return null;
        Object.assign(c, updates, { updatedAt: new Date().toISOString() });
        this.logActivity(`Updated contact "${c.name}"`, updates.updatedBy || 'va');
        this._save();
        return c;
    },

    deleteContact(id) {
        const c = this._data.contacts.find(x => x.id === id);
        if (c) { this._data.contacts = this._data.contacts.filter(x => x.id !== id); this.logActivity(`Deleted contact "${c.name}"`, 'va'); this._save(); }
    },

    getContacts(filter) {
        let list = [...this._data.contacts];
        if (filter) {
            if (filter.category) list = list.filter(c => c.category === filter.category);
            if (filter.search) { const s = filter.search.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(s) || c.number.includes(s)); }
        }
        return list;
    },

    getContact(id) { return this._data.contacts.find(c => c.id === id); },

    // === Calls / Meetings ===
    addCall(c) {
        const entry = { id: this._id(), name: c.name, number: c.number || '', time: c.time, type: c.type || 'call', note: c.note || '', completed: false, tags: c.tags || [], clientNotes: '', createdBy: c.createdBy || 'va', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), notified20: false };
        this._data.calls.push(entry);
        this._data.calls.sort((a, b) => new Date(a.time) - new Date(b.time));
        this.logActivity(`Scheduled ${entry.type} with "${entry.name}"`, entry.createdBy);
        this._save();
        return entry;
    },

    updateCall(id, updates) {
        const c = this._data.calls.find(x => x.id === id);
        if (!c) return null;
        const wasCompleted = c.completed;
        Object.assign(c, updates, { updatedAt: new Date().toISOString() });
        if (!wasCompleted && updates.completed) this.logActivity(`Completed ${c.type} with "${c.name}"`, updates.updatedBy || 'client');
        else if (!updates.notified20) this.logActivity(`Updated ${c.type} with "${c.name}"`, updates.updatedBy || 'va');
        this._save();
        return c;
    },

    deleteCall(id) {
        const c = this._data.calls.find(x => x.id === id);
        if (c) { this._data.calls = this._data.calls.filter(x => x.id !== id); this.logActivity(`Deleted ${c.type} with "${c.name}"`, 'va'); this._save(); }
    },

    getCalls(filter) {
        let list = [...this._data.calls];
        if (filter) {
            if (filter.today) { const t = new Date().toDateString(); list = list.filter(c => new Date(c.time).toDateString() === t); }
            if (filter.upcoming) { const now = new Date(); list = list.filter(c => new Date(c.time) >= now && !c.completed); }
            if (filter.type) list = list.filter(c => c.type === filter.type);
            if (filter.completed !== undefined) list = list.filter(c => c.completed === filter.completed);
        }
        return list;
    },

    getCall(id) { return this._data.calls.find(c => c.id === id); },

    // === Custom Categories ===
    addCategory(c) {
        const entry = { id: this._id(), name: c.name, color: c.color, createdAt: new Date().toISOString() };
        this._data.customCategories.push(entry);
        this.logActivity(`Created category "${entry.name}"`, 'client');
        this._save();
        return entry;
    },

    deleteCategory(id) {
        const c = this._data.customCategories.find(x => x.id === id);
        if (c) { this._data.customCategories = this._data.customCategories.filter(x => x.id !== id); this.logActivity(`Deleted category "${c.name}"`, 'client'); this._save(); }
    },

    getCategories() { return [...this._data.customCategories]; },

    // === Activity ===
    logActivity(action, by) {
        this._data.activity.unshift({ id: this._id(), action, by, time: new Date().toISOString() });
        if (this._data.activity.length > 50) this._data.activity = this._data.activity.slice(0, 50);
    },

    getActivity() { return [...this._data.activity]; },

    // === Stats ===
    getStats() {
        const contacts = this._data.contacts;
        const calls = this._data.calls;
        const today = new Date().toDateString();
        const todayCalls = calls.filter(c => new Date(c.time).toDateString() === today);
        return {
            totalContacts: contacts.length,
            newContacts: contacts.filter(c => c.category === 'new').length,
            todayCalls: todayCalls.length,
            completedToday: todayCalls.filter(c => c.completed).length,
            upcomingCalls: calls.filter(c => new Date(c.time) >= new Date() && !c.completed).length,
            meetups: contacts.filter(c => c.category === 'meetup').length
        };
    }
};
