// Inbox/Buzón Management System

let currentInboxFilter = 'received';
let selectedRecipient = null;

// Initialize Inbox
function initInbox() {
    loadInboxMessages();
    setupInboxEventListeners();
    updateUnreadBadges();
}

// Setup Event Listeners
function setupInboxEventListeners() {
    // Filter Buttons
    document.querySelectorAll('.inbox-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.inbox-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentInboxFilter = btn.dataset.filter;
            loadInboxMessages();
        });
    });

    // Inbox Search
    document.getElementById('inbox-search-input')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterInboxDisplay(query);
    });

    // Compose Modal
    const openComposeBtn = document.getElementById('open-compose-btn');
    const composeModal = document.getElementById('compose-modal');
    const closeComposeModal = document.getElementById('close-compose-modal');
    const cancelCompose = document.getElementById('cancel-compose');

    openComposeBtn?.addEventListener('click', () => {
        resetComposeForm();
        composeModal.classList.add('active');
    });

    [closeComposeModal, cancelCompose].forEach(btn => {
        btn?.addEventListener('click', () => {
            composeModal.classList.remove('active');
        });
    });

    // Recipient Search
    const recipientSearch = document.getElementById('recipient-search');
    const recipientResults = document.getElementById('recipient-results');
    const listStaffBtn = document.getElementById('list-staff-btn');
    const listStudentsBtn = document.getElementById('list-students-btn');

    recipientSearch?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 1) {
            recipientResults.classList.remove('active');
            return;
        }
        searchRecipients(query);
    });

    // Quick Action: List Staff
    listStaffBtn?.addEventListener('click', () => {
        searchRecipients('all-staff');
        recipientSearch.focus();
    });

    // Quick Action: List Students
    listStudentsBtn?.addEventListener('click', () => {
        searchRecipients('all-students');
        recipientSearch.focus();
    });

    // Show results on focus if there's text or trigger staff list by default
    recipientSearch?.addEventListener('focus', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length >= 1) {
            searchRecipients(query);
        }
    });

    // Close search results on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.recipient-selector-container')) {
            recipientResults?.classList.remove('active');
        }
    });

    // Send Message Form
    document.getElementById('compose-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });

    // View Message Modal Close
    document.getElementById('close-view-modal')?.addEventListener('click', () => {
        document.getElementById('view-message-modal').classList.remove('active');
    });
    document.getElementById('close-view-btn')?.addEventListener('click', () => {
        document.getElementById('view-message-modal').classList.remove('active');
    });
}

// Load and Filter Messages
function loadInboxMessages() {
    const messages = JSON.parse(localStorage.getItem('inboxMessages')) || [];
    let filtered = messages;

    if (currentInboxFilter === 'received') {
        filtered = messages.filter(m => m.type === 'received');
    } else if (currentInboxFilter === 'sent') {
        filtered = messages.filter(m => m.type === 'sent');
    } else if (currentInboxFilter === 'unread') {
        filtered = messages.filter(m => m.type === 'received' && !m.isRead);
    }

    // Sort by most recent
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    renderMessageList(filtered);
    updateFilterCounts(messages);
}

