document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    if (!sessionStorage.getItem('adminSession')) {
        window.location.href = 'index.html';
        return;
    }

    // Get current staff data
    const currentStaffCode = sessionStorage.getItem('currentStaffCode');
    const currentStaff = getCurrentStaff(currentStaffCode);

    // Update UI with current staff info
    updateUserInfo(currentStaff);
    displayPersonalInfo(currentStaff);

    // Sidebar toggle for mobile
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebar-close');

    hamburger.addEventListener('click', () => {
        sidebar.classList.add('active');
    });

    sidebarClose.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });

    // Navigation Function
    window.showSection = function (sectionName) {
        const sections = document.querySelectorAll('.content-section');
        const navItems = document.querySelectorAll('.nav-item');
        const pageTitle = document.getElementById('page-title');

        // Update active nav item
        navItems.forEach(nav => {
            nav.classList.remove('active');
            if (nav.dataset.section === sectionName) {
                nav.classList.add('active');
            }
        });

        // Show corresponding section
        sections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');

            // Refresh data if needed
            if (sectionName === 'lista-alumnos') {
                window.loadStudentsTable?.();
            } else if (sectionName === 'cartera') {
                window.loadPortfolioTable?.();
            }

            // Update page title
            const navItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
            if (navItem) {
                pageTitle.textContent = navItem.querySelector('span').textContent;
            } else if (sectionName === 'perfil-alumno') {
                pageTitle.textContent = 'Perfil del Alumno';
            }
        }

        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth <= 1024 && sidebar) {
            sidebar.classList.remove('active');
        }
    };

    // Navigation Event Listeners
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionName = item.dataset.section;
            window.showSection(sectionName);
        });
    });

    // Notification Button -> Open Buzón
    const notificationBtn = document.getElementById('notification-btn');
    notificationBtn?.addEventListener('click', () => {
        const buzonNavItem = document.querySelector('.nav-item[data-section="buzon"]');
        if (buzonNavItem) {
            buzonNavItem.click();
        }
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            sessionStorage.clear();
            window.location.href = 'index.html';
        }
    });

    // Staff Management
    loadStaffTable();

    const addStaffBtn = document.getElementById('add-staff-btn');
    const staffModal = document.getElementById('staff-modal');
    const staffModalClose = document.getElementById('staff-modal-close');
    const staffForm = document.getElementById('staff-form');
    const cancelStaffBtn = document.getElementById('cancel-staff-btn');

    addStaffBtn.addEventListener('click', () => {
        openStaffModal();
    });

    staffModalClose.addEventListener('click', () => {
        closeStaffModal();
    });

    cancelStaffBtn.addEventListener('click', () => {
        closeStaffModal();
    });

    staffModal.addEventListener('click', (e) => {
        if (e.target === staffModal) {
            closeStaffModal();
        }
    });

    staffForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveStaff();
    });

    // Backup & Restore
    const backupSaveBtn = document.getElementById('backup-save-btn');
    const backupRestoreBtn = document.getElementById('backup-restore-btn');
    const backupFileInput = document.getElementById('backup-file-input');

    backupSaveBtn.addEventListener('click', () => {
        saveBackup();
    });

    backupRestoreBtn.addEventListener('click', () => {
        backupFileInput.click();
    });

    backupFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            restoreBackup(file);
        }
    });
});

// Get current staff by access code
function getCurrentStaff(code) {
    const staffData = JSON.parse(localStorage.getItem('staffData') || '[]');
    return staffData.find(staff => staff.codigoAcceso === code);
}

// Update user info in sidebar
function updateUserInfo(staff) {
    if (staff) {
        document.getElementById('staff-name').textContent =
            `${staff.primerNombre} ${staff.primerApellido}`;
        document.getElementById('staff-role').textContent = staff.cargo;
        document.getElementById('welcome-name').textContent =
            `${staff.primerNombre} ${staff.primerApellido}`;
    }
}

