// ========== STUDENT MANAGEMENT ==========

window.getAttendanceStats = function (studentId) {
    const key = `attendance_${studentId}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    const attended = data.filter(record =>
        record.status === 'present' ||
        record.status === 'present_simple' ||
        record.status === 'present_extra' ||
        record.status === 'recovery_only' ||
        record.status === 'Asistió' // Compatibility
    ).length;
    return { attended, total: data.length };
};

document.addEventListener('DOMContentLoaded', () => {
    initializeStudentData();
    loadStudentsTable();
    loadPortfolioTable();

    const studentForm = document.getElementById('student-form');
    studentForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveStudent();
    });

    const cancelStudentBtn = document.getElementById('cancel-student-btn');
    cancelStudentBtn?.addEventListener('click', () => {
        studentForm?.reset();
    });

    const studentSearch = document.getElementById('student-search');
    studentSearch?.addEventListener('input', (e) => {
        filterStudents(e.target.value);
    });

    const portfolioSearch = document.getElementById('portfolio-search');
    portfolioSearch?.addEventListener('input', (e) => {
        filterPortfolio(e.target.value);
    });

    const tipoPersonaSelect = document.getElementById('student-tipo-persona');
    tipoPersonaSelect?.addEventListener('change', (e) => {
        const rucInput = document.getElementById('student-ruc');
        const rucRequired = document.getElementById('ruc-required');
        if (rucInput && rucRequired) {
            if (e.target.value === 'Jurídica') {
                rucInput.required = true;
                rucRequired.innerHTML = '<span style="color: #ef4444;">*</span>';
            } else {
                rucInput.required = false;
                rucRequired.innerHTML = '<span class="optional-label">(opcional)</span>';
            }
        }
    });

    setupStudentFilters();
});

function initializeStudentData() {
    const existing = localStorage.getItem('studentsData');
    if (!existing) {
        localStorage.setItem('studentsData', JSON.stringify([]));
    }
}

let currentStudentFilter = 'all';

window.loadStudentsTable = function (filter = 'active') {
    const studentsData = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const tbody = document.getElementById('students-table-body');
    if (!tbody) return;

    let filtered = studentsData;
    if (filter === 'active') filtered = studentsData.filter(s => s.activo);
    else if (filter === 'inactive') filtered = studentsData.filter(s => !s.activo);

    updateStudentCounts(studentsData);

    tbody.innerHTML = filtered.map(student => {
        const initials = `${student.primerNombre[0]}${student.primerApellido[0]}`;
        const fullName = `${student.primerNombre} ${student.segundoNombre || ''} ${student.primerApellido} ${student.segundoApellido || ''}`.trim();

        return `
            <tr>
                <td>
                    <div class="student-name">
                        <div class="student-avatar">${initials}</div>
                        <div class="student-info">
                            <div class="name">${fullName}</div>
                            <div class="code-container">
                                <span class="code">${student.codigoAcceso}</span>
                                <button class="btn-copy-code" onclick="copyStudentCode(event, '${student.codigoAcceso}')" title="Copiar">
                                    <i class="ri-file-copy-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </td>
                <td>${student.apoderado}</td>
                <td>
                    <a href="https://wa.me/51${student.celular}" target="_blank" class="wa-link">
                        <i class="ri-whatsapp-line"></i> ${student.celular}
                    </a>
                </td>
                <td><span class="nivel-badge">${student.nivel}/6</span></td>
                <td><span class="frequency-badge">${student.clasesSemanales || 2}x sem</span></td>
                <td>
                    <span class="clases-compact">
                        ${(() => {
                const stats = getAttendanceStats(student.id);
                return `${stats.attended}/${stats.total}`;
            })()}
                    </span>
                </td>
                <td>
                    <label class="status-toggle">
                        <input type="checkbox" ${student.activo ? 'checked' : ''} onchange="toggleStudentStatus(${student.id})">
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="status-label ${student.activo ? 'active' : 'inactive'}">
                        ${student.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="btn-icon profile" onclick="openStudentProfile(${student.id})" title="Perfil">
                        <i class="ri-home-7-line"></i>
                    </button>
                    <button class="btn-icon edit" onclick="editStudent(${student.id})" title="Editar">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteStudent(${student.id})" title="Eliminar">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStudentCounts(data) {
    const all = document.getElementById('count-all');
    const act = document.getElementById('count-active');
    const inact = document.getElementById('count-inactive');
    if (all) all.textContent = data.length;
    if (act) act.textContent = data.filter(s => s.activo).length;
    if (inact) inact.textContent = data.filter(s => !s.activo).length;
}

function setupStudentFilters() {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadStudentsTable(btn.dataset.filter);
        });
    });
}

