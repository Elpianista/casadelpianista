// Sales Management System
let currentSaleItems = [];
let editingTransactionId = null;

// Recalculate all student debts from existing transactions (migration fix)
window.recalculateAllStudentDebts = function () {
    const transactions = JSON.parse(localStorage.getItem('salesTransactions')) || [];
    const studentsData = JSON.parse(localStorage.getItem('studentsData')) || [];

    // Create a map of student IDs to their debt amounts
    const debtMap = {};

    // Calculate debt for each student
    studentsData.forEach(student => {
        const studentTransactions = transactions.filter(t => t.studentId === student.id);
        const totalDebt = studentTransactions
            .filter(t => !t.isPaid)
            .reduce((sum, t) => sum + t.total, 0);

        debtMap[student.id] = totalDebt;
    });

    // Update all students with their calculated debts
    studentsData.forEach(student => {
        student.deudaPendiente = debtMap[student.id] || 0;
    });

    // Save updated data
    localStorage.setItem('studentsData', JSON.stringify(studentsData));

    console.log('✅ Recalculated debts for all students');
}

// Initialize sales section
function initSales() {
    loadStudentSelector();
    setupSalesEventListeners();
    setTodayDate();
    recalculateAllStudentDebts(); // Fix existing data
}

// Set today's date as default
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('sale-date').value = today;
}

// Load students into selector and show debt status
function loadStudentSelector() {
    const select = document.getElementById('sale-student-select');
    const studentsData = JSON.parse(localStorage.getItem('studentsData')) || [];

    select.innerHTML = '<option value="">Seleccionar alumno...</option>';

    studentsData.forEach(student => {
        const fullName = `${student.primerNombre} ${student.primerApellido}`;
        select.innerHTML += `<option value="${student.id}">${fullName}</option>`;
    });
}

// Check and display student debt
function checkStudentDebt(studentId) {
    const transactions = JSON.parse(localStorage.getItem('salesTransactions')) || [];
    const studentDebts = transactions.filter(t => t.studentId == studentId && !t.isPaid);

    const debtIndicator = document.getElementById('student-debt-indicator');
    const debtMessage = document.getElementById('debt-message');

    if (studentDebts.length > 0) {
        const totalDebt = studentDebts.reduce((sum, t) => sum + t.total, 0);
        debtIndicator.style.display = 'flex';
        debtMessage.textContent = `Este alumno tiene una deuda pendiente de S/. ${totalDebt.toFixed(2)}`;
    } else {
        debtIndicator.style.display = 'none';
    }
}

// Setup all event listeners for sales form
function setupSalesEventListeners() {
    // Student selection change
    document.getElementById('sale-student-select').addEventListener('change', (e) => {
        if (e.target.value) {
            checkStudentDebt(e.target.value);
        } else {
            document.getElementById('student-debt-indicator').style.display = 'none';
        }
    });

    // Item type change - show description for "Otros"
    document.getElementById('item-type-select').addEventListener('change', (e) => {
        const descInput = document.getElementById('item-description');
        descInput.style.display = e.target.value === 'Otros' ? 'block' : 'none';
        if (e.target.value !== 'Otros') {
            descInput.value = '';
        }
    });

    // Add item button
    document.getElementById('add-item-btn').addEventListener('click', addSaleItem);

    // Discount toggle
    document.getElementById('apply-discount').addEventListener('change', (e) => {
        document.getElementById('discount-controls').style.display = e.target.checked ? 'block' : 'none';
        calculateTotals();
    });

    // Discount value changes
    document.getElementById('discount-type').addEventListener('change', calculateTotals);
    document.getElementById('discount-value').addEventListener('input', calculateTotals);

    // Save and clear buttons
    document.getElementById('save-sale-btn').addEventListener('click', saveSaleTransaction);
    document.getElementById('clear-sale-btn').addEventListener('click', clearSaleForm);
}