// Display personal information
function displayPersonalInfo(staff) {
    if (!staff) return;

    const personalInfoDiv = document.getElementById('personal-info');

    // Calculate age from birthday
    const birthday = new Date(staff.cumpleanos.split('/').reverse().join('-'));
    const today = new Date();
    const age = Math.floor((today - birthday) / (365.25 * 24 * 60 * 60 * 1000));

    personalInfoDiv.innerHTML = `
        <div class="info-item">
            <span class="info-label">Primer Nombre</span>
            <span class="info-value">${staff.primerNombre}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Segundo Nombre</span>
            <span class="info-value">${staff.segundoNombre || 'N/A'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Primer Apellido</span>
            <span class="info-value">${staff.primerApellido}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Segundo Apellido</span>
            <span class="info-value">${staff.segundoApellido || 'N/A'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Sexo</span>
            <span class="info-value">${staff.sexo}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Edad</span>
            <span class="info-value">${age} años</span>
        </div>
        <div class="info-item">
            <span class="info-label">Cumpleaños</span>
            <span class="info-value">${staff.cumpleanos}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Área</span>
            <span class="info-value">${staff.area}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Cargo</span>
            <span class="info-value">${staff.cargo}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Código de Acceso</span>
            <span class="info-value">${staff.codigoAcceso}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Nivel de Acceso</span>
            <span class="info-value">${staff.nivelAcceso}</span>
        </div>
    `;
}