window.toggleStudentStatus = function (id) {
    const data = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const student = data.find(s => s.id === id);
    if (student) {
        student.activo = !student.activo;
        student.status = student.activo ? 'active' : 'inactive';
        localStorage.setItem('studentsData', JSON.stringify(data));
        loadStudentsTable(document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
        loadPortfolioTable();
    }
};

window.copyStudentCode = function (e, code) {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
        const btn = e.currentTarget;
        const icon = btn.querySelector('i');
        icon.className = 'ri-check-line';
        setTimeout(() => icon.className = 'ri-file-copy-line', 2000);
    });
};

window.openStudentProfile = function (id) {
    const data = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const student = data.find(s => s.id === id);
    if (student) {
        if (window.showSection) {
            window.showSection('perfil-alumno');
        } else {
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById('perfil-alumno-section')?.classList.add('active');
        }
        window.initStudentProfile?.(student);
    }
};

function saveStudent() {
    const id = document.getElementById('student-id').value;
    const data = JSON.parse(localStorage.getItem('studentsData') || '[]');

    const studentObj = {
        id: id ? parseInt(id) : Date.now(),
        primerNombre: document.getElementById('student-primer-nombre').value,
        segundoNombre: document.getElementById('student-segundo-nombre').value,
        primerApellido: document.getElementById('student-primer-apellido').value,
        segundoApellido: document.getElementById('student-segundo-apellido').value,
        sexo: document.getElementById('student-sexo').value,
        edad: parseInt(document.getElementById('student-edad').value) || 0,
        cumpleanos: document.getElementById('student-cumpleanos').value,
        codigoAcceso: document.getElementById('student-codigo').value,
        instrumento: document.getElementById('student-instrumento').value,
        nivel: document.getElementById('student-nivel').value,
        fechaRegistro: document.getElementById('student-fecha-registro').value,
        direccion: document.getElementById('student-direccion').value,
        referencia: document.getElementById('student-referencia').value,
        apoderado: document.getElementById('student-apoderado').value,
        tipoPersona: document.getElementById('student-tipo-persona').value,
        dni: document.getElementById('student-dni').value,
        ruc: document.getElementById('student-ruc').value,
        celular: document.getElementById('student-celular').value,
        activo: true,
        status: 'active',
        clasesRecibidas: 0,
        clasesSemanales: 2
    };

    if (id) {
        const index = data.findIndex(s => s.id === parseInt(id));
        if (index !== -1) data[index] = { ...data[index], ...studentObj };
    } else {
        data.push(studentObj);
    }

    localStorage.setItem('studentsData', JSON.stringify(data));
    alert('Alumno guardado exitosamente');
    document.getElementById('student-form').reset();
    loadStudentsTable();
    window.showSection?.('lista-alumnos');
}

window.editStudent = function (id) {
    const data = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const s = data.find(st => st.id === id);
    if (s) {
        window.showSection?.('registrar-alumno');
        document.getElementById('student-id').value = s.id;
        document.getElementById('student-primer-nombre').value = s.primerNombre;
        document.getElementById('student-segundo-nombre').value = s.segundoNombre || '';
        document.getElementById('student-primer-apellido').value = s.primerApellido;
        document.getElementById('student-segundo-apellido').value = s.segundoApellido || '';
        document.getElementById('student-sexo').value = s.sexo;
        document.getElementById('student-edad').value = s.edad;
        document.getElementById('student-cumpleanos').value = s.cumpleanos || '';
        document.getElementById('student-codigo').value = s.codigoAcceso;
        document.getElementById('student-instrumento').value = s.instrumento;
        document.getElementById('student-nivel').value = s.nivel;
        document.getElementById('student-fecha-registro').value = s.fechaRegistro;
        document.getElementById('student-direccion').value = s.direccion;
        document.getElementById('student-referencia').value = s.referencia || '';
        document.getElementById('student-apoderado').value = s.apoderado;
        document.getElementById('student-tipo-persona').value = s.tipoPersona;
        document.getElementById('student-dni').value = s.dni || '';
        document.getElementById('student-ruc').value = s.ruc || '';
        document.getElementById('student-celular').value = s.celular;
    }
};

window.deleteStudent = function (id) {
    if (confirm('¿Estás seguro de eliminar este alumno?')) {
        const data = JSON.parse(localStorage.getItem('studentsData') || '[]');
        const filtered = data.filter(s => s.id !== id);
        localStorage.setItem('studentsData', JSON.stringify(filtered));
        loadStudentsTable();
        loadPortfolioTable();
    }
};

