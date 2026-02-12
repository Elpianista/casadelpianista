// Finance Management System

// Initialize finance section
function initFinance() {
    loadTransactions();
    setupFinanceEventListeners();
    calculateSummary();
}

// Setup event listeners
function setupFinanceEventListeners() {
    document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
    document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);
}

// Load and display all transactions
function loadTransactions(filters = {}) {
    const transactions = JSON.parse(localStorage.getItem('salesTransactions')) || [];

    let filtered = [...transactions];

    // Apply filters
    if (filters.dateFrom) {
        filtered = filtered.filter(t => t.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
        filtered = filtered.filter(t => t.date <= filters.dateTo);
    }
    if (filters.paymentMethod) {
        filtered = filtered.filter(t => t.paymentMethod === filters.paymentMethod);
    }
    if (filters.paymentStatus) {
        if (filters.paymentStatus === 'paid') {
            filtered = filtered.filter(t => t.isPaid);
        } else if (filters.paymentStatus === 'debt') {
            filtered = filtered.filter(t => !t.isPaid);
        }
    }

    renderTransactions(filtered);
}

// Render transactions table
function renderTransactions(transactions) {
    const tbody = document.getElementById('transactions-table-body');

    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #888;">
                    No hay transacciones registradas
                </td>
            </tr>
        `;
        return;
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = transactions.map(transaction => {
        const itemsSummary = transaction.items.length === 1
            ? transaction.items[0].description
            : `${transaction.items.length} ítems`;

        const statusBadge = transaction.isPaid
            ? '<span class="status-badge paid"><i class="ri-checkbox-circle-fill"></i> Pagado</span>'
            : '<span class="status-badge debt"><i class="ri-error-warning-fill"></i> Deuda</span>';

        const methodBadge = getPaymentMethodBadge(transaction.paymentMethod);

        return `
            <tr>
                <td>${formatDate(transaction.date)}</td>
                <td>${transaction.studentName}</td>
                <td>
                    <div class="items-summary" title="${transaction.items.map(i => i.description).join(', ')}">
                        ${itemsSummary}
                    </div>
                </td>
                <td>${methodBadge}</td>
                <td class="amount-cell">S/. ${transaction.total.toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td class="action-buttons">
                    <button class="btn-icon edit" onclick="editTransaction(${transaction.id})" title="Editar">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteTransaction(${transaction.id})" title="Eliminar">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                    <button class="btn-icon view" onclick="viewTransactionDetails(${transaction.id})" title="Ver detalles">
                        <i class="ri-eye-line"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Get payment method badge
function getPaymentMethodBadge(method) {
    const badges = {
        'Yape': '<span class="payment-badge yape"><i class="ri-smartphone-line"></i> Yape</span>',
        'Transferencia': '<span class="payment-badge transfer"><i class="ri-bank-line"></i> Transferencia</span>',
        'Efectivo': '<span class="payment-badge cash"><i class="ri-money-dollar-circle-line"></i> Efectivo</span>'
    };
    return badges[method] || method;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Calculate and display summary
function calculateSummary() {
    const transactions = JSON.parse(localStorage.getItem('salesTransactions')) || [];

    const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalDebts = transactions.filter(t => !t.isPaid).reduce((sum, t) => sum + t.total, 0);
    const totalPaid = transactions.filter(t => t.isPaid).reduce((sum, t) => sum + t.total, 0);

    document.getElementById('total-sales').textContent = `S/. ${totalSales.toFixed(2)}`;
    document.getElementById('total-debts').textContent = `S/. ${totalDebts.toFixed(2)}`;
    document.getElementById('total-paid').textContent = `S/. ${totalPaid.toFixed(2)}`;
}

// Apply filters
function applyFilters() {
    const filters = {
        dateFrom: document.getElementById('filter-date-from').value,
        dateTo: document.getElementById('filter-date-to').value,
        paymentMethod: document.getElementById('filter-payment-method').value,
        paymentStatus: document.getElementById('filter-payment-status').value
    };

    loadTransactions(filters);
}

// Clear filters
function clearFilters() {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('filter-payment-method').value = '';
    document.getElementById('filter-payment-status').value = '';
    loadTransactions();
}

// Edit transaction
function editTransaction(transactionId) {
    const transactions = JSON.parse(localStorage.getItem('salesTransactions')) || [];
    const transaction = transactions.find(t => t.id === transactionId);

    if (!transaction) {
        alert('Transacción no encontrada');
        return;
    }

    // Switch to sales section
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector('[data-section="ventas"]').classList.add('active');
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    document.getElementById('ventas-section').classList.add('active');

    // Populate form with transaction data
    document.getElementById('sale-student-select').value = transaction.studentId;
    checkStudentDebt(transaction.studentId);
    document.getElementById('sale-date').value = transaction.date;
    document.querySelector(`input[name="payment-method"][value="${transaction.paymentMethod}"]`).checked = true;

    // Load items
    currentSaleItems = [...transaction.items];
    renderSaleItems();

    // Load discount
    if (transaction.discount.applied) {
        document.getElementById('apply-discount').checked = true;
        document.getElementById('discount-controls').style.display = 'block';
        document.getElementById('discount-type').value = transaction.discount.type;
        document.getElementById('discount-value').value = transaction.discount.value;
    }

    // Set debt status
    document.getElementById('is-debt').checked = !transaction.isPaid;

    // Set editing mode
    editingTransactionId = transactionId;

    calculateTotals();
}

// Delete transaction
function deleteTransaction(transactionId) {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) {
        return;
    }

    let transactions = JSON.parse(localStorage.getItem('salesTransactions')) || [];
    const transaction = transactions.find(t => t.id === transactionId);

    transactions = transactions.filter(t => t.id !== transactionId);
    localStorage.setItem('salesTransactions', JSON.stringify(transactions));

    // Update student debt status
    if (transaction) {
        updateStudentDebtStatus(transaction.studentId);
    }

    loadTransactions();
    calculateSummary();

    alert('Transacción eliminada exitosamente');
}

// View transaction details
function viewTransactionDetails(transactionId) {
    const transactions = JSON.parse(localStorage.getItem('salesTransactions')) || [];
    const transaction = transactions.find(t => t.id === transactionId);

    if (!transaction) {
        alert('Transacción no encontrada');
        return;
    }

    const itemsList = transaction.items.map(item =>
        `• ${item.description}: S/. ${item.amount.toFixed(2)}`
    ).join('\n');

    const discountInfo = transaction.discount.applied
        ? `\n\nDescuento (${transaction.discount.type === 'percentage' ? transaction.discount.value + '%' : 'S/. ' + transaction.discount.value}): -S/. ${transaction.discount.amount.toFixed(2)}`
        : '';

    const details = `
DETALLES DE LA TRANSACCIÓN

Alumno: ${transaction.studentName}
Fecha: ${formatDate(transaction.date)}
Método de pago: ${transaction.paymentMethod}
Estado: ${transaction.isPaid ? 'Pagado' : 'Deuda pendiente'}

ÍTEMS:
${itemsList}

Subtotal: S/. ${transaction.subtotal.toFixed(2)}${discountInfo}
TOTAL: S/. ${transaction.total.toFixed(2)}
    `;

    alert(details);
}

// Initialize when section is shown
if (document.getElementById('finanzas-section')) {
    initFinance();
}