// Render Message List
function renderMessageList(messages) {
    const container = document.getElementById('message-list-container');
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="ri-mail-open-line"></i>
                <p>No hay mensajes en esta categoría</p>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(msg => {
        const date = new Date(msg.timestamp);
        const timeStr = date.toLocaleDateString() === new Date().toLocaleDateString()
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

        const avatarInitial = msg.from.charAt(0).toUpperCase();

        return `
            <div class="message-card ${!msg.isRead && msg.type === 'received' ? 'unread' : ''}" onclick="viewMessage(${msg.id})">
                <div class="sender-avatar">${avatarInitial}</div>
                <div class="message-details">
                    <div class="message-top">
                        <span class="message-sender">${msg.from}</span>
                        <span class="message-time">${timeStr}</span>
                    </div>
                    <div class="message-subject">${msg.subject}</div>
                    <div class="message-preview">${msg.body.substring(0, 80)}${msg.body.length > 80 ? '...' : ''}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Search Recipients (Staff and Students)
function searchRecipients(query) {
    const students = JSON.parse(localStorage.getItem('studentsData')) || [];
    const staff = JSON.parse(localStorage.getItem('staffData')) || [];
    const resultsContainer = document.getElementById('recipient-results');

    let filteredStudents = [];
    let filteredStaff = [];

    if (query === 'all-staff') {
        filteredStaff = staff;
    } else if (query === 'all-students') {
        filteredStudents = students;
    } else {
        filteredStudents = students.filter(s => {
            const fullName = `${s.primerNombre} ${s.segundoNombre || ''} ${s.primerApellido} ${s.segundoApellido || ''}`.toLowerCase();
            return fullName.includes(query) || s.codigoAcceso.toLowerCase().includes(query);
        });

        filteredStaff = staff.filter(s => {
            const name = s.name || `${s.primerNombre} ${s.primerApellido}`;
            const role = s.role || s.cargo || '';
            return name.toLowerCase().includes(query) || role.toLowerCase().includes(query);
        });
    }

    if (filteredStudents.length === 0 && filteredStaff.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No se encontraron resultados</div>';
    } else {
        let html = '';

        if (filteredStaff.length > 0) {
            html += '<div class="result-group-header">Personal</div>';
            html += filteredStaff.map(s => {
                const name = s.name || `${s.primerNombre} ${s.primerApellido}`;
                const role = s.role || s.cargo || '';
                return `
                    <div class="search-result-item" onclick="selectRecipient('${name}', ${s.id}, 'staff')">
                        <div class="result-avatar" style="background: var(--secondary-color)">${name.charAt(0)}</div>
                        <div class="result-info">
                            <span class="result-name">${name}</span>
                            <span class="result-meta">${role}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (filteredStudents.length > 0) {
            html += '<div class="result-group-header">Alumnos</div>';
            html += filteredStudents.map(s => `
                <div class="search-result-item" onclick="selectRecipient('${s.primerNombre} ${s.primerApellido}', ${s.id}, 'student')">
                    <div class="result-avatar">${s.primerNombre.charAt(0)}</div>
                    <div class="result-info">
                        <span class="result-name">${s.primerNombre} ${s.primerApellido}</span>
                        <span class="result-meta">Cod: ${s.codigoAcceso} | ${s.instrumento}</span>
                    </div>
                </div>
            `).join('');
        }

        resultsContainer.innerHTML = html;
    }

    resultsContainer.classList.add('active');
}

// Select Recipient
function selectRecipient(name, id, type) {
    selectedRecipient = { name, id, type };

    const tag = document.getElementById('selected-recipient-tag');
    const searchInput = document.getElementById('recipient-search');
    const results = document.getElementById('recipient-results');

    tag.querySelector('.tag-text').textContent = name;
    tag.style.display = 'inline-flex';
    searchInput.style.display = 'none';
    results.classList.remove('active');

    tag.querySelector('.remove-tag').onclick = () => {
        selectedRecipient = null;
        tag.style.display = 'none';
        searchInput.style.display = 'block';
        searchInput.value = '';
        searchInput.focus();
    };
}

// Send Message
function sendMessage() {
    if (!selectedRecipient) {
        alert('Por favor selecciona un destinatario');
        return;
    }

    const subject = document.getElementById('message-subject').value;
    const body = document.getElementById('message-body').value;

    const newMessage = {
        id: Date.now(),
        from: "Administrador",
        fromId: "admin",
        to: selectedRecipient.name,
        toId: selectedRecipient.id,
        toType: selectedRecipient.type,
        subject: subject,
        body: body,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: "sent"
    };

    const messages = JSON.parse(localStorage.getItem('inboxMessages')) || [];
    messages.push(newMessage);
    localStorage.setItem('inboxMessages', JSON.stringify(messages));

    // Simulation of receiving a reply or success
    alert('Mensaje enviado exitosamente');
    document.getElementById('compose-modal').classList.remove('active');
    loadInboxMessages();
}

// View Message
function viewMessage(id) {
    const messages = JSON.parse(localStorage.getItem('inboxMessages')) || [];
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex === -1) return;

    const msg = messages[msgIndex];

    // Mark as read
    if (!msg.isRead && msg.type === 'received') {
        messages[msgIndex].isRead = true;
        localStorage.setItem('inboxMessages', JSON.stringify(messages));
        updateUnreadBadges();
        loadInboxMessages();
    }

    // Populate Modal
    document.getElementById('view-subject').textContent = msg.subject;
    document.getElementById('view-date').textContent = new Date(msg.timestamp).toLocaleString();
    document.getElementById('view-sender-name').textContent = msg.from;
    document.getElementById('view-sender-avatar').textContent = msg.from.charAt(0);
    document.getElementById('view-recipient-name').textContent = msg.to;
    document.getElementById('view-body').textContent = msg.body;

    // Show Modal
    document.getElementById('view-message-modal').classList.add('active');

    // Delete Button logic
    document.getElementById('delete-message-btn').onclick = () => {
        if (confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
            const updated = messages.filter(m => m.id !== id);
            localStorage.setItem('inboxMessages', JSON.stringify(updated));
            document.getElementById('view-message-modal').classList.remove('active');
            loadInboxMessages();
        }
    };
}

