/* ImsgDesk - UI Components */
const TZ = 'America/New_York';

const DateUtils = {
    getNow() { return new Date(); },
    getTodayStr() {
        try {
            return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        } catch (e) {
            return new Date().toISOString().split('T')[0];
        }
    },
    toDayStr(isoOrDate) {
        if (!isoOrDate) return '';
        try {
            return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(isoOrDate));
        } catch (e) {
            return new Date(isoOrDate).toISOString().split('T')[0];
        }
    },
    isToday(isoOrDate) { return this.toDayStr(isoOrDate) === this.getTodayStr(); },
    isUpcoming(isoOrDate) {
        try { return new Date(isoOrDate) >= new Date(); } catch (e) { return false; }
    }
};

const UI = {
    CATS: [
        { id: 'new', label: 'New', cls: 'pill-new' },
        { id: 'called', label: 'Called', cls: 'pill-called' },
        { id: 'meetup', label: 'Meet Up', cls: 'pill-meetup' },
        { id: 'maintenance', label: 'Maintenance', cls: 'pill-maintenance' },
        { id: 'completed', label: 'Completed', cls: 'pill-completed' }
    ],

    esc(s) {
        if (s === undefined || s === null) return '';
        const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
    },

    pill(cat) {
        if (!cat) return '';
        const f = this.CATS.find(c => c.id === cat);
        if (f) return `<span class="pill ${f.cls}">${f.label}</span>`;
        const custom = Store.getCategories().find(c => c.id === cat);
        if (custom) return `<span class="pill" style="background:${custom.color}22;color:${custom.color}">${this.esc(custom.name)}</span>`;
        return `<span class="pill">${this.esc(cat)}</span>`;
    },

    contactCard(c, role) {
        if (!c) return '';
        const tags = (c.tags || []).map(t => `<span class="tag">${this.esc(t)}</span>`).join('');
        return `
        <div class="card" data-id="${c.id}">
            <div class="card-header">
                <div><div class="card-name">${this.esc(c.name)}</div><div class="card-number">${this.esc(c.number)}</div></div>
                ${this.pill(c.category)}
            </div>
            ${c.notes ? `<div class="card-note">${this.esc(c.notes)}</div>` : ''}
            ${c.clientNotes ? `<div class="card-note" style="color:var(--accent)">📝 ${this.esc(c.clientNotes)}</div>` : ''}
            ${tags ? `<div class="tags-row">${tags}</div>` : ''}
            <div class="card-footer">
                <div class="card-time">${this.timeAgo(c.updatedAt)}</div>
                <div class="card-actions">
                    <button class="btn btn-sm btn-ghost" onclick="App.editContact('${c.id}')">Edit</button>
                    ${role === 'client' ? `<button class="btn btn-sm btn-ghost" onclick="App.addTagToContact('${c.id}')">+ Tag</button>` : `<button class="btn btn-sm btn-danger" onclick="App.deleteContact('${c.id}')">Delete</button>`}
                </div>
            </div>
        </div>`;
    },

    callCard(c, role) {
        if (!c) return '';
        let time = '??:??', date = '??:??';
        try {
            const dt = new Date(c.time);
            time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
            date = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
        } catch (e) { console.warn('Invalid date in callCard:', c.time); }

        const isPast = new Date(c.time) < new Date();
        const tags = (c.tags || []).map(t => `<span class="tag">${this.esc(t)}</span>`).join('');
        return `
        <div class="card ${c.completed ? 'completed-card' : ''}" data-id="${c.id}">
            <div class="card-header">
                <div>
                    <div class="card-name">${this.esc(c.name)}</div>
                    <div class="card-number">${this.esc(c.number)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="pill ${c.type === 'meetup' ? 'pill-meetup' : 'pill-called'}">${c.type === 'meetup' ? '🤝 Meet Up' : '📞 Call'}</span>
                    ${role === 'client' ? `<div class="checkbox ${c.completed ? 'checked' : ''}" onclick="App.toggleCallComplete('${c.id}')"></div>` : ''}
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
                <span class="time-badge">${time}</span>
                <span style="font-size:13px;color:var(--text-sec)">${date}</span>
                ${isPast && !c.completed ? '<span class="pill" style="background:#FEE2E2;color:#EF4444">Overdue</span>' : ''}
            </div>
            ${c.note ? `<div class="card-note">${this.esc(c.note)}</div>` : ''}
            ${c.clientNotes ? `<div class="card-note" style="color:var(--accent)">📝 ${this.esc(c.clientNotes)}</div>` : ''}
            ${tags ? `<div class="tags-row">${tags}</div>` : ''}
            <div class="card-footer">
                <div class="card-actions">
                    <button class="btn btn-sm btn-ghost" onclick="App.editCall('${c.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteCall('${c.id}')">Delete</button>
                </div>
            </div>
        </div>`;
    },

    emptyState(emoji, msg) { return `<div class="empty-state"><div class="emoji">${emoji}</div><p>${msg}</p></div>`; },

    timeAgo(iso) {
        const s = Math.floor((new Date() - new Date(iso)) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        return Math.floor(s / 86400) + 'd ago';
    },

    activityItem(a) {
        const byLabel = a.by === 'va' ? 'VA' : 'Client';
        return `<div class="activity-item"><div class="activity-dot" style="background:${a.by === 'va' ? 'var(--accent)' : 'var(--success)'}"></div><div><div class="activity-text"><strong>${byLabel}</strong> ${this.esc(a.action)}</div><div class="activity-time">${this.timeAgo(a.time)}</div></div></div>`;
    },

    searchBar(placeholder, id) {
        return `<div class="search-bar"><svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="${id}" placeholder="${placeholder}"></div>`;
    },

    categoryFilters(active) {
        let html = '<div class="filters"><button class="filter-btn ' + (!active ? 'active' : '') + '" onclick="App.filterContacts(null)">All</button>';
        this.CATS.forEach(c => { html += `<button class="filter-btn ${active === c.id ? 'active' : ''}" onclick="App.filterContacts('${c.id}')">${c.label}</button>`; });
        Store.getCategories().forEach(c => { html += `<button class="filter-btn ${active === c.id ? 'active' : ''}" onclick="App.filterContacts('${c.id}')" style="border-color:${c.color};color:${c.color}">${this.esc(c.name)}</button>`; });
        return html + '</div>';
    },

    categorySelect(selected) {
        let html = '<div class="category-select">';
        this.CATS.forEach(c => { html += `<button type="button" class="category-option ${selected === c.id ? 'selected' : ''}" data-cat="${c.id}" onclick="App._selectCat(this)">${c.label}</button>`; });
        Store.getCategories().forEach(c => { html += `<button type="button" class="category-option ${selected === c.id ? 'selected' : ''}" data-cat="${c.id}" style="color:${c.color}" onclick="App._selectCat(this)">${this.esc(c.name)}</button>`; });
        return html + '</div>';
    },

    summaryCards(stats) {
        return `
        <div class="summary-card" style="border-color:var(--accent)"><div class="count">${stats.todayCalls}</div><div class="label">Today's Calls</div></div>
        <div class="summary-card" style="border-color:var(--success)"><div class="count">${stats.completedToday}</div><div class="label">Completed</div></div>
        <div class="summary-card" style="border-color:var(--cat-new)"><div class="count">${stats.newContacts}</div><div class="label">New Contacts</div></div>
        <div class="summary-card" style="border-color:var(--warning)"><div class="count">${stats.upcomingCalls}</div><div class="label">Upcoming</div></div>`;
    }
};