function filterStudents(query) {
    const q = query.toLowerCase();
    const data = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const filtered = data.filter(s => {
        const name = `${s.primerNombre} ${s.primerApellido}`.toLowerCase();
        return name.includes(q) || s.codigoAcceso.toLowerCase().includes(q);
    });
    // For simplicity, just reload table with filtered data in a quick way
    // or better, modify loadStudentsTable to accept data
    renderSpecificStudents(filtered);
}

function renderSpecificStudents(data) {
    const tbody = document.getElementById('students-table-body');
    if (!tbody) return;
    tbody.innerHTML = data.map(student => {
        const initials = `${student.primerNombre[0]}${student.primerApellido[0]}`;
        const fullName = `${student.primerNombre} ${student.segundoNombre || ''} ${student.primerApellido} ${student.segundoApellido || ''}`.trim();
        return `
            <tr>
                <td>
                    <div class="student-name">
                        <div class="student-avatar">${initials}</div>
                        <div class="student-info">
                            <div class="name">${fullName}</div>
                            <div class="code-container">
                                <span class="code">${student.codigoAcceso}</span>
                                <button class="btn-copy-code" onclick="copyStudentCode(event, '${student.codigoAcceso}')">
                                    <i class="ri-file-copy-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </td>
                <td>${student.apoderado}</td>
                <td><a href="https://wa.me/51${student.celular}" target="_blank" class="wa-link"><i class="ri-whatsapp-line"></i> ${student.celular}</a></td>
                <td><span class="nivel-badge">${student.nivel}/6</span></td>
                <td><span class="frequency-badge">${student.clasesSemanales || 2}x sem</span></td>
                <td>
                    <span class="clases-compact">
                        ${(() => {
                const stats = getAttendanceStats(student.id);
                return `${stats.attended}/${stats.total}`;
            })()}
                    </span>
                </td>
                <td>
                    <label class="status-toggle">
                        <input type="checkbox" ${student.activo ? 'checked' : ''} onchange="toggleStudentStatus(${student.id})">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td class="action-buttons">
                    <button class="btn-icon profile" onclick="openStudentProfile(${student.id})"><i class="ri-home-7-line"></i></button>
                    <button class="btn-icon edit" onclick="editStudent(${student.id})"><i class="ri-edit-line"></i></button>
                    <button class="btn-icon delete" onclick="deleteStudent(${student.id})"><i class="ri-delete-bin-line"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

window.loadPortfolioTable = function () {
    const tbody = document.getElementById('portfolio-table-body');
    if (!tbody) return;

    if (window.recalculateAllStudentDebts) {
        window.recalculateAllStudentDebts();
    }

    // Get fresh data after recalculation
    const data = JSON.parse(localStorage.getItem('studentsData') || '[]');

    tbody.innerHTML = data.map(s => {
        const fullName = `${s.primerNombre} ${s.primerApellido}`;
        const totalDebt = s.deudaPendiente || 0;

        return `
            <tr>
                <td>
                    <div class="student-name">
                        <div class="student-avatar">${s.primerNombre[0]}${s.primerApellido[0]}</div>
                        <div class="student-info">
                            <div class="name">${fullName}</div>
                            <span class="code">${s.codigoAcceso}</span>
                        </div>
                    </div>
                </td>
                <td>${s.apoderado}</td>
                <td>${s.celular}</td>
                <td>${s.fechaRegistro}</td>
                <td class="debt-amount">S/. ${totalDebt.toFixed(2)}</td>
                <td><span class="status-badge ${totalDebt > 0 ? 'debt' : 'paid'}">${totalDebt > 0 ? 'Con Deuda' : 'Al día'}</span></td>
                <td><span class="status-label ${s.activo ? 'active' : 'inactive'}">${s.activo ? 'Activo' : 'Inactivo'}</span></td>
            </tr>
        `;
    }).join('');
};

function filterPortfolio(query) {
    const q = query.toLowerCase();
    const data = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const filtered = data.filter(s => {
        const name = `${s.primerNombre} ${s.primerApellido}`.toLowerCase();
        return name.includes(q) || s.codigoAcceso.toLowerCase().includes(q);
    });
    // Simplified specific render for portfolio search
    const tbody = document.getElementById('portfolio-table-body');
    if (!tbody) return;
    tbody.innerHTML = filtered.map(s => {
        const fullName = `${s.primerNombre} ${s.primerApellido}`;
        const totalDebt = s.deudaPendiente || 0;
        return `
            <tr>
                <td>${fullName}</td>
                <td>${s.apoderado}</td>
                <td>${s.celular}</td>
                <td>${s.fechaRegistro}</td>
                <td class="debt-amount">S/. ${totalDebt.toFixed(2)}</td>
                <td>${totalDebt > 0 ? 'Con Deuda' : 'Al día'}</td>
                <td>${s.activo ? 'Activo' : 'Inactivo'}</td>
            </tr>
        `;
    }).join('');
}
