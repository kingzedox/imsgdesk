/* ImsgDesk - Main App */
const App = {
    role: null, // 'va' or 'client'
    _notifications: [],
    _fabOpen: false,

    USERS: {
        'virtual assistant': { password: 'kingzedox', role: 'va', name: 'VA' },
        'client': { password: 'dextoid', role: 'client', name: 'Boss' }
    },

    init() {
        Store.init();
        Store.onChange(() => this.render());

        // Check saved session
        const saved = localStorage.getItem('imsgdesk_session');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                this.role = s.role;
                this._showDashboard();
            } catch (e) {
                localStorage.removeItem('imsgdesk_session');
            }
        }

        // Login form
        const lForm = document.getElementById('login-form');
        if (lForm) {
            lForm.addEventListener('submit', e => {
                e.preventDefault();
                const u = document.getElementById('username').value.trim().toLowerCase();
                const p = document.getElementById('password').value;
                const user = this.USERS[u];
                if (user && user.password === p) {
                    this.role = user.role;
                    localStorage.setItem('imsgdesk_session', JSON.stringify({ role: user.role, name: user.name }));
                    document.getElementById('login-error').classList.add('hidden');
                    this._showDashboard();
                } else {
                    const err = document.getElementById('login-error');
                    err.textContent = 'Invalid username or password';
                    err.classList.remove('hidden');
                }
            });
        }

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('imsgdesk_session');
            this.role = null;
            document.getElementById('dashboard-view').classList.remove('active');
            document.getElementById('dashboard-view').classList.add('hidden');
            document.getElementById('login-view').classList.add('active');
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        });

        // Modal close
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) this.closeModal(); });

        // FAB
        document.getElementById('fab-btn').addEventListener('click', () => this._toggleFab());

        // Notification panel
        document.getElementById('notif-btn').addEventListener('click', () => {
            const panel = document.getElementById('notif-panel');
            panel.classList.toggle('hidden');
        });
        document.getElementById('clear-notifs').addEventListener('click', () => {
            this._notifications = [];
            this._renderNotifPanel();
            document.getElementById('notif-badge').classList.add('hidden');
        });

        // Close notif panel on outside click
        document.addEventListener('click', e => {
            const panel = document.getElementById('notif-panel');
            const btn = document.getElementById('notif-btn');
            if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && !btn.contains(e.target)) {
                panel.classList.add('hidden');
            }
        });

        Notifier.init();
    },

    _showDashboard() {
        document.getElementById('login-view').classList.remove('active');
        document.getElementById('dashboard-view').classList.remove('hidden');
        document.getElementById('dashboard-view').classList.add('active');
        const session = JSON.parse(localStorage.getItem('imsgdesk_session'));
        document.getElementById('header-greeting').textContent = `Hey, ${session.name}! 👋`;
        document.getElementById('header-subtitle').innerHTML = `${this.role === 'va' ? 'Virtual Assistant Dashboard' : 'Client Dashboard'} <span id="sync-status" class="sync-dot red"></span>`;
        this.render();
    },

    setSyncStatus(active) {
        const dot = document.getElementById('sync-status');
        if (dot) {
            dot.className = `sync-dot ${active ? 'green' : 'red'}`;
            dot.title = active ? 'Synced with live database' : 'Connecting to database...';
        }
    },

    render() {
        try {
            console.log('App: Rendering...', { role: this.role });
            const dash = this.role === 'va' ? VA : Client;
            if (!dash) throw new Error('No dashboard for role: ' + this.role);

            document.getElementById('tabs').innerHTML = dash.renderTabs();
            document.getElementById('content').innerHTML = dash.renderContent();

            const stats = Store.getStats();
            console.log('App: Stats update:', stats);
            document.getElementById('summary-cards').innerHTML = UI.summaryCards(stats);

            // Attach search listener
            const searchEl = document.getElementById('contact-search');
            if (searchEl) {
                searchEl.value = dash.searchTerm || '';
                searchEl.addEventListener('input', e => {
                    dash.searchTerm = e.target.value;
                    try {
                        document.getElementById('content').innerHTML = dash.renderContent();
                        const newSearch = document.getElementById('contact-search');
                        if (newSearch) { newSearch.value = dash.searchTerm; newSearch.focus(); }
                    } catch (e) {
                        console.error('Search render error:', e);
                    }
                });
            }
        } catch (e) {
            console.error('App Render Error:', e);
            document.getElementById('content').innerHTML = `<div class="empty-state"><p>Something went wrong during render: ${e.message}</p><button class="btn btn-sm btn-ghost" onclick="location.reload()">Reload App</button></div>`;
        }
    },

    switchTab(tab) {
        const dash = this.role === 'va' ? VA : Client;
        dash.currentTab = tab;
        this.render();
    },

    filterContacts(cat) {
        const dash = this.role === 'va' ? VA : Client;
        dash.contactFilter = cat;
        this.render();
    },

    // === FAB ===
    _toggleFab() {
        this._fabOpen = !this._fabOpen;
        const existing = document.querySelector('.fab-menu');
        if (existing) { existing.remove(); this._fabOpen = false; return; }
        const dash = this.role === 'va' ? VA : Client;
        const actions = dash.getFabActions();
        let html = '<div class="fab-menu">';
        actions.forEach(a => { html += `<button class="fab-menu-item" onclick="App.fabAction('${a.action}')">${a.label}</button>`; });
        html += '</div>';
        document.body.insertAdjacentHTML('beforeend', html);
        setTimeout(() => { document.addEventListener('click', this._closeFab, { once: true }); }, 10);
    },

    _closeFab(e) {
        const menu = document.querySelector('.fab-menu');
        if (menu && !menu.contains(e.target) && !document.getElementById('fab-btn').contains(e.target)) {
            menu.remove();
            App._fabOpen = false;
        }
    },

    fabAction(action) {
        const menu = document.querySelector('.fab-menu');
        if (menu) menu.remove();
        this._fabOpen = false;
        switch (action) {
            case 'addCall': this.showAddCallModal('call'); break;
            case 'addMeeting': this.showAddCallModal('meetup'); break;
            case 'addContact': this.showAddContactModal(); break;
        }
    },

    // === Modals ===
    openModal(title, bodyHtml) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },

    showAddCallModal(type) {
        const label = type === 'meetup' ? 'Meeting' : 'Call';
        this.openModal(`Add ${label}`, `
            <form id="add-call-form">
                <div class="input-group"><label>Name</label><input type="text" id="call-name" placeholder="Contact name" required></div>
                <div class="input-group"><label>Number</label><input type="tel" id="call-number" placeholder="Phone number"></div>
                <div class="input-group"><label>Date & Time</label><input type="datetime-local" id="call-time" required></div>
                <div class="input-group"><label>Note</label><textarea id="call-note" placeholder="Any notes..."></textarea></div>
                <button type="submit" class="btn btn-primary btn-full">Add ${label}</button>
            </form>
        `);
        // Default to now + 1 hour
        const now = new Date(); now.setHours(now.getHours() + 1, 0, 0, 0);
        document.getElementById('call-time').value = now.toISOString().slice(0, 16);
        document.getElementById('add-call-form').addEventListener('submit', e => {
            e.preventDefault();
            Store.addCall({ name: document.getElementById('call-name').value.trim(), number: document.getElementById('call-number').value.trim(), time: document.getElementById('call-time').value, type, note: document.getElementById('call-note').value.trim(), createdBy: this.role });
            Notifier.notify(`New ${label.toLowerCase()} scheduled with ${document.getElementById('call-name').value.trim()}`, this.role);
            this.closeModal();
            this.showToast(`${label} added!`, 'success');
        });
    },

    showAddContactModal(editId) {
        const existing = editId ? Store.getContact(editId) : null;
        const title = existing ? 'Edit Contact' : 'Add Contact';
        const btnLabel = existing ? 'Save Changes' : 'Add Contact';
        this.openModal(title, `
            <form id="add-contact-form">
                <div class="input-group"><label>Name</label><input type="text" id="ct-name" value="${existing ? UI.esc(existing.name) : ''}" placeholder="Contact name" required></div>
                <div class="input-group"><label>Number</label><input type="tel" id="ct-number" value="${existing ? UI.esc(existing.number) : ''}" placeholder="Phone number"></div>
                <div class="input-group"><label>Category</label>${UI.categorySelect(existing ? existing.category : 'new')}</div>
                <div class="input-group"><label>Notes</label><textarea id="ct-notes" placeholder="Notes about this person...">${existing ? UI.esc(existing.notes) : ''}</textarea></div>
                ${this.role === 'client' && existing ? `<div class="input-group"><label>Client Notes</label><textarea id="ct-client-notes" placeholder="Your personal notes...">${UI.esc(existing.clientNotes || '')}</textarea></div>` : ''}
                <button type="submit" class="btn btn-primary btn-full">${btnLabel}</button>
            </form>
        `);
        document.getElementById('add-contact-form').addEventListener('submit', e => {
            e.preventDefault();
            const cat = document.querySelector('.category-option.selected');
            const data = { name: document.getElementById('ct-name').value.trim(), number: document.getElementById('ct-number').value.trim(), category: cat ? cat.dataset.cat : 'new', notes: document.getElementById('ct-notes').value.trim(), updatedBy: this.role };
            if (this.role === 'client' && document.getElementById('ct-client-notes')) data.clientNotes = document.getElementById('ct-client-notes').value.trim();
            if (existing) { Store.updateContact(editId, data); this.showToast('Contact updated!', 'success'); }
            else { data.createdBy = this.role; Store.addContact(data); Notifier.notify(`New contact added: ${data.name}`, this.role); this.showToast('Contact added!', 'success'); }
            this.closeModal();
        });
    },

    _selectCat(btn) {
        document.querySelectorAll('.category-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    },

    editContact(id) { this.showAddContactModal(id); },

    deleteContact(id) {
        if (confirm('Delete this contact?')) { Store.deleteContact(id); this.showToast('Contact deleted', 'error'); }
    },

    editCall(id) {
        const c = Store.getCall(id);
        if (!c) return;
        this.openModal('Edit ' + (c.type === 'meetup' ? 'Meeting' : 'Call'), `
            <form id="edit-call-form">
                <div class="input-group"><label>Name</label><input type="text" id="ec-name" value="${UI.esc(c.name)}" required></div>
                <div class="input-group"><label>Number</label><input type="tel" id="ec-number" value="${UI.esc(c.number)}"></div>
                <div class="input-group"><label>Date & Time</label><input type="datetime-local" id="ec-time" value="${c.time}" required></div>
                <div class="input-group"><label>Note</label><textarea id="ec-note">${UI.esc(c.note)}</textarea></div>
                ${this.role === 'client' ? `<div class="input-group"><label>Client Notes</label><textarea id="ec-cnotes" placeholder="Your notes...">${UI.esc(c.clientNotes || '')}</textarea></div>` : ''}
                <button type="submit" class="btn btn-primary btn-full">Save Changes</button>
            </form>
        `);
        document.getElementById('edit-call-form').addEventListener('submit', e => {
            e.preventDefault();
            const updates = { name: document.getElementById('ec-name').value.trim(), number: document.getElementById('ec-number').value.trim(), time: document.getElementById('ec-time').value, note: document.getElementById('ec-note').value.trim(), updatedBy: this.role };
            if (this.role === 'client' && document.getElementById('ec-cnotes')) updates.clientNotes = document.getElementById('ec-cnotes').value.trim();
            Store.updateCall(id, updates);
            Notifier.notify(`${c.type === 'meetup' ? 'Meeting' : 'Call'} with ${updates.name} was updated`, this.role);
            this.closeModal();
            this.showToast('Updated!', 'success');
        });
    },

    deleteCall(id) {
        if (confirm('Delete this entry?')) { Store.deleteCall(id); this.showToast('Deleted', 'error'); }
    },

    toggleCallComplete(id) {
        const c = Store.getCall(id);
        if (!c) return;
        Store.updateCall(id, { completed: !c.completed, updatedBy: this.role });
        this.showToast(c.completed ? 'Marked incomplete' : 'Marked complete! ✅', 'success');
    },

    addTagToContact(id) {
        const c = Store.getContact(id);
        if (!c) return;
        this.openModal('Add Tag', `
            <div class="input-group"><label>Current Tags</label><div class="tags-row" style="min-height:24px">${(c.tags || []).map(t => `<span class="tag">${UI.esc(t)} <span class="tag-remove" onclick="App._removeTag('${id}','${t}')">×</span></span>`).join('')}${(!c.tags || c.tags.length === 0) ? '<span style="color:var(--text-sec);font-size:13px">No tags yet</span>' : ''}</div></div>
            <form id="tag-form"><div class="input-group"><label>New Tag</label><input type="text" id="new-tag" placeholder="e.g. VIP, Follow Up, Hot..." required></div><button type="submit" class="btn btn-primary btn-full">Add Tag</button></form>
        `);
        document.getElementById('tag-form').addEventListener('submit', e => {
            e.preventDefault();
            const tag = document.getElementById('new-tag').value.trim();
            if (tag) {
                const tags = c.tags || [];
                if (!tags.includes(tag)) {
                    tags.push(tag);
                    Store.updateContact(id, { tags: tags, updatedBy: this.role });
                    Notifier.notify(`Tag "${tag}" added to ${c.name}`, this.role);
                    this.showToast('Tag added!', 'success');
                }
            }
            this.closeModal();
        });
    },

    _removeTag(contactId, tag) {
        const c = Store.getContact(contactId);
        if (!c) return;
        c.tags = (c.tags || []).filter(t => t !== tag);
        Store.updateContact(contactId, { tags: c.tags, updatedBy: this.role });
        this.addTagToContact(contactId); // Re-render modal
    },

    showAddCategoryModal() {
        const colors = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DB2777', '#EF4444', '#06B6D4', '#8B5CF6', '#F97316', '#EC4899'];
        this.openModal('New Category', `
            <form id="cat-form">
                <div class="input-group"><label>Name</label><input type="text" id="cat-name" placeholder="Category name" required></div>
                <div class="input-group"><label>Color</label><div class="color-picker-row">${colors.map((c, i) => `<div class="color-swatch ${i === 0 ? 'selected' : ''}" style="background:${c}" data-color="${c}" onclick="App._selectColor(this)"></div>`).join('')}</div></div>
                <button type="submit" class="btn btn-primary btn-full">Create Category</button>
            </form>
        `);
        document.getElementById('cat-form').addEventListener('submit', e => {
            e.preventDefault();
            const sel = document.querySelector('.color-swatch.selected');
            Store.addCategory({ name: document.getElementById('cat-name').value.trim(), color: sel ? sel.dataset.color : '#7C3AED' });
            Notifier.notify(`New category created: ${document.getElementById('cat-name').value.trim()}`, this.role);
            this.closeModal();
            this.showToast('Category created!', 'success');
        });
    },

    _selectColor(el) {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
    },

    deleteCategory(id) {
        if (confirm('Delete this category?')) { Store.deleteCategory(id); this.showToast('Category deleted', 'error'); }
    },

    // === Toast ===
    showToast(msg, type) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type || ''}`;
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
    },

    // === Notifications ===
    addNotification(msg) {
        this._notifications.unshift({ msg, time: new Date().toISOString(), read: false });
        const badge = document.getElementById('notif-badge');
        if (badge) {
            const unread = this._notifications.filter(n => !n.read).length;
            badge.textContent = unread;
            badge.classList.toggle('hidden', unread === 0);
        }
        this._renderNotifPanel();
    },

    _renderNotifPanel() {
        const list = document.getElementById('notif-list');
        if (!list) return;
        if (this._notifications.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No notifications yet</p></div>';
        } else {
            list.innerHTML = this._notifications.map(n => `<div class="notif-item ${n.read ? '' : 'unread'}" onclick="this.classList.remove('unread')"><div>${UI.esc(n.msg)}</div><div class="notif-time">${UI.timeAgo(n.time)}</div></div>`).join('');
        }
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