// Add item to sale
function addSaleItem() {
    const typeSelect = document.getElementById('item-type-select');
    const description = document.getElementById('item-description');
    const amountInput = document.getElementById('item-amount');

    const type = typeSelect.value;
    const amount = parseFloat(amountInput.value);

    if (!type) {
        alert('Selecciona un tipo de ítem');
        return;
    }

    if (!amount || amount <= 0) {
        alert('Ingresa un monto válido');
        return;
    }

    if (type === 'Otros' && !description.value.trim()) {
        alert('Ingresa una descripción para "Otros"');
        return;
    }

    const item = {
        type: type,
        description: type === 'Otros' ? description.value.trim() : type,
        amount: amount
    };

    currentSaleItems.push(item);
    renderSaleItems();
    calculateTotals();

    // Clear inputs
    typeSelect.value = '';
    description.value = '';
    description.style.display = 'none';
    amountInput.value = '';
}

// Remove item from sale
function removeSaleItem(index) {
    currentSaleItems.splice(index, 1);
    renderSaleItems();
    calculateTotals();
}

// Render sale items list
function renderSaleItems() {
    const list = document.getElementById('sale-items-list');

    if (currentSaleItems.length === 0) {
        list.innerHTML = '<div class="empty-items">No hay ítems agregados</div>';
        return;
    }

    list.innerHTML = currentSaleItems.map((item, index) => `
        <div class="sale-item">
            <div class="item-details">
                <span class="item-type">${item.type}</span>
                ${item.type === 'Otros' ? `<span class="item-desc">${item.description}</span>` : ''}
            </div>
            <div class="item-amount">S/. ${item.amount.toFixed(2)}</div>
            <button class="btn-remove-item" onclick="removeSaleItem(${index})" title="Eliminar">
                <i class="ri-close-line"></i>
            </button>
        </div>
    `).join('');
}

// Calculate subtotal, discount, and total
function calculateTotals() {
    const subtotal = currentSaleItems.reduce((sum, item) => sum + item.amount, 0);

    let discountAmount = 0;
    const applyDiscount = document.getElementById('apply-discount').checked;

    if (applyDiscount) {
        const discountType = document.getElementById('discount-type').value;
        const discountValue = parseFloat(document.getElementById('discount-value').value) || 0;

        if (discountType === 'percentage') {
            discountAmount = (subtotal * discountValue) / 100;
        } else {
            discountAmount = discountValue;
        }

        // Don't allow discount greater than subtotal
        discountAmount = Math.min(discountAmount, subtotal);
    }

    const total = subtotal - discountAmount;

    // Update display
    document.getElementById('sale-subtotal').textContent = `S/. ${subtotal.toFixed(2)}`;
    document.getElementById('sale-discount').textContent = `- S/. ${discountAmount.toFixed(2)}`;
    document.getElementById('sale-total').textContent = `S/. ${total.toFixed(2)}`;

    // Show/hide discount row
    const discountRow = document.querySelector('.discount-row');
    discountRow.style.display = applyDiscount && discountAmount > 0 ? 'flex' : 'none';
}