// Update Badges and Counts
function updateUnreadBadges() {
    const messages = JSON.parse(localStorage.getItem('inboxMessages')) || [];
    const unreadCount = messages.filter(m => !m.isRead && m.type === 'received').length;

    const unreadCountHeader = document.getElementById('unread-count');
    const inboxBadge = document.getElementById('inbox-badge');

    if (unreadCountHeader) {
        unreadCountHeader.textContent = unreadCount;
        unreadCountHeader.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    if (inboxBadge) {
        inboxBadge.textContent = unreadCount;
        inboxBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
}

function updateFilterCounts(messages) {
    const receivedCount = messages.filter(m => m.type === 'received').length;
    const receivedEl = document.getElementById('count-received');
    if (receivedEl) receivedEl.textContent = receivedCount;
}

function resetComposeForm() {
    document.getElementById('compose-form').reset();
    selectedRecipient = null;
    document.getElementById('selected-recipient-tag').style.display = 'none';
    document.getElementById('recipient-search').style.display = 'block';
    document.getElementById('recipient-search').value = '';
}

function filterInboxDisplay(query) {
    const messages = JSON.parse(localStorage.getItem('inboxMessages')) || [];
    let filtered = messages;

    // First apply the current filter (received/sent etc)
    if (currentInboxFilter === 'received') {
        filtered = messages.filter(m => m.type === 'received');
    } else if (currentInboxFilter === 'sent') {
        filtered = messages.filter(m => m.type === 'sent');
    }

    // Then apply search query
    filtered = filtered.filter(m =>
        m.from.toLowerCase().includes(query) ||
        m.to.toLowerCase().includes(query) ||
        m.subject.toLowerCase().includes(query) ||
        m.body.toLowerCase().includes(query)
    );

    renderMessageList(filtered);
}

// Add some demo data if empty
if (!localStorage.getItem('inboxMessages')) {
    const demoMessages = [
        {
            id: Date.now() - 86400000,
            from: "Amy Pérez",
            fromId: 1,
            to: "Administrador",
            toId: "admin",
            subject: "Consulta sobre pagos",
            body: "Hola, quisiera saber si mi pago de este mes ya fue procesado correctamente. Gracias.",
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            isRead: false,
            type: "received"
        },
        {
            id: Date.now() - 43200000,
            from: "Mariella Castro",
            fromId: 2,
            to: "Administrador",
            toId: "admin",
            subject: "Nueva solicitud de partitura",
            body: "Profesor, el alumno Amy está solicitando la partitura de Para Elisa para su próxima clase.",
            timestamp: new Date(Date.now() - 43200000).toISOString(),
            isRead: false,
            type: "received"
        }
    ];
    localStorage.setItem('inboxMessages', JSON.stringify(demoMessages));
}

// Initialize on script load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('buzon-section')) {
        initInbox();
    }
});
