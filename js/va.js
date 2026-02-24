/* ImsgDesk - VA Dashboard */
const VA = {
    currentTab: 'today',
    contactFilter: null,
    searchTerm: '',

    tabs: [
        { id: 'today', label: "📅 Today" },
        { id: 'contacts', label: '👥 Contacts' },
        { id: 'activity', label: '📋 Activity' }
    ],

    renderTabs() {
        return this.tabs.map(t => `<button class="tab ${this.currentTab === t.id ? 'active' : ''}" onclick="App.switchTab('${t.id}')">${t.label}</button>`).join('');
    },

    renderContent() {
        switch (this.currentTab) {
            case 'today': return this.renderToday();
            case 'contacts': return this.renderContacts();
            case 'activity': return this.renderActivity();
            default: return '';
        }
    },

    renderToday() {
        const calls = Store.getCalls({ today: true });
        const upcoming = Store.getCalls({ upcoming: true }).slice(0, 5);
        let html = '<div class="section-header"><h3 class="section-title">Today\'s Schedule</h3></div>';
        if (calls.length === 0) {
            html += UI.emptyState('📅', 'No calls or meetings scheduled for today.<br>Tap + to add one.');
        } else {
            calls.forEach(c => { html += UI.callCard(c, 'va'); });
        }
        if (upcoming.length > 0) {
            html += '<div class="section-header" style="margin-top:24px"><h3 class="section-title">Upcoming</h3></div>';
            upcoming.forEach(c => { html += UI.callCard(c, 'va'); });
        }
        return html;
    },

    renderContacts() {
        let html = UI.searchBar('Search contacts...', 'contact-search');
        html += UI.categoryFilters(this.contactFilter);
        const filter = {};
        if (this.contactFilter) filter.category = this.contactFilter;
        if (this.searchTerm) filter.search = this.searchTerm;
        const contacts = Store.getContacts(filter);
        if (contacts.length === 0) {
            html += UI.emptyState('👥', this.contactFilter || this.searchTerm ? 'No contacts match your filter.' : 'No contacts yet.<br>Tap + to add your first contact.');
        } else {
            contacts.forEach(c => { html += UI.contactCard(c, 'va'); });
        }
        return html;
    },

    renderActivity() {
        const activity = Store.getActivity();
        if (activity.length === 0) return UI.emptyState('📋', 'No activity yet.');
        return activity.map(a => UI.activityItem(a)).join('');
    },

    getFabActions() {
        return [
            { label: '📞 Add Call', action: 'addCall' },
            { label: '🤝 Add Meeting', action: 'addMeeting' },
            { label: '👤 Add Contact', action: 'addContact' }
        ];
    }
};