// Save sale transaction
function saveSaleTransaction() {
    const studentId = document.getElementById('sale-student-select').value;
    const date = document.getElementById('sale-date').value;
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const isDebt = document.getElementById('is-debt').checked;

    if (!studentId) {
        alert('Selecciona un alumno');
        return;
    }

    if (!date) {
        alert('Selecciona una fecha');
        return;
    }

    if (currentSaleItems.length === 0) {
        alert('Agrega al menos un ítem a la venta');
        return;
    }

    // Get student name
    const studentsData = JSON.parse(localStorage.getItem('studentsData')) || [];
    const student = studentsData.find(s => s.id == studentId);
    const studentName = `${student.primerNombre} ${student.primerApellido}`;

    // Calculate totals
    const subtotal = currentSaleItems.reduce((sum, item) => sum + item.amount, 0);
    const applyDiscount = document.getElementById('apply-discount').checked;

    let discount = {
        applied: false,
        type: '',
        value: 0,
        amount: 0
    };

    if (applyDiscount) {
        const discountType = document.getElementById('discount-type').value;
        const discountValue = parseFloat(document.getElementById('discount-value').value) || 0;

        let discountAmount = 0;
        if (discountType === 'percentage') {
            discountAmount = (subtotal * discountValue) / 100;
        } else {
            discountAmount = discountValue;
        }

        discount = {
            applied: true,
            type: discountType,
            value: discountValue,
            amount: Math.min(discountAmount, subtotal)
        };
    }

    const total = subtotal - discount.amount;

    // Create transaction object
    const transaction = {
        id: editingTransactionId || Date.now(),
        studentId: parseInt(studentId),
        studentName: studentName,
        date: date,
        paymentMethod: paymentMethod,
        items: [...currentSaleItems],
        subtotal: subtotal,
        discount: discount,
        total: total,
        isPaid: !isDebt
    };

    // Save to localStorage
    let transactions = JSON.parse(localStorage.getItem('salesTransactions')) || [];

    if (editingTransactionId) {
        const index = transactions.findIndex(t => t.id === editingTransactionId);
        transactions[index] = transaction;
    } else {
        transactions.push(transaction);
    }

    localStorage.setItem('salesTransactions', JSON.stringify(transactions));

    // Update student debt info in portfolio
    updateStudentDebtStatus(parseInt(studentId));

    alert(`Venta ${editingTransactionId ? 'actualizada' : 'registrada'} exitosamente`);

    clearSaleForm();
    editingTransactionId = null;
}

// Update student debt status in portfolio data
function updateStudentDebtStatus(studentId) {
    const transactions = JSON.parse(localStorage.getItem('salesTransactions')) || [];
    const studentTransactions = transactions.filter(t => t.studentId === studentId);

    const totalDebt = studentTransactions
        .filter(t => !t.isPaid)
        .reduce((sum, t) => sum + t.total, 0);

    const hasPaid = studentTransactions.some(t => t.isPaid);

    // This info will be used by portfolio.js
    const portfolioData = {
        studentId: studentId,
        hasDebt: totalDebt > 0,
        debtAmount: totalDebt,
        hasPaid: hasPaid
    };

    // Store portfolio summary
    let portfolioSummary = JSON.parse(localStorage.getItem('portfolioSummary')) || {};
    portfolioSummary[studentId] = portfolioData;
    localStorage.setItem('portfolioSummary', JSON.stringify(portfolioSummary));

    // CRITICAL FIX: Also update the student object in studentsData
    let studentsData = JSON.parse(localStorage.getItem('studentsData')) || [];
    const studentIndex = studentsData.findIndex(s => s.id === studentId);
    if (studentIndex !== -1) {
        studentsData[studentIndex].deudaPendiente = totalDebt;
        localStorage.setItem('studentsData', JSON.stringify(studentsData));
    }

    // Reload portfolio table to reflect changes
    if (typeof loadPortfolioTable === 'function') {
        loadPortfolioTable();
    }
}

// Clear sale form
function clearSaleForm() {
    document.getElementById('sale-student-select').value = '';
    document.getElementById('student-debt-indicator').style.display = 'none';
    setTodayDate();
    document.querySelector('input[name="payment-method"][value="Yape"]').checked = true;
    currentSaleItems = [];
    renderSaleItems();
    document.getElementById('item-type-select').value = '';
    document.getElementById('item-description').value = '';
    document.getElementById('item-description').style.display = 'none';
    document.getElementById('item-amount').value = '';
    document.getElementById('apply-discount').checked = false;
    document.getElementById('discount-controls').style.display = 'none';
    document.getElementById('discount-type').value = 'percentage';
    document.getElementById('discount-value').value = '';
    document.getElementById('is-debt').checked = false;
    calculateTotals();
}

// Initialize when section is shown
if (document.getElementById('ventas-section')) {
    initSales();
}