// Load staff table
function loadStaffTable() {
    const staffData = JSON.parse(localStorage.getItem('staffData') || '[]');
    const tbody = document.getElementById('staff-table-body');

    tbody.innerHTML = staffData.map(staff => `
        <tr>
            <td>${staff.primerNombre} ${staff.segundoNombre || ''} ${staff.primerApellido} ${staff.segundoApellido || ''}</td>
            <td>${staff.cargo}</td>
            <td>${staff.codigoAcceso}</td>
            <td>${staff.nivelAcceso}</td>
            <td class="action-buttons">
                <button class="btn-icon edit" onclick="editStaff(${staff.id})" title="Editar">
                    <i class="ri-edit-line"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteStaff(${staff.id})" title="Eliminar">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Open staff modal
function openStaffModal(staffId = null) {
    const modal = document.getElementById('staff-modal');
    const form = document.getElementById('staff-form');
    const title = document.getElementById('staff-modal-title');

    form.reset();

    if (staffId) {
        // Edit mode
        title.textContent = 'Editar Personal';
        const staffData = JSON.parse(localStorage.getItem('staffData') || '[]');
        const staff = staffData.find(s => s.id === staffId);

        if (staff) {
            document.getElementById('staff-id').value = staff.id;
            document.getElementById('primer-nombre').value = staff.primerNombre;
            document.getElementById('segundo-nombre').value = staff.segundoNombre || '';
            document.getElementById('primer-apellido').value = staff.primerApellido;
            document.getElementById('segundo-apellido').value = staff.segundoApellido || '';
            document.getElementById('sexo').value = staff.sexo;

            // Convert DD/MM/YYYY to YYYY-MM-DD for date input
            const [day, month, year] = staff.cumpleanos.split('/');
            document.getElementById('cumpleanos').value = `${year}-${month}-${day}`;

            document.getElementById('area').value = staff.area;
            document.getElementById('cargo').value = staff.cargo;
            document.getElementById('codigo-acceso').value = staff.codigoAcceso;
            document.getElementById('nivel-acceso').value = staff.nivelAcceso;
        }
    } else {
        // Add mode
        title.textContent = 'Agregar Personal';
        document.getElementById('staff-id').value = '';
    }

    modal.classList.add('active');
}

// Close staff modal
function closeStaffModal() {
    const modal = document.getElementById('staff-modal');
    modal.classList.remove('active');
}

// Save staff
function saveStaff() {
    const staffId = document.getElementById('staff-id').value;
    const staffData = JSON.parse(localStorage.getItem('staffData') || '[]');

    // Convert date from YYYY-MM-DD to DD/MM/YYYY
    const dateValue = document.getElementById('cumpleanos').value;
    const [year, month, day] = dateValue.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    // Calculate age
    const birthday = new Date(dateValue);
    const today = new Date();
    const age = Math.floor((today - birthday) / (365.25 * 24 * 60 * 60 * 1000));

    const staffInfo = {
        id: staffId ? parseInt(staffId) : Date.now(),
        primerNombre: document.getElementById('primer-nombre').value.trim(),
        segundoNombre: document.getElementById('segundo-nombre').value.trim(),
        primerApellido: document.getElementById('primer-apellido').value.trim(),
        segundoApellido: document.getElementById('segundo-apellido').value.trim(),
        sexo: document.getElementById('sexo').value,
        edad: age,
        cumpleanos: formattedDate,
        area: document.getElementById('area').value.trim(),
        cargo: document.getElementById('cargo').value.trim(),
        codigoAcceso: document.getElementById('codigo-acceso').value.trim(),
        nivelAcceso: document.getElementById('nivel-acceso').value
    };

    if (staffId) {
        // Update existing
        const index = staffData.findIndex(s => s.id === parseInt(staffId));
        if (index !== -1) {
            staffData[index] = staffInfo;
        }
    } else {
        // Add new
        staffData.push(staffInfo);
    }

    localStorage.setItem('staffData', JSON.stringify(staffData));
    loadStaffTable();
    closeStaffModal();

    // Update current user info if editing themselves
    const currentStaffCode = sessionStorage.getItem('currentStaffCode');
    if (staffInfo.codigoAcceso === currentStaffCode) {
        updateUserInfo(staffInfo);
        displayPersonalInfo(staffInfo);
    }
}

// Edit staff (global function)
window.editStaff = function (id) {
    openStaffModal(id);
};

// Delete staff (global function)
window.deleteStaff = function (id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este personal?')) {
        return;
    }

    const staffData = JSON.parse(localStorage.getItem('staffData') || '[]');
    const filteredData = staffData.filter(s => s.id !== id);

    localStorage.setItem('staffData', JSON.stringify(filteredData));
    loadStaffTable();
};

// Save backup
function saveBackup() {
    // Collect EVERYTHING from localStorage
    const allStore = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        allStore[key] = localStorage.getItem(key);
    }

    const backupData = {
        version: '3.0 (Total)',
        timestamp: new Date().toISOString(),
        data: allStore
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `casa-pianista-TOTAL-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('✅ ¡COPIA TOTAL COMPLETADA!\n\nSe han respaldado absolutamente todos los datos: Alumnos, Asistencias, Calificaciones, Sílabos, Mensajes y Finanzas.');
}

// Restore backup
function restoreBackup(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const backup = JSON.parse(e.target.result);

            if (!backup.version || !backup.data) {
                throw new Error('Formato de backup inválido');
            }

            if (!confirm('⚠️ ADVERTENCIA CRÍTICA\n\nEsto reemplazará TODOS los datos actuales con los del archivo. ¿Deseas continuar?')) {
                return;
            }

            // Perform restoration
            if (backup.version && backup.version.includes('Total')) {
                // UNIVERSAL RESTORE (Version 3.0+)
                localStorage.clear();
                Object.entries(backup.data).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
            } else {
                // LEGACY RESTORE (Version 2.x and below)
                // Restore basic core data
                const keysToRestore = ['staffData', 'studentsData', 'scheduleData', 'salesTransactions', 'portfolioSummary', 'inboxMessages'];
                keysToRestore.forEach(key => {
                    if (backup.data[key]) {
                        localStorage.setItem(key, JSON.stringify(backup.data[key]));
                    }
                });

                // Restore Master Syllabus Data
                if (backup.data.syllabusMaster) {
                    Object.keys(backup.data.syllabusMaster).forEach(key => {
                        localStorage.setItem(key, JSON.stringify(backup.data.syllabusMaster[key]));
                    });
                }

                // Restore Progress Syllabus Data
                if (backup.data.syllabusProgress) {
                    Object.keys(backup.data.syllabusProgress).forEach(key => {
                        localStorage.setItem(key, JSON.stringify(backup.data.syllabusProgress[key]));
                    });
                }
            }

            alert('✅ Restauración COMPLETA exitosa. El sistema se reiniciará con los nuevos datos.');
            location.reload();
        } catch (error) {
            alert('❌ Error al restaurar el backup: ' + error.message);
        }
    };

    reader.readAsText(file);
}

// Lottie Preloader Hiding Logic
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('fade-out');
        }, 800); // 800ms delay for a better visual experience
    }
});
