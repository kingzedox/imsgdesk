/* ImsgDesk - Data Store (Firebase Realtime Database) */
const Store = {
    _data: { contacts: {}, calls: {}, customCategories: {}, activity: {} },
    _listeners: [],

    init() {
        firebase.database().ref('data').on('value', snap => {
            const val = snap.val() || {};
            this._data = {
                contacts: val.contacts || {},
                calls: val.calls || {},
                customCategories: val.customCategories || {},
                activity: val.activity || {}
            };
            this._listeners.forEach(fn => fn());
        });
    },

    onChange(fn) { this._listeners.push(fn); },
    _id() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); },
    _arr(obj) { return Object.values(obj || {}); },

    // === Contacts ===
    addContact(c) {
        const id = this._id();
        const entry = { id, name: c.name, number: c.number || '', category: c.category || 'new', tags: c.tags || [], notes: c.notes || '', clientNotes: '', createdBy: c.createdBy || 'va', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        firebase.database().ref('data/contacts/' + id).set(entry);
        this.logActivity(`Added contact "${entry.name}"`, entry.createdBy);
        return entry;
    },

    updateContact(id, updates) {
        const c = this._data.contacts[id];
        if (!c) return null;
        const updated = Object.assign({}, c, updates, { updatedAt: new Date().toISOString() });
        firebase.database().ref('data/contacts/' + id).set(updated);
        this.logActivity(`Updated contact "${updated.name}"`, updates.updatedBy || 'va');
        return updated;
    },

    deleteContact(id) {
        const c = this._data.contacts[id];
        if (c) {
            firebase.database().ref('data/contacts/' + id).remove();
            this.logActivity(`Deleted contact "${c.name}"`, 'va');
        }
    },

    getContacts(filter) {
        let list = this._arr(this._data.contacts);
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (filter) {
            if (filter.category) list = list.filter(c => c.category === filter.category);
            if (filter.search) { const s = filter.search.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(s) || (c.number && c.number.includes(s))); }
        }
        return list;
    },

    getContact(id) { return this._data.contacts[id] || null; },

    // === Calls / Meetings ===
    addCall(c) {
        const id = this._id();
        const entry = { id, name: c.name, number: c.number || '', time: c.time, type: c.type || 'call', note: c.note || '', completed: false, tags: c.tags || [], clientNotes: '', createdBy: c.createdBy || 'va', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), notified20: false };
        firebase.database().ref('data/calls/' + id).set(entry);
        this.logActivity(`Scheduled ${entry.type} with "${entry.name}"`, entry.createdBy);
        return entry;
    },

    updateCall(id, updates) {
        const c = this._data.calls[id];
        if (!c) return null;
        const wasCompleted = c.completed;
        const updated = Object.assign({}, c, updates, { updatedAt: new Date().toISOString() });
        firebase.database().ref('data/calls/' + id).set(updated);
        if (!wasCompleted && updates.completed) this.logActivity(`Completed ${c.type} with "${c.name}"`, updates.updatedBy || 'client');
        else if (!updates.notified20) this.logActivity(`Updated ${c.type} with "${c.name}"`, updates.updatedBy || 'va');
        return updated;
    },

    deleteCall(id) {
        const c = this._data.calls[id];
        if (c) {
            firebase.database().ref('data/calls/' + id).remove();
            this.logActivity(`Deleted ${c.type} with "${c.name}"`, 'va');
        }
    },

    getCalls(filter) {
        let list = this._arr(this._data.calls);
        list.sort((a, b) => new Date(a.time) - new Date(b.time));
        if (filter) {
            if (filter.today) { const t = new Date().toDateString(); list = list.filter(c => new Date(c.time).toDateString() === t); }
            if (filter.upcoming) { const now = new Date(); list = list.filter(c => new Date(c.time) >= now && !c.completed); }
            if (filter.type) list = list.filter(c => c.type === filter.type);
            if (filter.completed !== undefined) list = list.filter(c => c.completed === filter.completed);
        }
        return list;
    },

    getCall(id) { return this._data.calls[id] || null; },

    // === Custom Categories ===
    addCategory(c) {
        const id = this._id();
        const entry = { id, name: c.name, color: c.color, createdAt: new Date().toISOString() };
        firebase.database().ref('data/customCategories/' + id).set(entry);
        this.logActivity(`Created category "${entry.name}"`, 'client');
        return entry;
    },

    deleteCategory(id) {
        const c = this._data.customCategories[id];
        if (c) {
            firebase.database().ref('data/customCategories/' + id).remove();
            this.logActivity(`Deleted category "${c.name}"`, 'client');
        }
    },

    getCategories() { return this._arr(this._data.customCategories); },

    // === Activity ===
    logActivity(action, by) {
        const id = this._id();
        firebase.database().ref('data/activity/' + id).set({ id, action, by, time: new Date().toISOString() });
    },

    getActivity() {
        let list = this._arr(this._data.activity);
        list.sort((a, b) => new Date(b.time) - new Date(a.time));
        return list.slice(0, 50);
    },

    // === Stats ===
    getStats() {
        const contacts = this._arr(this._data.contacts);
        const calls = this._arr(this._data.calls);
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
