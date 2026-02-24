/* ImsgDesk - Client Dashboard */
const Client = {
    currentTab: 'today',
    contactFilter: null,
    searchTerm: '',

    tabs: [
        { id: 'today', label: '📅 Today' },
        { id: 'contacts', label: '👥 Contacts' },
        { id: 'categories', label: '🏷️ Categories' },
        { id: 'activity', label: '📋 Activity' }
    ],

    renderTabs() {
        return this.tabs.map(t => `<button class="tab ${this.currentTab === t.id ? 'active' : ''}" onclick="App.switchTab('${t.id}')">${t.label}</button>`).join('');
    },

    renderContent() {
        switch (this.currentTab) {
            case 'today': return this.renderToday();
            case 'contacts': return this.renderContacts();
            case 'categories': return this.renderCategories();
            case 'activity': return this.renderActivity();
            default: return '';
        }
    },

    renderToday() {
        const calls = Store.getCalls({ today: true });
        const upcoming = Store.getCalls({ upcoming: true }).slice(0, 5);
        let html = '<div class="section-header"><h3 class="section-title">Today\'s Schedule</h3></div>';
        if (calls.length === 0) {
            html += UI.emptyState('📅', 'No calls or meetings scheduled for today.');
        } else {
            calls.forEach(c => { html += UI.callCard(c, 'client'); });
        }
        if (upcoming.length > 0) {
            html += '<div class="section-header" style="margin-top:24px"><h3 class="section-title">Upcoming</h3></div>';
            upcoming.forEach(c => { html += UI.callCard(c, 'client'); });
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
            html += UI.emptyState('👥', this.contactFilter || this.searchTerm ? 'No contacts match your filter.' : 'No contacts yet.');
        } else {
            contacts.forEach(c => { html += UI.contactCard(c, 'client'); });
        }
        return html;
    },

    renderCategories() {
        const cats = Store.getCategories();
        let html = '<div class="section-header"><h3 class="section-title">Custom Categories</h3><button class="btn btn-sm btn-primary" onclick="App.showAddCategoryModal()">+ Add</button></div>';
        html += '<p style="color:var(--text-sec);font-size:14px;margin-bottom:16px">Create custom categories to organize your contacts beyond the defaults.</p>';
        if (cats.length === 0) {
            html += UI.emptyState('🏷️', 'No custom categories yet.<br>Tap "Add" to create one.');
        } else {
            cats.forEach(c => {
                html += `<div class="custom-cat-card"><div class="custom-cat-info"><div class="custom-cat-dot" style="background:${c.color}"></div><div class="custom-cat-name">${UI.esc(c.name)}</div></div><button class="btn btn-sm btn-danger" onclick="App.deleteCategory('${c.id}')">Delete</button></div>`;
            });
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
