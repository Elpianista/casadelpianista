// ========== STUDENT PROFILE LOGIC ==========

/**
 * Agrega todas las métricas del alumno para el dashboard de resumen
 * @param {string} studentId - ID del alumno
 * @param {Array} moduleIds - Lista de módulos a incluir (ej: [1, 2, 3])
 */
window.getComprehensiveStudentStats = function (studentId, moduleIds = [1, 2, 3, 4, 5, 6]) {
    const studentsData = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return null;

    let totalGradeSum = 0;
    let totalGradeCount = 0;

    let examGradeSum = 0;
    let examGradeCount = 0;

    let taskGradeSum = 0;
    let taskGradeCount = 0;

    let totalTasksCompleted = 0;
    let totalTasksCount = 0;
    let totalTopicsCompleted = 0;
    let totalTopicsCount = 0;

    let learnedSongs = [];
    let externalSongsList = [];

    const instrument = student.instrumento || 'Piano';

    moduleIds.forEach(modId => {
        // --- 1. Progress Sync (Topics & Tasks & Songs) ---
        const progressKey = `student_progress_syllabus_${studentId}_mod_${modId}`;
        const progress = JSON.parse(localStorage.getItem(progressKey) || '{"mastery":[], "songMastery":[], "externalSongs":[]}');

        const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[], "songs":[]}');

        const topics = masterData.topics || [];
        totalTopicsCount += topics.length;
        totalTopicsCompleted += (progress.mastery || []).length;

        topics.forEach((t, idx) => {
            if (t.isTask) {
                totalTasksCount++;
                if ((progress.mastery || []).includes(idx)) {
                    totalTasksCompleted++;
                }
            }
        });

        // Learned Songs
        (progress.songMastery || []).forEach(sIdx => {
            const song = masterData.songs[sIdx];
            if (song && !learnedSongs.find(ls => ls.title === song.title)) {
                learnedSongs.push({ title: song.title, mod: modId, type: 'Sílabo' });
            }
        });

        // External Songs
        (progress.externalSongs || []).forEach(es => {
            if (!externalSongsList.find(ex => ex.title === es.title)) {
                externalSongsList.push(es);
            }
        });

        // --- 2. Grades Sync (New Logic: Reading from student_grades_syllabus keys) ---
        const gradesKey = `student_grades_syllabus_${studentId}_mod_${modId}`;
        const gradesRaw = localStorage.getItem(gradesKey);

        if (gradesRaw) {
            let gradesArray = [];
            try {
                const parsed = JSON.parse(gradesRaw);
                gradesArray = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) { console.error("Error parsing grades", e); }

            gradesArray.forEach(g => {
                // FILTER: If it's a subtask evaluation AND the parent topic is an Exam, SKIP IT
                // This prevents partial theoretical grades from affecting the average before full completion
                if (g.isSubtaskEval && g._subtaskRef) {
                    const tIdx = parseInt(g._subtaskRef.topicIdx);
                    // masterData is already available in this scope
                    const topic = (masterData.topics || [])[tIdx];
                    if (topic && topic.isExam) {
                        return; // Skip this grade
                    }
                }

                // Calculate Final Score for this evaluation
                const theoryScore = parseFloat(g.theoreticalGrade || 0);
                let totalP = 0; let pCount = 0;

                Object.keys(g.rubric || {}).forEach(c => {
                    (g.rubric[c] || []).forEach(i => {
                        if (i.applied) {
                            totalP += parseFloat(i.score || 0);
                            pCount++;
                        }
                    });
                });

                const pAvg = pCount > 0 ? (totalP / pCount) : 0;
                // Final Grade Logic: (Theory + Practice) / 2 if theory exists, else just Practice
                const finalScore = (g.theoreticalGrade !== "" && !isNaN(theoryScore)) ? (pAvg + theoryScore) / 2 : pAvg;

                // Add to Global Accumulator
                totalGradeSum += finalScore;
                totalGradeCount++;

                // Add to Sub-Metrics
                if (g.isSubtaskEval) { // It's a Task (Tareo/Subtarea)
                    taskGradeSum += finalScore;
                    taskGradeCount++;
                } else { // It's a standard Exam
                    examGradeSum += finalScore;
                    examGradeCount++;
                }
            });
        }
    });

    // Calculate Averages
    // Main Average is now CUMULATIVE of all items (tasks + exams mixed)
    const totalAverage = totalGradeCount > 0 ? (totalGradeSum / totalGradeCount) : 0;

    // Sub-averages for display
    const taskAverage = taskGradeCount > 0 ? (taskGradeSum / taskGradeCount) : 0;
    const examAverage = examGradeCount > 0 ? (examGradeSum / examGradeCount) : 0;

    // Attendance (Total historical)
    const attStats = getAttendanceStats(studentId);
    const keyHistory = `attendance_history_${studentId}`;
    const hAtt = JSON.parse(localStorage.getItem(keyHistory) || '[]');
    const hAttended = hAtt.reduce((acc, c) => acc + (c.stats.attended || 0), 0);

    // Finance (Total historical)
    const transactions = JSON.parse(localStorage.getItem('salesTransactions') || '[]');
    const sTrans = transactions.filter(t => t.studentId === studentId);
    const totalPaid = sTrans.filter(t => t.isPaid).reduce((sum, t) => sum + t.total, 0);
    const pendingDebt = sTrans.filter(t => !t.isPaid).reduce((sum, t) => sum + t.total, 0);

    return {
        totalAverage,
        totalGradeCount, // Export this to know if 0
        taskAverage,
        examAverage,
        totalTasksCompleted,
        totalTasksCount,
        totalTopicsCompleted,
        totalTopicsCount,
        totalAttended: attStats.attended + hAttended,
        totalPaid,
        pendingDebt,
        learnedSongs,
        externalSongsList,
        studentInfo: student,
        currentView: moduleIds.length === 1 ? `Módulo ${moduleIds[0]}` : (moduleIds.length === 6 ? 'Total Académico' : 'Personalizado')
    };
};

window.renderComprehensiveSummary = function (studentId, moduleIds = [1, 2, 3, 4, 5, 6]) {
    const stats = getComprehensiveStudentStats(studentId, moduleIds);
    if (!stats) return;

    // Determine if we have grades
    const hasGrades = stats.totalGradeCount > 0;

    // Default Values for "No Grades"
    let letter = '-';
    let performance = 'Aún sin calificaciones';
    let colorClass = 'grade-null'; // New class for gray state
    let perc = 0;
    let mainScoreDisplay = '0.00';

    if (hasGrades) {
        const perfInfo = getPerformanceInfo(stats.totalAverage);
        letter = perfInfo.letter;
        performance = perfInfo.performance;
        colorClass = perfInfo.colorClass;
        perc = (stats.totalAverage / 20 * 100).toFixed(0);
        mainScoreDisplay = stats.totalAverage.toFixed(2);
    }

    const topicPerc = stats.totalTopicsCount > 0 ? (stats.totalTopicsCompleted / stats.totalTopicsCount * 100).toFixed(0) : 0;
    const taskPerc = stats.totalTasksCount > 0 ? (stats.totalTasksCompleted / stats.totalTasksCount * 100).toFixed(0) : 0;

    const container = document.getElementById('tab-resumen');
    container.innerHTML = `
        <div class="summary-dashboard">
            <!-- View Selectors -->
            <div class="summary-view-selectors">
                <button class="btn-view-opt ${moduleIds.length === 6 ? 'active' : ''}" onclick="renderComprehensiveSummary('${studentId}', [1,2,3,4,5,6])">
                    <i class="ri-dashboard-line"></i> Resumen Total
                </button>
                <button class="btn-view-opt ${(moduleIds.length === 1 && moduleIds[0] == stats.studentInfo.nivel) ? 'active' : ''}" onclick="renderComprehensiveSummary('${studentId}', [${stats.studentInfo.nivel}])">
                    <i class="ri-bookmark-line"></i> Módulo Actual (${stats.studentInfo.nivel})
                </button>
                <button class="btn-view-opt" onclick="openCustomModulePicker('${studentId}')">
                    <i class="ri-filter-3-line"></i> Promedio Personalizado
                </button>
            </div>

            <!-- Main Grade Card -->
            <div class="summary-card main-grade-card ${colorClass} ${!hasGrades ? 'no-grades' : ''}">
                <div class="grade-header">
                    <h4>Rendimiento Académico: <b>${stats.currentView}</b></h4>
                    <span class="performance-tag">${performance}</span>
                </div>
                <div class="grade-body">
                    <div class="grade-medal-container">
                        ${hasGrades ? `
                        <div class="banner-medal" style="--perc: ${perc}%;">
                            <span class="medal-letter">${letter}</span>
                            <span class="medal-perc">${perc}%</span>
                        </div>
                        ` : `
                        <div class="placeholder-medal">
                            <i class="ri-medal-line" style="font-size: 2.5rem; color: #d1d5db;"></i>
                        </div>
                        `}
                    </div>
                    <div class="grade-info">
                        <div class="average-val">${hasGrades ? mainScoreDisplay : '--'}<span class="base">/20</span></div>
                        <div class="sub-averages-grid">
                            <div class="sub-avg-item">
                                <span class="sub-label">Promedio Tareas</span>
                                <span class="sub-val">${stats.taskAverage.toFixed(2)}</span>
                            </div>
                            <div class="sub-avg-item">
                                <span class="sub-label">Promedio Exámenes</span>
                                <span class="sub-val">${stats.examAverage.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grade-footer">
                    <div class="stat-mini">
                        <span class="label">Nivel del Alumno</span>
                        <span class="val">${stats.studentInfo.nivel}/6</span>
                    </div>
                    <div class="stat-mini">
                        <span class="label">Instrumento</span>
                        <span class="val">${stats.studentInfo.instrumento}</span>
                    </div>
                </div>
            </div>

            <!-- Global Stats Grid -->
            <div class="summary-stats-grid">
                <div class="stat-card">
                    <div class="stat-icon topic"><i class="ri-book-open-line"></i></div>
                    <div class="stat-content">
                        <span class="label">Temas Aprendidos</span>
                        <div class="stat-row">
                            <span class="val">${stats.totalTopicsCompleted}/${stats.totalTopicsCount}</span>
                            <span class="perc">${topicPerc}%</span>
                        </div>
                        <div class="progress-bar-mini"><div class="fill" style="width: ${topicPerc}%"></div></div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon task"><i class="ri-list-check"></i></div>
                    <div class="stat-content">
                        <span class="label">Tareas Realizadas</span>
                        <div class="stat-row">
                            <span class="val">${stats.totalTasksCompleted}/${stats.totalTasksCount}</span>
                            <span class="perc">${taskPerc}%</span>
                        </div>
                        <div class="progress-bar-mini"><div class="fill" style="width: ${taskPerc}%"></div></div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon attendance"><i class="ri-calendar-check-line"></i></div>
                    <div class="stat-content">
                        <span class="label">Total Asistencias</span>
                        <div class="stat-row"><span class="val">${stats.totalAttended} Clases</span></div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon finance"><i class="ri-money-dollar-circle-line"></i></div>
                    <div class="stat-content">
                        <span class="label">Estado Financiero</span>
                        <div class="finance-row">
                            <div class="fin-item"><span class="fin-label">Abonado</span><span class="fin-val paid">S/. ${stats.totalPaid.toFixed(2)}</span></div>
                            <div class="fin-item"><span class="fin-label">Deuda</span><span class="fin-val debt">S/. ${stats.pendingDebt.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Repertoire Sections -->
            <div class="repertoire-dashboard">
                <div class="summary-info-section">
                    <div class="info-header"><h3><i class="ri-music-2-line"></i> Canciones Aprendidas del Sílabo</h3></div>
                    <div class="repertoire-list">
                        ${stats.learnedSongs.length > 0 ? stats.learnedSongs.map(s => `
                            <div class="rep-pill">
                                <span class="rep-mod-tag">M${s.mod}</span>
                                <span class="rep-title">${s.title}</span>
                            </div>
                        `).join('') : '<p class="empty-note">Sin canciones registradas en este rango.</p>'}
                    </div>
                </div>

                <div class="summary-info-section mt-2">
                    <div class="info-header"><h3><i class="ri-flask-line"></i> Canciones Externas</h3></div>
                    <div class="repertoire-list">
                        ${stats.externalSongsList.length > 0 ? stats.externalSongsList.map(s => `
                            <div class="rep-pill external">
                                <span class="rep-title">${s.title}</span>
                                ${s.genre ? ` <span class="rep-genre">(${s.genre})</span>` : ''}
                            </div>
                        `).join('') : '<p class="empty-note">Sin canciones externas registradas.</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
};

/**
 * Abre un modal simple para seleccionar módulos personalizados
 */
window.openCustomModulePicker = function (studentId) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-picker-overlay';
    overlay.innerHTML = `
        <div class="picker-modal">
            <h4>Seleccionar Módulos para el Promedio</h4>
            <div class="picker-grid">
                ${[1, 2, 3, 4, 5, 6].map(m => `
                    <label class="picker-item">
                        <input type="checkbox" value="${m}" checked>
                        <span>Módulo ${m}</span>
                    </label>
                `).join('')}
            </div>
            <div class="picker-actions">
                <button class="btn-secondary" onclick="this.closest('.custom-picker-overlay').remove()">Cancelar</button>
                <button class="btn-primary" onclick="applyCustomPicker('${studentId}')">Aplicar Selección</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.applyCustomPicker = function (studentId) {
    const checked = Array.from(document.querySelectorAll('.picker-item input:checked')).map(i => parseInt(i.value));
    if (checked.length === 0) return alert('Selecciona al menos un módulo');

    renderComprehensiveSummary(studentId, checked);
    document.querySelector('.custom-picker-overlay').remove();
};

// getAttendanceStats is now global in students.js

let currentStudentId = null;
let currentAttendanceData = [];
let pendingAttendanceIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    setupProfileTabs();
});

window.switchProfileTab = function (tabName) {
    const tabBtns = document.querySelectorAll('.profile-tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) btn.classList.add('active');
    });

    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
            if (tabName === 'asistencia') {
                loadAttendanceTable();
                loadAttendanceHistory();
            } else if (tabName === 'pagos') {
                loadStudentPayments();
            } else if (tabName === 'asignacion') {
                renderAssignmentsTab();
            } else if (tabName === 'silabos') {
                loadSyllabus();
            } else if (tabName === 'calificacion') {
                renderGradesTab();
            }
        }
    });
};

function setupProfileTabs() {
    const tabBtns = document.querySelectorAll('.profile-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchProfileTab(btn.dataset.tab);
        });
    });
}

window.initStudentProfile = function (student) {
    if (!student) return;
    currentStudentId = student.id;

    // --- Header Info ---
    const initials = `${student.primerNombre[0]}${student.primerApellido[0]}`;
    const names = `${student.primerNombre} ${student.segundoNombre || ''}`.trim();
    const surnames = `${student.primerApellido} ${student.segundoApellido || ''}`.trim();
    const fullName = `${names} ${surnames}`;

    document.getElementById('prof-avatar').textContent = initials;
    document.getElementById('prof-name').innerHTML = `${names}<br>${surnames}`;
    document.getElementById('prof-code').textContent = student.codigoAcceso;

    // --- Stats ---
    const stats = getAttendanceStats(student.id);
    const keyHistory = `attendance_history_${student.id}`;
    const history = JSON.parse(localStorage.getItem(keyHistory) || '[]');
    const historyAttended = history.reduce((acc, c) => acc + (c.stats.attended || 0), 0);

    document.getElementById('prof-clases-total').textContent = stats.attended + historyAttended;
    document.getElementById('prof-clases-ciclo').textContent = `${stats.attended}/${stats.total}`;
    document.getElementById('prof-nota').textContent = student.calificacion ? `${student.calificacion}/20` : '--/20';

    // --- Info Tab Info ---
    document.getElementById('det-full-name').textContent = fullName;
    document.getElementById('det-code').textContent = student.codigoAcceso;
    document.getElementById('det-edad').textContent = `${student.edad} años`;
    document.getElementById('det-sexo').textContent = student.sexo;
    document.getElementById('det-cumpleanos').textContent = student.cumpleanos || 'No registrado';

    document.getElementById('det-apoderado').textContent = student.apoderado;
    document.getElementById('det-celular').textContent = student.celular;
    document.getElementById('det-direccion').textContent = student.direccion;
    document.getElementById('det-referencia').textContent = student.referencia || '-';

    document.getElementById('det-instrumento').textContent = student.instrumento;
    document.getElementById('det-nivel').textContent = `Nivel ${student.nivel}/6`;
    document.getElementById('det-registro').textContent = student.fechaRegistro;
    document.getElementById('det-frecuencia').textContent = `${student.clasesSemanales || 2}x por semana`;

    // Reset tabs to Resumen
    document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="resumen"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-resumen').classList.add('active');

    // Load Attendance Data for this student
    loadAttendanceData();
    loadAttendanceHistory();

    // Render Comprehensive Summary
    renderComprehensiveSummary(student.id);
};

// ========== ATTENDANCE SYSTEM LOGIC ==========

function loadAttendanceData() {
    const key = `attendance_${currentStudentId}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    currentAttendanceData = data;

    const saveBtn = document.getElementById('btn-save-attendance-cycle');
    if (saveBtn) {
        saveBtn.style.display = data.length > 0 ? 'inline-flex' : 'none';
    }
}

function loadAttendanceTable() {
    const tbody = document.getElementById('attendance-table-body');
    if (!tbody) return;

    if (currentAttendanceData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #999;">No hay cronograma generado. Usa el formulario arriba.</td></tr>`;
        updateDebtMinutes(0);
        return;
    }

    let debtMinutes = 0;

    tbody.innerHTML = currentAttendanceData.map((record, index) => {
        let statusClass = record.status || 'pending';
        let statusText = 'Pendiente';
        if (record.status === 'present' || record.status === 'present_simple' || record.status === 'present_extra') { statusText = 'Asistió'; }
        else if (record.status === 'missing') { statusText = 'Faltó'; debtMinutes += (record.duration || 60); }
        else if (record.status === 'recovery_only') { statusText = 'Recuperación'; }

        // Subtract recovery minutes from debt if present
        if (record.recoveryMinutes) {
            debtMinutes -= record.recoveryMinutes;
        }
        if (record.status === 'recovery_only') {
            debtMinutes -= (record.duration || 60);
        }

        let recoveryLabel = '';
        if (record.recoveryMinutes) {
            const dateStr = record.recoveryDate ?
                `el ${record.recoveryDate.split('-').reverse().slice(0, 2).join('/')} a las ${record.recoveryTime}` : '';
            const typeStr = record.recoveryType === 'especial' ? ' (Esp.)' : ' (Hab.)';

            const displayMins = record.recoveryMinutes === 60 ? '1 hora' : `${record.recoveryMinutes} min`;

            recoveryLabel = `
                <div class="recovery-pill">
                    <i class="ri-history-line"></i> +${displayMins}
                    <span style="font-size: 0.65rem; opacity: 0.8; margin-left: 5px;">
                        ${dateStr}${typeStr}
                    </span>
                </div>`;
        }

        const typeLabel = record.isRecovery ? '<span style="color: #ffb800; font-weight: 700;">[RECUPERACIÓN]</span>' : '';
        const actionLabel = record.status === 'missing' ? 'Recuperar' : 'Marcar';
        const actionIcon = record.status === 'missing' ? 'ri-rest-time-line' : 'ri-edit-2-line';

        return `
            <tr>
                <td>${record.date}</td>
                <td>${record.day}</td>
                <td>${record.time}</td>
                <td>
                    <div class="status-cell">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </td>
                <td>
                    <div class="recovery-indicator">
                        ${typeLabel}
                        ${recoveryLabel}
                    </div>
                </td>
                <td>
                    <button class="btn-capsule outline" onclick="openAttendanceModal(${index})">
                        <i class="${actionIcon}"></i> ${actionLabel}
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    updateDebtMinutes(debtMinutes);
    // Extra refresh for header stats
    if (typeof refreshProfileHeaderStats === 'function') refreshProfileHeaderStats(currentStudentId);
}
window.loadAttendanceTable = loadAttendanceTable;

function updateDebtMinutes(minutes) {
    const el = document.getElementById('attendance-debt-minutes');
    if (el) {
        const val = Math.max(0, minutes);
        const display = val === 60 ? '1 hora' : `${val} min`;
        el.textContent = display;
    }
}

window.generateStudentSchedule = function () {
    const startStr = document.getElementById('attendance-start-date').value;
    const endStr = document.getElementById('attendance-end-date').value;

    if (!startStr || !endStr) {
        alert('Por favor selecciona ambas fechas.');
        return;
    }

    const startDate = new Date(startStr + 'T00:00:00');
    const endDate = new Date(endStr + 'T00:00:00');

    if (endDate < startDate) {
        alert('La fecha final no puede ser anterior a la inicial.');
        return;
    }

    // Get student's assigned days from scheduleData
    const scheduleData = JSON.parse(localStorage.getItem('scheduleData') || '{}');
    const studentAssignment = scheduleData.assignments?.find(a => a.studentId === currentStudentId);

    if (!studentAssignment || studentAssignment.timeSlots.length === 0) {
        alert('El alumno no tiene días de clase asignados en el Sistema de Horarios.');
        return;
    }

    const assignedDays = studentAssignment.timeSlots; // [{ day: 'Lunes', time: '8:30 am...' }]
    const dayMap = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };

    const newSchedule = [];
    let current = new Date(startDate);

    while (current <= endDate) {
        const dayOfWeek = current.getDay();
        const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);

        // Find if this day has assignments
        const dayAssignments = assignedDays.filter(a => a.day === dayName);

        dayAssignments.forEach(ass => {
            newSchedule.push({
                date: current.toISOString().split('T')[0],
                day: dayName,
                time: ass.time,
                status: 'pending',
                duration: 60,
                recoveryMinutes: 0,
                isRecovery: false
            });
        });

        current.setDate(current.getDate() + 1);
    }

    if (newSchedule.length === 0) {
        alert('No se encontraron coincidencias de días de clase en este rango de fechas.');
        return;
    }

    currentAttendanceData = newSchedule;
    saveCurrentAttendance();
    loadAttendanceTable();

    const saveBtn = document.getElementById('btn-save-attendance-cycle');
    if (saveBtn) saveBtn.style.display = 'inline-flex';

    alert(`✅ Cronograma generado con ${newSchedule.length} clases.`);
};

window.saveCurrentAttendance = function () {
    const key = `attendance_${currentStudentId}`;
    localStorage.setItem(key, JSON.stringify(currentAttendanceData));

    // FORZAR ACTUALIZACIÓN EN TIEMPO REAL
    console.log("Refreshing UI for student:", currentStudentId);

    // 1. Cabecera del Perfil
    refreshProfileHeaderStats(currentStudentId);

    // 2. Tablas Externas (si están abiertas o cargadas)
    if (window.loadStudentsTable) window.loadStudentsTable();
    if (window.loadPortfolioTable) window.loadPortfolioTable();
};

function refreshProfileHeaderStats(studentId) {
    if (!studentId) return;
    const stats = getAttendanceStats(studentId);
    const keyHistory = `attendance_history_${studentId}`;
    const history = JSON.parse(localStorage.getItem(keyHistory) || '[]');
    const historyAttended = history.reduce((acc, c) => acc + (c.stats.attended || 0), 0);

    const totalEl = document.getElementById('prof-clases-total');
    const cicloEl = document.getElementById('prof-clases-ciclo');

    if (totalEl) totalEl.textContent = stats.attended + historyAttended;
    if (cicloEl) cicloEl.textContent = `${stats.attended}/${stats.total}`;
}

window.openAttendanceModal = function (index) {
    pendingAttendanceIndex = index;
    const modal = document.getElementById('attendance-modal');
    modal.classList.add('active'); // Centering fix
    document.getElementById('recovery-details-section').style.display = 'none';
};

window.closeAttendanceModal = function () {
    document.getElementById('attendance-modal').classList.remove('active');
};

function setAttendanceStatus(status) {
    if (status === 'present_simple') {
        currentAttendanceData[pendingAttendanceIndex].status = 'present';
        currentAttendanceData[pendingAttendanceIndex].recoveryMinutes = 0;
        currentAttendanceData[pendingAttendanceIndex].recoveryDate = null;
        currentAttendanceData[pendingAttendanceIndex].recoveryTime = null;
        currentAttendanceData[pendingAttendanceIndex].recoveryType = null;
        currentAttendanceData[pendingAttendanceIndex].isRecovery = false;

        saveCurrentAttendance();
        loadAttendanceTable();
        closeAttendanceModal();
    } else if (status === 'present_extra' || status === 'recovery_only') {
        document.getElementById('recovery-details-section').style.display = 'block';
        // Temporary store the target status for the confirmation button
        currentAttendanceData[pendingAttendanceIndex]._tmpStatus = (status === 'recovery_only' ? 'recovery_only' : 'present');
        if (status === 'recovery_only') {
            document.getElementById('recovery-minutes').value = '60';
        } else {
            document.getElementById('recovery-minutes').value = '';
        }
    } else {
        currentAttendanceData[pendingAttendanceIndex].status = status;
        currentAttendanceData[pendingAttendanceIndex].recoveryMinutes = 0;
        currentAttendanceData[pendingAttendanceIndex].recoveryDate = null;
        currentAttendanceData[pendingAttendanceIndex].recoveryTime = null;
        currentAttendanceData[pendingAttendanceIndex].recoveryType = null;
        currentAttendanceData[pendingAttendanceIndex].isRecovery = false;

        saveCurrentAttendance();
        loadAttendanceTable();
        closeAttendanceModal();
    }
}
window.setAttendanceStatus = setAttendanceStatus;

function saveAttendanceWithRecovery() {
    const mins = parseInt(document.getElementById('recovery-minutes').value) || 0;
    const date = document.getElementById('recovery-date').value;
    const time = document.getElementById('recovery-time').value;
    const type = document.getElementById('recovery-schedule-type').value;

    if (!date || !time) {
        alert('Por favor indica la fecha y hora de la recuperación.');
        return;
    }

    const finalStatus = currentAttendanceData[pendingAttendanceIndex]._tmpStatus || 'present';

    currentAttendanceData[pendingAttendanceIndex].status = finalStatus;
    currentAttendanceData[pendingAttendanceIndex].recoveryMinutes = mins;
    currentAttendanceData[pendingAttendanceIndex].recoveryDate = date;
    currentAttendanceData[pendingAttendanceIndex].recoveryTime = time;
    currentAttendanceData[pendingAttendanceIndex].recoveryType = type;
    currentAttendanceData[pendingAttendanceIndex].isRecovery = (finalStatus === 'recovery_only');
    delete currentAttendanceData[pendingAttendanceIndex]._tmpStatus;

    saveCurrentAttendance();
    loadAttendanceTable();
    closeAttendanceModal();

    // Clear inputs
    document.getElementById('recovery-minutes').value = '';
    document.getElementById('recovery-date').value = '';
    document.getElementById('recovery-time').value = '';
    document.getElementById('recovery-schedule-type').value = 'habitual';
}
window.saveAttendanceWithRecovery = saveAttendanceWithRecovery;

// ========== HISTORY LOGIC ==========

window.saveAttendanceCycle = function () {
    if (currentAttendanceData.length === 0) return;

    if (!confirm('¿Estás seguro de que deseas archivar este ciclo de asistencia? Se moverá al historial.')) {
        return;
    }

    const keyHistory = `attendance_history_${currentStudentId}`;
    const history = JSON.parse(localStorage.getItem(keyHistory) || '[]');

    const stats = calculateAttendanceStats(currentAttendanceData);

    const cycleEntry = {
        id: Date.now(),
        startDate: currentAttendanceData[0].date,
        endDate: currentAttendanceData[currentAttendanceData.length - 1].date,
        totalClasses: currentAttendanceData.length,
        stats: stats,
        data: [...currentAttendanceData]
    };

    history.unshift(cycleEntry);
    localStorage.setItem(keyHistory, JSON.stringify(history));

    // Clear current
    currentAttendanceData = [];
    saveCurrentAttendance();
    loadAttendanceTable();
    loadAttendanceHistory();

    const saveBtn = document.getElementById('btn-save-attendance-cycle');
    if (saveBtn) saveBtn.style.display = 'none';

    alert('✅ Ciclo archivado en el historial correctamente.');
};

function calculateAttendanceStats(data) {
    let attended = 0;
    let missed = 0;
    let recoveredMin = 0;

    data.forEach(r => {
        if (r.status === 'present' || r.status === 'recovery_only') attended++;
        if (r.status === 'missing') missed++;
        recoveredMin += (r.recoveryMinutes || 0);
        if (r.status === 'recovery_only') recoveredMin += 60;
    });

    return { attended, missed, recoveredMin };
}

function loadAttendanceHistory() {
    const historyList = document.getElementById('attendance-history-list');
    if (!historyList) return;

    const keyHistory = `attendance_history_${currentStudentId}`;
    const history = JSON.parse(localStorage.getItem(keyHistory) || '[]');

    if (history.length === 0) {
        historyList.innerHTML = `<div style="text-align:center; padding: 2rem; color: #999; background: #f9f9f9; border-radius: 12px;">No hay ciclos archivados aún.</div>`;
        return;
    }

    historyList.innerHTML = history.map(cycle => `
        <div class="history-item">
            <div class="history-info">
                <div class="history-date">Ciclo: ${cycle.startDate} al ${cycle.endDate}</div>
                <div class="history-stats">
                    <span><i class="ri-calendar-check-line"></i> ${cycle.totalClasses} clases</span>
                    <span><i class="ri-check-line"></i> ${cycle.stats.attended} asistencias</span>
                    <span><i class="ri-close-line"></i> ${cycle.stats.missed} faltas</span>
                    <span><i class="ri-history-line"></i> ${cycle.stats.recoveredMin === 60 ? '1 hora' : cycle.stats.recoveredMin + ' min'} recup.</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="btn-capsule outline" onclick="exportHistoryPDF(${cycle.id})">
                    <i class="ri-file-pdf-line"></i> Exportar PDF
                </button>
                <button class="btn-icon delete" onclick="deleteHistoryCycle(${cycle.id})" title="Eliminar ciclo del historial" 
                    style="color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); padding: 8px;">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        </div>
    `).join('');
}

window.deleteHistoryCycle = function (cycleId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este ciclo del historial? Esta acción no se puede deshacer y afectará las asistencias acumuladas.')) {
        return;
    }

    const keyHistory = `attendance_history_${currentStudentId}`;
    let history = JSON.parse(localStorage.getItem(keyHistory) || '[]');
    history = history.filter(c => c.id !== cycleId);
    localStorage.setItem(keyHistory, JSON.stringify(history));

    loadAttendanceHistory();

    // Refresh header stats
    const studentsData = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const student = studentsData.find(s => s.id === currentStudentId);
    if (student) {
        initStudentProfile(student);
    }

    alert('✅ Ciclo eliminado del historial.');
};

window.exportHistoryPDF = function (cycleId) {
    const keyHistory = `attendance_history_${currentStudentId}`;
    const history = JSON.parse(localStorage.getItem(keyHistory) || '[]');
    const cycle = history.find(c => c.id === cycleId);

    if (!cycle) return;

    const originalData = currentAttendanceData;
    currentAttendanceData = cycle.data;
    exportAttendancePDF('progress');
    currentAttendanceData = originalData;
};

window.exportAttendancePDF = function (type) {
    const { jsPDF } = window.jspdf;
    const doc = jsPDF ? new jsPDF() : null;

    if (!doc) {
        alert('Librería PDF no cargada correctamente.');
        return;
    }

    const student = JSON.parse(localStorage.getItem('studentsData') || '[]').find(s => s.id === currentStudentId);
    const fullName = student ? `${student.primerNombre} ${student.primerApellido}` : 'Alumno';

    doc.setFontSize(22);
    doc.text('Casa del Pianista - Academia de Música', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text(`Cronograma de Asistencia: ${fullName}`, 105, 30, { align: 'center' });

    const headers = [['Fecha', 'Día', 'Hora', type === 'clean' ? 'Firma' : 'Estado', 'Detalle']];
    const rows = currentAttendanceData.map(r => {
        let detail = '';
        if (type !== 'clean') {
            if (r.isRecovery) detail = '[RECUPERACIÓN]';
            if (r.recoveryMinutes) {
                const displayMins = r.recoveryMinutes === 60 ? '1 hora' : `${r.recoveryMinutes} min`;
                const dateStr = r.recoveryDate ? ` (${r.recoveryDate.split('-').reverse().slice(0, 2).join('/')})` : '';
                detail += (detail ? ' + ' : '+') + `${displayMins}${dateStr}`;
            }
        }
        return [
            r.date,
            r.day,
            r.time,
            type === 'clean' ? '________________' : (r.status === 'present' ? 'Asistió' : (r.status === 'missing' ? 'Faltó' : (r.status === 'recovery_only' ? 'Recuperación' : 'Pendiente'))),
            detail
        ];
    });

    doc.autoTable({
        startY: 40,
        head: headers,
        body: rows,
        headStyles: { fillColor: [0, 26, 53], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    if (type === 'progress') {
        const debt = document.getElementById('attendance-debt-minutes')?.textContent || '0 min';
        doc.text(`Balance de Recuperación Pendiente: ${debt}`, 14, doc.lastAutoTable.finalY + 10);
    }

    const fileName = type === 'clean' ? `Asistencia_Limpia_${fullName}.pdf` : `Progreso_Asistencia_${fullName}.pdf`;
    doc.save(fileName);
};

// ========== PAYMENTS SYSTEM LOGIC ==========

function loadStudentPayments() {
    const transactions = JSON.parse(localStorage.getItem('salesTransactions') || '[]');
    const studentTransactions = transactions.filter(t => t.studentId === currentStudentId);

    // Sort by date (newest first)
    studentTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Summary
    const totalPaid = studentTransactions.filter(t => t.isPaid).reduce((sum, t) => sum + t.total, 0);
    const pendingDebt = studentTransactions.filter(t => !t.isPaid).reduce((sum, t) => sum + t.total, 0);
    const totalAccumulated = totalPaid + pendingDebt;
    const totalDiscounts = studentTransactions.reduce((sum, t) => sum + (t.discount?.amount || 0), 0);

    // Update Summary UI
    document.getElementById('prof-pay-total').textContent = `S/. ${totalPaid.toFixed(2)}`;
    document.getElementById('prof-pay-debt').textContent = `S/. ${pendingDebt.toFixed(2)}`;
    document.getElementById('prof-pay-accumulated').textContent = `S/. ${totalAccumulated.toFixed(2)}`;
    document.getElementById('prof-pay-discounts').textContent = `S/. ${totalDiscounts.toFixed(2)}`;

    // Render Table
    const tbody = document.getElementById('prof-payments-body');
    if (studentTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888; padding: 2rem;">No hay transacciones registradas</td></tr>';
        return;
    }

    tbody.innerHTML = studentTransactions.map(t => {
        const itemsList = t.items.map(i => i.description).join(', ');
        const statusBadge = t.isPaid
            ? '<span class="status-badge paid"><i class="ri-checkbox-circle-fill"></i> Pagado</span>'
            : '<span class="status-badge debt"><i class="ri-error-warning-fill"></i> Deuda</span>';

        const methodIcon = {
            'Yape': 'ri-smartphone-line',
            'Transferencia': 'ri-bank-line',
            'Efectivo': 'ri-money-dollar-circle-line'
        }[t.paymentMethod] || 'ri-bank-card-line';

        return `
            <tr>
                <td>${formatProfileDate(t.date)}</td>
                <td><div class="items-summary" title="${itemsList}">${itemsList}</div></td>
                <td><i class="${methodIcon}"></i> ${t.paymentMethod}</td>
                <td class="amount-cell">S/. ${t.total.toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td class="action-buttons">
                    <button class="btn-icon edit" onclick="handleProfileEditTransaction(${t.id})" title="Editar">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn-icon delete" onclick="handleProfileDeleteTransaction(${t.id})" title="Eliminar">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                    <button class="btn-icon view" onclick="viewTransactionDetails(${t.id})" title="Ver detalles">
                        <i class="ri-eye-line"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function formatProfileDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Wrappers to handle global functions from finance.js safely
window.handleProfileEditTransaction = function (id) {
    // Close modal first
    const modal = document.getElementById('student-detail-modal');
    if (modal) modal.classList.remove('active');

    if (typeof editTransaction === 'function') {
        editTransaction(id);
    } else {
        console.error('editTransaction not found');
    }
};

window.handleProfileDeleteTransaction = function (id) {
    if (typeof deleteTransaction === 'function') {
        const beforeCount = JSON.parse(localStorage.getItem('salesTransactions') || '[]').length;
        deleteTransaction(id);
        const afterCount = JSON.parse(localStorage.getItem('salesTransactions') || '[]').length;

        // If something was deleted, reload the profile payments
        if (beforeCount !== afterCount) {
            loadStudentPayments();
        }
    }
};

// ========== ASSIGNMENTS & EXAMS LOGIC ==========



// ========== SYLLABUS / SÍLABOS LOGIC ==========

let currentSyllabusModuleId = null;

function loadSyllabus() {
    renderSyllabusModules();
}

function getStudentInstrument() {
    const studentsData = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const student = studentsData.find(s => s.id == currentStudentId);
    return student ? student.instrumento : 'Piano'; // Default to Piano
}

function renderSyllabusModules() {
    const grid = document.getElementById('syllabus-modules-grid');
    if (!grid) return;

    document.getElementById('module-detail-view').style.display = 'none';
    grid.style.display = 'grid';

    const instrument = getStudentInstrument();

    for (let i = 1; i <= 6; i++) {
        const masterKey = `master_syllabus_${instrument}_mod_${i}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[], "songs":[]}');

        const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${i}`;
        const progressData = JSON.parse(localStorage.getItem(progressKey) || '{"mastery":[], "songMastery":[], "status":"Pendiente"}');

        // Calculate progress based on master length and student mastery
        const progress = calculateModuleProgress(masterData, progressData);

        const card = grid.children[i - 1];
        if (card) {
            const bar = card.querySelector(`#prog-mod-${i}`);
            const text = card.querySelector(`#text-mod-${i}`);
            const statusLabel = card.querySelector(`#status-mod-${i}`);
            const statsContainer = card.querySelector(`#stats-mod-${i}`);

            if (bar) bar.style.width = `${progress}%`;
            if (text) text.textContent = `${Math.round(progress)}%`;
            if (statusLabel) {
                statusLabel.textContent = progressData.status;
                card.className = `module-card ${progressData.status === 'Terminado' ? 'finished' : (progressData.status === 'En curso' ? 'active' : '')}`;
            }

            // Render stats in card
            if (statsContainer) {
                const stats = getModuleStats(masterData, progressData);
                statsContainer.innerHTML = `
                    <div class="stat-item" title="Temas (Pendientes)">
                        <i class="ri-book-read-line"></i>
                        <div class="stat-info-compact">
                            <span class="stat-label">Temas</span>
                            <span class="stat-value">${stats.totalTopics} <span class="stat-pending">-${stats.pendingTopics}</span></span>
                        </div>
                    </div>
                    <div class="stat-item" title="Exámenes (Pendientes)">
                        <i class="ri-medal-line"></i>
                        <div class="stat-info-compact">
                            <span class="stat-label">Exám.</span>
                            <span class="stat-value">${stats.totalExams} <span class="stat-pending">-${stats.pendingExams}</span></span>
                        </div>
                    </div>
                    <div class="stat-item" title="Canciones (Pendientes)">
                        <i class="ri-music-2-line"></i>
                        <div class="stat-info-compact">
                            <span class="stat-label">Canc.</span>
                            <span class="stat-value">${stats.totalSongs} <span class="stat-pending">-${stats.pendingSongs}</span></span>
                        </div>
                    </div>
                    <div class="stat-item" title="Tareas (Pendientes)">
                        <i class="ri-task-line"></i>
                        <div class="stat-info-compact">
                            <span class="stat-label">Tareas</span>
                            <span class="stat-value">${stats.totalTasks} <span class="stat-pending">-${stats.pendingTasks}</span></span>
                        </div>
                    </div>
                `;
            }
        }
    }
}

function getModuleStats(master, progress) {
    const totalTopics = master.topics.length;
    const totalExams = master.topics.filter(t => t.isExam).length;
    const totalTasks = master.topics.filter(t => t.isTask).length;
    const totalSongs = master.songs.length;

    const learnedTopicsCount = progress.mastery?.length || 0;
    const learnedExamsCount = master.topics.filter((t, idx) => t.isExam && progress.mastery?.includes(idx)).length;
    const learnedTasksCount = master.topics.filter((t, idx) => t.isTask && progress.mastery?.includes(idx)).length;
    const learnedSongsCount = progress.songMastery?.length || 0;

    return {
        totalTopics,
        totalExams,
        totalTasks,
        totalSongs,
        pendingTopics: totalTopics - learnedTopicsCount,
        pendingExams: totalExams - learnedExamsCount,
        pendingTasks: totalTasks - learnedTasksCount,
        pendingSongs: totalSongs - learnedSongsCount
    };
}

function calculateModuleProgress(master, progress) {
    const totalItems = (master.topics?.length || 0) + (master.songs?.length || 0);
    if (totalItems === 0) return 0;

    let learnedCount = 0;

    // Check topics mastery (by index/id mapping)
    if (progress.mastery) learnedCount += progress.mastery.length;
    if (progress.songMastery) learnedCount += progress.songMastery.length;

    return (learnedCount / totalItems) * 100;
}

function expandModule(moduleId) {
    currentSyllabusModuleId = moduleId;
    document.getElementById('syllabus-modules-grid').style.display = 'none';
    document.getElementById('module-detail-view').style.display = 'block';

    const instrument = getStudentInstrument();
    document.getElementById('current-module-title').textContent = `Sílabo ${instrument} - Módulo ${moduleId}`;

    renderModuleDetails();
}

function closeModuleDetail() {
    currentSyllabusModuleId = null;
    renderSyllabusModules();
}

function renderModuleDetails() {
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[], "songs":[]}');

    const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{"mastery":[], "songMastery":[], "externalSongs":[], "externalSongMastery":[], "status":"Pendiente"}');

    const gradesKey = `student_grades_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
    const gradesArray = JSON.parse(localStorage.getItem(gradesKey) || '[]');

    const songs = masterData.songs || [];
    const externalSongs = progressData.externalSongs || [];

    // Calculate song scores from evaluations
    const songScoresMap = {};
    gradesArray.forEach(g => {
        let totalP = 0; let pCount = 0;
        Object.keys(g.rubric || {}).forEach(c => {
            (g.rubric[c] || []).forEach(i => { if (i.applied) { totalP += parseFloat(i.score || 0); pCount++; } });
        });
        const pAvg = pCount > 0 ? (totalP / pCount) : 0;

        // Master songs (by index)
        if (g.evaluatedSongs) {
            g.evaluatedSongs.forEach(sIdx => {
                songScoresMap[sIdx] = pAvg;
            });
        }

        // External songs (by title matching customSongs)
        if (g.customSongs) {
            g.customSongs.forEach(customTitle => {
                const searchTitle = (customTitle || "").trim().toLowerCase();
                externalSongs.forEach((es, esIdx) => {
                    if ((es.title || "").trim().toLowerCase() === searchTitle) {
                        songScoresMap[`ext_${esIdx}`] = pAvg;
                    }
                });
            });
        }
    });

    // Render Stats Banner
    const stats = getModuleStats(masterData, progressData);
    const statsBanner = document.getElementById('module-stats-banner');
    if (statsBanner) {
        statsBanner.innerHTML = `
            <div class="stat-card-premium">
                <div class="stat-card-icon"><i class="ri-book-read-line"></i></div>
                <div class="stat-card-content">
                    <span class="stat-label">Total Temas</span>
                    <div class="stat-values">
                        <span class="stat-main-value">${stats.totalTopics}</span>
                        <span class="stat-badge pending">${stats.pendingTopics} pendientes</span>
                    </div>
                </div>
            </div>
            <div class="stat-card-premium">
                <div class="stat-card-icon"><i class="ri-file-list-3-line"></i></div>
                <div class="stat-card-content">
                    <span class="stat-label">Exámenes</span>
                    <div class="stat-values">
                        <span class="stat-main-value">${stats.totalExams}</span>
                        <span class="stat-badge pending">${stats.pendingExams} pendientes</span>
                    </div>
                </div>
            </div>
            <div class="stat-card-premium">
                <div class="stat-card-icon"><i class="ri-music-2-line"></i></div>
                <div class="stat-card-content">
                    <span class="stat-label">Canciones</span>
                    <div class="stat-values">
                        <span class="stat-main-value">${stats.totalSongs}</span>
                        <span class="stat-badge pending">${stats.pendingSongs} pendientes</span>
                    </div>
                </div>
            </div>
            <div class="stat-card-premium">
                <div class="stat-card-icon"><i class="ri-task-line"></i></div>
                <div class="stat-card-content">
                    <span class="stat-label">Tareas</span>
                    <div class="stat-values">
                        <span class="stat-main-value">${stats.totalTasks}</span>
                        <span class="stat-badge pending">${stats.pendingTasks} pendientes</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Render Topics
    const topicsBody = document.getElementById('topics-body');
    if (masterData.topics.length === 0) {
        topicsBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #666;">No hay temas agregados para este instrumento</td></tr>';
    } else {
        topicsBody.innerHTML = masterData.topics.map((t, idx) => {
            const isLearned = progressData.mastery.includes(idx);
            const isExam = t.isExam;
            const rowClass = isExam ? 'topic-row-exam' : '';
            return `
                <tr class="${rowClass}" style="${isExam ? 'background: rgba(246, 176, 0, 0.05); border-left: 4px solid var(--primary-color);' : ''}">
                    <td class="learned-cell">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div class="reorder-controls-vertical" style="display:flex; flex-direction:column; gap:2px;">
                                <button onclick="moveTopic(${idx}, -1)" style="border:none; background:none; cursor:pointer; color:#cbd5e1; font-size:12px; line-height:1; padding:2px;" title="Subir"><i class="ri-arrow-up-s-fill"></i></button>
                                <button onclick="moveTopic(${idx}, 1)" style="border:none; background:none; cursor:pointer; color:#cbd5e1; font-size:12px; line-height:1; padding:2px;" title="Bajar"><i class="ri-arrow-down-s-fill"></i></button>
                            </div>
                            <button class="btn-icon learned-toggle ${isLearned ? 'learned' : ''}" onclick="toggleTopicLearned(${idx})" 
                                    style="color: ${isLearned ? '#10b981' : '#ccc'}; font-size: 1.6rem;"
                                    title="${isLearned ? 'Aprendido' : 'Marcar como aprendido'}">
                                <i class="${isLearned ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}"></i>
                            </button>
                        </div>
                    </td>
                    <td class="theme-title" style="color: ${isExam ? 'var(--primary-color)' : (t.isTask ? '#2563eb' : '#222')};">
                        ${isExam ? '<i class="ri-medal-line"></i> ' : (t.isTask ? `<i class="ri-task-line" title="Tarea: ${t.taskType || ''}"></i> ` : '')}${t.title}
                        ${isExam && t.examType ? `<span style="background:#f59e0b; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:5px; font-weight:600; vertical-align:text-bottom;">${t.examType}</span>` : ''}
                        ${t.isTask && t.taskType ? `<br><small style="color: #64748b; font-weight: normal; font-size: 0.75rem;">Tarea: ${t.taskType}</small>` : ''}
                    </td>
                    <td title="${t.content}">${t.content || '-'}</td>
                    <td>${t.evidence || '-'}</td>
                    <td>${t.achievement || '-'}</td>
                    <td>
                        ${t.isEvaluated ? `
                            <button class="btn-grade-pill ${progressData.grades?.[idx] ? 'active' : ''}" 
                                    onclick="${isExam ? `openExamGradeModalInMod(${currentSyllabusModuleId}, ${idx})` : `goToTaskDetail(${currentSyllabusModuleId}, ${idx})`}"
                                    title="Calificar">
                                ${progressData.grades?.[idx] || '--'}
                            </button>
                        ` : '<span style="color:#cbd5e1; font-size:0.8rem;">(N/A)</span>'}
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <button class="btn-icon edit-sm" onclick="editTopic(${idx})" title="Editar"><i class="ri-edit-line"></i></button>
                            <button class="btn-icon delete-sm" onclick="deleteTopic(${idx})" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const renderSongItem = (s, idx, isExternal = false) => {
        const fullIdx = isExternal ? `ext_${idx}` : idx;
        const isLearned = isExternal
            ? (progressData.externalSongMastery || []).includes(idx)
            : progressData.songMastery.includes(idx);
        const score = songScoresMap[fullIdx];
        const hasScore = score !== undefined;

        // Visual Reordering Controls (Only for Master Songs)
        let reorderControls = '';
        if (!isExternal) {
            reorderControls = `
                <div class="reorder-controls" style="display:flex; flex-direction:column; gap:2px; margin-right:8px;">
                    <button onclick="moveSong(${idx}, -1)" style="border:none; background:none; cursor:pointer; color:#cbd5e1; font-size:12px; line-height:1; padding:0;" title="Subir"><i class="ri-arrow-up-s-fill"></i></button>
                    <button onclick="moveSong(${idx}, 1)" style="border:none; background:none; cursor:pointer; color:#cbd5e1; font-size:12px; line-height:1; padding:0;" title="Bajar"><i class="ri-arrow-down-s-fill"></i></button>
                </div>
            `;
        }

        return `
            <div class="song-item-card v-stack ${hasScore ? 'has-grade' : ''}" style="display: flex; align-items: center;">
                ${reorderControls}
                <div class="song-content-left" style="flex:1;">
                    <div class="song-header-row">
                        <button class="btn-icon learned-toggle ${isLearned ? 'learned' : ''}" onclick="toggleSongLearned('${fullIdx}')"
                                style="color: ${isLearned ? '#10b981' : '#ccc'}; font-size: 1.2rem;">
                            <i class="${isLearned ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}"></i>
                        </button>
                        <span class="song-title-text" style="font-size:0.95rem; font-weight:600;" title="${s.title}">${s.title}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem; white-space:nowrap;">
                    ${hasScore ? `
                        <div class="song-grade-pill compact" onclick="goToGradeFromSong('${fullIdx}')" style="cursor:pointer;" title="Ver Evaluación">
                            <span class="pill-label">NOTA</span>
                            <span class="pill-value">${score.toFixed(1)}</span>
                        </div>
                    ` : ''}
                    <div class="song-item-actions">
                        <button class="btn-edit" onclick="editSong('${fullIdx}')" title="Editar"><i class="ri-edit-line"></i></button>
                        ${isExternal ?
                `<button class="btn-archive" onclick="deleteSong('${fullIdx}')" title="Eliminar"><i class="ri-delete-bin-line"></i></button>` :
                `
                            <button class="btn-archive" onclick="archiveSong(${idx})" title="Archivar"><i class="ri-archive-line"></i></button>
                            <button class="btn-delete" onclick="deleteSong('${fullIdx}')" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
                            `
            }           </div>
                </div>
            </div>
        `;
    };

    // Filter and Sort Master Songs
    // We map original indices to preserve them, but only show unarchived.
    // Then we sort by 'displayOrder' (or index if missing)
    const activeMasterSongs = songs
        .map((s, i) => ({ ...s, originalIdx: i }))
        .filter(s => !s.isArchived)
        .sort((a, b) => {
            const orderA = a.displayOrder !== undefined ? a.displayOrder : a.originalIdx;
            const orderB = b.displayOrder !== undefined ? b.displayOrder : b.originalIdx;
            return orderA - orderB;
        });

    const famousHtml = activeMasterSongs.map(s => (s.category === 'famosa' || !s.category) ? renderSongItem(s, s.originalIdx) : '').join('');
    const practiceHtml = activeMasterSongs.map(s => s.category === 'practica' ? renderSongItem(s, s.originalIdx) : '').join('');
    const externalHtml = externalSongs.map((s, idx) => renderSongItem(s, idx, true)).join('');

    const songsContainer = document.getElementById('songs-list-container');
    const hasExternal = externalSongs.length > 0;

    songsContainer.className = hasExternal ? 'songs-container-split three-cols' : 'songs-container-split';

    songsContainer.innerHTML = `
        <div class="songs-section-column">
            <h5><i class="ri-star-line"></i> Canciones Famosas</h5>
            <div class="songs-v-list">${famousHtml || '<div class="empty-mini">Sin canciones</div>'}</div>
        </div>
        <div class="songs-section-column">
            <h5><i class="ri-flask-line"></i> Canciones de Práctica</h5>
            <div class="songs-v-list">
                ${practiceHtml || '<div class="empty-mini">Sin canciones</div>'}
            </div>
        </div>
        ${hasExternal ? `
        <div class="songs-section-column external-column">
            <h5><i class="ri-user-star-line"></i> Canciones Externas</h5>
            <div class="songs-v-list">${externalHtml}</div>
        </div>
        ` : ''}
    `;

    // Update complete button status
    const btnComplete = document.getElementById('btn-complete-module');
    if (progressData.status === 'Terminado') {
        btnComplete.innerHTML = '<i class="ri-checkbox-circle-fill"></i> Módulo Terminado';
        btnComplete.disabled = true;
        btnComplete.style.opacity = '0.5';
    } else {
        btnComplete.innerHTML = '<i class="ri-checkbox-circle-line"></i> Finalizar Módulo';
        btnComplete.disabled = false;
        btnComplete.style.opacity = '1';
    }

    // Render Grades Tab content
    renderGradesTab();

    // Render Assignments Tab content (Simplified)
    renderAssignmentsTab();
}

// TOPICS MANIPULATION
function showAddTopicForm() {
    document.getElementById('topic-modal-title').innerHTML = '<i class="ri-add-line"></i> Agregar Tema';
    document.getElementById('edit-topic-index').value = '';
    clearTopicForm();
    document.getElementById('topic-form-modal').style.display = 'block';
}

function clearTopicForm() {
    document.getElementById('topic-title').value = '';
    document.getElementById('topic-content').value = '';
    document.getElementById('topic-evidence').value = '';
    document.getElementById('topic-achievement').value = '';
    document.getElementById('topic-evaluated').checked = false;
    document.getElementById('topic-is-exam').checked = false;
    document.getElementById('topic-is-task').checked = false;
    document.getElementById('topic-task-type').value = 'Teórica';
    document.getElementById('topic-task-type').value = 'Teórica';
    document.getElementById('task-type-container').style.display = 'none';
    document.getElementById('topic-exam-type').value = 'Parcial';
    document.getElementById('exam-type-container').style.display = 'none';
}

function hideTopicForm() { document.getElementById('topic-form-modal').style.display = 'none'; }

function editTopic(idx) {
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey));
    const topic = masterData.topics[idx];

    document.getElementById('topic-modal-title').innerHTML = '<i class="ri-edit-line"></i> Editar Tema';
    document.getElementById('edit-topic-index').value = idx;
    document.getElementById('topic-title').value = topic.title;
    document.getElementById('topic-content').value = topic.content || '';
    document.getElementById('topic-evidence').value = topic.evidence || '';
    document.getElementById('topic-achievement').value = topic.achievement || '';
    document.getElementById('topic-evaluated').checked = !!topic.isEvaluated;
    document.getElementById('topic-is-exam').checked = !!topic.isExam;
    document.getElementById('topic-is-task').checked = !!topic.isTask;
    document.getElementById('topic-task-type').value = topic.taskType || 'Teórica';
    document.getElementById('topic-task-type').value = topic.taskType || 'Teórica';
    document.getElementById('task-type-container').style.display = topic.isTask ? 'block' : 'none';
    document.getElementById('topic-exam-type').value = topic.examType || 'Parcial';
    document.getElementById('exam-type-container').style.display = topic.isExam ? 'block' : 'none';

    document.getElementById('topic-form-modal').style.display = 'block';
}

function saveTopic() {
    const title = document.getElementById('topic-title').value;
    if (!title) return alert('El título es obligatorio');

    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[], "songs":[]}');

    const topicIdx = document.getElementById('edit-topic-index').value;

    const topicObj = {
        title: title,
        content: document.getElementById('topic-content').value,
        evidence: document.getElementById('topic-evidence').value,
        achievement: document.getElementById('topic-achievement').value,
        isEvaluated: document.getElementById('topic-evaluated').checked,
        isExam: document.getElementById('topic-is-exam').checked,
        isTask: document.getElementById('topic-is-task').checked,
        examType: document.getElementById('topic-exam-type').value,
        taskType: document.getElementById('topic-task-type').value
    };

    if (topicIdx === "") {
        masterData.topics.push(topicObj);
    } else {
        masterData.topics[parseInt(topicIdx)] = topicObj;
    }

    localStorage.setItem(masterKey, JSON.stringify(masterData));

    // Set student module to "En curso" if it was pending
    const capturedId = currentStudentId;
    const progressKey = `student_progress_syllabus_${capturedId}_mod_${currentSyllabusModuleId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{"mastery":[], "songMastery":[], "status":"En curso"}');
    if (progressData.status === 'Pendiente') progressData.status = 'En curso';
    localStorage.setItem(progressKey, JSON.stringify(progressData));

    hideTopicForm();
    renderModuleDetails();
}

const GRADING_TEMPLATES = {
    "Piano": {
        "Tecnica": [
            "Digitación fluida (Izquierda)", "Tempo sin metrónomo", "Respeto rítmico",
            "Sin visualización", "Uso de los dedos indicados de la canción", "Sin modificación de notas originales"
        ],
        "Expresion e Interpretación": [
            "Control dinámico", "Guía con partitura", "Fraseo coherente",
            "Expresividad emocional", "Matices interpretativos", "Estilo del género"
        ],
        "Memoria y Concentración": [
            "Concentración", "Canción memorizada", "Postura correcta",
            "Nivel de confianza", "Recuperación ante errores", "Continuidad rítmica"
        ],
        "Escena y Actitud": [
            "Control de nervios", "Presencia escénica", "Lenguaje corporal",
            "Actitud profesional", "Conexión con público", "Adaptación"
        ]
    },
    "Violín": {
        "Tecnica": [
            "Agarre del arco", "Afinación", "Calidad de sonido",
            "Digitación", "Vibrato", "Cambios de posición"
        ],
        "Expresion e Interpretación": [
            "Dinámica del arco", "Fraseo musical", "Ritmo y tempo",
            "Articulación", "Expresividad", "Estilo"
        ],
        "Memoria y Concentración": [
            "Memoria de partitura", "Concentración", "Postura corporal",
            "Confianza", "Fluidez", "Recuperación"
        ],
        "Escena y Actitud": [
            "Presencia", "Manejo escénico", "Conexión",
            "Disciplina", "Respuesta al público", "Presentación"
        ]
    },
    "Guitarra": {
        "Tecnica": [
            "Digitación mano izq", "Técnica de mano der", "Afinación",
            "Cejillas y acordes", "Claridad de notas", "Escalas"
        ],
        "Expresion e Interpretación": [
            "Dinámicas", "Fraseo", "Sentido rítmico",
            "Uso de efectos/matices", "Musicalidad", "Acento"
        ],
        "Memoria y Concentración": [
            "Memorización", "Enfoque", "Postura correcta",
            "Seguridad", "Recuperación de errores", "Continuidad"
        ],
        "Escena y Actitud": [
            "Seguridad escénica", "Postura profesional", "Conexión",
            "Preparación", "Carisma", "Versatilidad"
        ]
    }
};

let selectedGradesForExport = [];

window.renderGradesTab = function () {
    const instrument = getStudentInstrument();
    let allGrades = [];

    // Collect grades from all possible modules (1-6)
    for (let m = 1; m <= 6; m++) {
        const key = `student_grades_syllabus_${currentStudentId}_mod_${m}`;
        const raw = localStorage.getItem(key);

        // Load Master Data for filtering
        const masterKey = `master_syllabus_${instrument}_mod_${m}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[]}');

        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                const gradesArray = Array.isArray(parsed) ? parsed : [parsed];
                // Add metadata to each grade to know where it came from
                gradesArray.forEach((g, localIdx) => {
                    // FILTER: If it's a subtask evaluation AND the parent topic is an Exam, SKIP IT
                    if (g.isSubtaskEval && g._subtaskRef) {
                        const tIdx = parseInt(g._subtaskRef.topicIdx);
                        const topic = masterData.topics[tIdx];
                        if (topic && topic.isExam) {
                            return; // Skip this grade (it's a partial theory grade, hidden from main list)
                        }
                    }

                    allGrades.push({
                        ...g,
                        _moduleId: m,
                        _localIndex: localIdx,
                        _uniqueId: `${m}-${localIdx}`
                    });
                });
            } catch (e) { console.error(`Error loading grades for mod ${m}:`, e); }
        }
    }

    // Sort by date descending (newest first)
    allGrades.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const container = document.getElementById('grades-render-container');
    let cardsHTML = '';

    if (allGrades.length === 0) {
        cardsHTML = `
            <div class="empty-tab-state">
                <i class="ri-clipboard-line"></i>
                <p>No hay evaluaciones registradas en ningún módulo.</p>
            </div>
        `;
    } else {
        cardsHTML = `
            <div class="evaluation-cards-list">
                ${allGrades.map((g) => {
            const theoryScore = parseFloat(g.theoreticalGrade || 0);
            let totalP = 0; let pCount = 0;
            Object.keys(g.rubric || {}).forEach(c => {
                (g.rubric[c] || []).forEach(i => { if (i.applied) { totalP += parseFloat(i.score || 0); pCount++; } });
            });
            const pAvg = pCount > 0 ? (totalP / pCount) : 0;
            const finalS = (g.theoreticalGrade !== "" && !isNaN(theoryScore)) ? (pAvg + theoryScore) / 2 : pAvg;
            const { letter, colorClass } = getPerformanceInfo(finalS);
            const formattedDate = g.date ? new Date(g.date).toLocaleDateString() : 'Sin fecha';
            const modLabel = `Mod. ${g._moduleId}`;
            const isSelected = selectedGradesForExport.includes(g._uniqueId);

            return `
                        <div class="evaluation-card-container ${isSelected ? 'selected' : ''}" style="cursor:pointer;">
                            <input type="checkbox" class="batch-select-checkbox" ${isSelected ? 'checked' : ''} 
                                   onclick="event.stopPropagation(); handleBatchCheck('${g._uniqueId}', this.checked)">
                            
                            <div class="evaluation-card-header" onclick="openDetailedReport('${g._uniqueId}')">
                                <div class="eval-card-main-info">
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <span style="background:#000; color:#fff; font-size:10px; padding:2px 8px; border-radius:4px; font-weight:800; white-space:nowrap;">${modLabel}</span>
                                        <h4 style="margin:0;">${(g.examTitle || 'Evaluación').replace(/\[TAREA\]\s*/i, '')}</h4>
                                        ${g.isSubtaskEval ? `<span class="task-type-capsule ${colorClass}">${g.taskType || 'Tarea'}</span>` : ''}
                                    </div>
                                    ${g.evalSubtitle ? `<div style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">${g.evalSubtitle}</div>` : ''}
                                    <span class="eval-meta-text">${formattedDate} • ${g.instrument || instrument}</span>
                                </div>
                                <div class="eval-card-score-info">
                                    <div class="eval-final-score">${finalS.toFixed(2)}/20</div>
                                    <div class="eval-letter-badge ${colorClass}">${letter}</div>
                                    <div class="action-buttons-mini" style="margin-left: 10px; display: flex; gap: 5px; align-items: center;">
                                         <button onclick="event.stopPropagation(); duplicateEvaluation('${g._uniqueId}')" title="Duplicar Evaluación" style="background:none; border:none; cursor:pointer; color:#555;"><i class="ri-file-copy-line"></i></button>
                                         <i class="ri-external-link-line expand-icon"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
            <div id="batch-export-bar-container"></div>
        `;
    }

    container.innerHTML = cardsHTML;
    renderBatchExportBar();
}

window.handleBatchCheck = function (uniqueId, isChecked) {
    if (isChecked) {
        if (!selectedGradesForExport.includes(uniqueId)) selectedGradesForExport.push(uniqueId);
    } else {
        selectedGradesForExport = selectedGradesForExport.filter(i => i !== uniqueId);
    }
    renderGradesTab();
};

function renderBatchExportBar() {
    const container = document.getElementById('batch-export-bar-container');
    if (!container) return;

    if (selectedGradesForExport.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="batch-export-floating-bar">
            <span><i class="ri-checkbox-multiple-line"></i> ${selectedGradesForExport.length} evaluaciones seleccionadas</span>
            <div style="display: flex; gap: 10px;">
                <button class="btn-secondary btn-sm" onclick="selectedGradesForExport=[]; renderGradesTab();">Limpiar</button>
                <button class="btn-primary btn-sm" onclick="startBatchExport()">
                    <i class="ri-file-pdf-line"></i> Exportar Promedio PDF
                </button>
            </div>
        </div>

        <div class="report-footer-hint">
            CASA DEL PIANISTA - ACADEMIA DE MÚSICA • DOCUMENTO OFICIAL DE EVALUACIÓN
        </div>
    `;
}

window.openDetailedReport = function (uniqueId) {
    if (!uniqueId) return;
    const parts = uniqueId.toString().split('-');
    const m = parts[0];
    const localIdx = parts[1];

    const key = `student_grades_syllabus_${currentStudentId}_mod_${m}`;
    const raw = localStorage.getItem(key);

    if (!raw) {
        console.error("No grades found for module", m);
        return;
    }

    const gradesArray = JSON.parse(raw || '[]');
    const data = gradesArray[localIdx];

    if (!data) {
        console.error("No grade data found at index", localIdx);
        return;
    }

    renderDetailedReportHTML(data, "grading-report-render-area");
    const modal = document.getElementById('grading-report-modal');
    modal.dataset.currentIndex = localIdx;
    modal.dataset.currentModule = m;
    modal.classList.add('active');
};

function renderDetailedReportHTML(g, targetId, isAveraged = false) {
    const theoryScore = parseFloat(g.theoreticalGrade || 0);
    let totalP = 0; let pCount = 0;

    // Calculate category averages
    const catAverages = {};
    Object.keys(g.rubric || {}).forEach(c => {
        let catTotal = 0; let catCount = 0;
        (g.rubric[c] || []).forEach(i => {
            if (i.applied) {
                catTotal += parseFloat(i.score || 0);
                catCount++;
                totalP += parseFloat(i.score || 0);
                pCount++;
            }
        });
        catAverages[c] = catCount > 0 ? (catTotal / catCount) : 0;
    });

    const pAvg = pCount > 0 ? (totalP / pCount) : 0;
    const finalS = (g.theoreticalGrade !== "" && !isNaN(theoryScore)) ? (pAvg + theoryScore) / 2 : pAvg;
    const { letter, performance, colorClass } = getPerformanceInfo(finalS);

    const container = document.getElementById(targetId);

    // Get evaluated songs names
    const instrument = g.instrument || getStudentInstrument();
    const modId = g.moduleId || currentSyllabusModuleId;
    const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[], "topics":[]}');
    const moduleSongs = masterData.songs || [];
    const masterTopics = masterData.topics || [];

    // Get external songs from progress data
    let externalSongs = [];
    let progressData = {};
    if (currentStudentId) {
        const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${modId}`;
        const rawProgress = localStorage.getItem(progressKey);
        if (rawProgress) {
            progressData = JSON.parse(rawProgress);
            externalSongs = progressData.externalSongs || [];
        }
    }

    const songPills = [
        ...(g.evaluatedSongs || []).map(val => {
            if (typeof val === 'string' && val.startsWith('ext_')) {
                const extIdx = parseInt(val.replace('ext_', ''));
                return externalSongs[extIdx]?.title ? `${externalSongs[extIdx].title} (Ext.)` : null;
            }
            return moduleSongs[val]?.title;
        }).filter(Boolean),
        ...(g.customSongs || [])
    ];

    // Get evaluated subtasks names
    const subtaskPills = (g.evaluatedSubtasks || []).map(ref => {
        const [tIdx, sIdx] = ref.split('_').map(Number);
        const details = (progressData.taskDetails || {})[tIdx];
        const subtask = (details?.subtasks || [])[sIdx];
        return subtask ? subtask.title : null;
    }).filter(Boolean);

    const shortDate = g.date ? new Date(g.date).toLocaleDateString() : '--';
    const reportIndex = document.getElementById('grading-report-modal').dataset.currentIndex;

    // Get student data for full name
    const studentsData = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const student = studentsData.find(s => s.id === currentStudentId);
    const fullName = student ? `${student.primerNombre} ${student.segundoNombre || ''} ${student.primerApellido} ${student.segundoApellido || ''}`.trim().toUpperCase() : 'ESTUDIANTE';

    container.innerHTML = `
        <div class="report-institutional-header">
            <div class="header-left-box">
                <img src="logo.png" class="report-logo-img">
                <div class="academy-info">
                    <div class="ruc-text">RUC: 20609597381</div>
                </div>
            </div>
            <div class="header-right-box">
                <div class="student-label">ESTUDIANTE EVALUADO:</div>
                <div class="student-full-name">${fullName}</div>
            </div>
        </div><!-- NEW METADATA BLOCK -->
        <div class="report-metadata-top">
            <div class="meta-main-title">
                <div style="display:flex; align-items:center; gap:12px; justify-content:center;">
                    <h2 style="margin:0;">${isAveraged ? 'PROMEDIO DE EVALUACIONES' : (g.examTitle || 'EVALUACIÓN').replace(/\[TAREA\]\s*/i, '')}</h2>
                    ${g.isSubtaskEval ? `<span class="task-type-capsule-report ${colorClass}">${g.taskType || 'Tarea'}</span>` : ''}
                </div>
                ${g.evalSubtitle ? `<div style="font-size: 1rem; color: #64748b; margin-top: 4px; font-weight: 500; letter-spacing: 0.5px;">${g.evalSubtitle}</div>` : ''}
            </div>
            <div class="meta-details-row">
                <span><b>Instrumento:</b> ${instrument}</span>
                <span><b>Fecha:</b> ${isAveraged ? 'Varios Exámenes' : shortDate}</span>
                <span><b>Módulo:</b> ${modId}</span>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.3rem;">
            <div class="report-levels-strip" style="flex:1; margin-bottom:0;">
                ${[1, 2, 3, 4, 5, 6].map(lvl => {
        const isCurrent = lvl == modId;
        const isPast = lvl < modId;
        return `<div class="level-tab-btn ${isCurrent ? 'active-current' : (isPast ? 'active-past' : '')}">NIVEL ${lvl}</div>`;
    }).join('')}
            </div>
            ${!isAveraged ? `
            <div class="report-header-actions">
                <button class="btn-report-action edit" onclick="editReportFromModal()" title="Editar Evaluación"><i class="ri-edit-line"></i></button>
                <button class="btn-report-action delete" onclick="deleteReportFromModal()" title="Eliminar Evaluación"><i class="ri-delete-bin-line"></i></button>
            </div>
            ` : ''}
        </div>

        <!-- SLIM 3-COLUMN BANNER -->
        <div class="report-final-banner-slim ${colorClass}">
            <div class="banner-col banner-left">
                <span class="banner-label">CALIFICACIÓN</span>
                <span class="banner-score">${finalS.toFixed(2)}<span class="banner-score-base">/20</span></span>
            </div>
            
            <div class="banner-col banner-center">
                <div class="banner-medal" style="--perc: ${(finalS / 20 * 100).toFixed(2)}%;">
                    <span class="medal-letter">${letter}</span>
                    <span class="medal-perc">${(finalS / 20 * 100).toFixed(2)}%</span>
                </div>
            </div>
            
            <div class="banner-col banner-right">
                <div class="banner-performance">${performance.toUpperCase()}: <b>${letter}</b></div>
                ${g.theoreticalGrade !== "" && !isAveraged ? `
                <div class="banner-sub-scores">
                    <span>TEORÍA: <b>${theoryScore.toFixed(1)}</b></span>
                    <span>PRÁCTICA: <b>${pAvg.toFixed(1)}</b></span>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- EVALUATED ITEMS AREA -->
        ${(songPills.length > 0 || subtaskPills.length > 0) ? `
        <div class="report-songs-section-mid">
            ${songPills.length > 0 ? `
                <h4 style="font-size: 0.75rem; color: #64748b; margin-bottom: 6px; font-weight: 700;">PROYECTOS MUSICALES:</h4>
                <div class="report-songs-grid" style="margin-bottom: 12px;">
                    ${songPills.map(title => `<span class="report-song-pill">${title}</span>`).join('')}
                </div>
            ` : ''}
            ${subtaskPills.length > 0 ? `
                <h4 style="font-size: 0.75rem; color: #64748b; margin-bottom: 6px; font-weight: 700;">SUBTAREAS EVALUADAS:</h4>
                <div class="report-songs-grid">
                    ${subtaskPills.map(title => `<span class="report-song-pill subtask" style="background: rgba(37, 99, 235, 0.1); color: #2563eb; border-color: rgba(37, 99, 235, 0.2);">${title}</span>`).join('')}
                </div>
            ` : ''}
        </div>
        ` : ''}

        <div class="report-categories-grid">
            ${Object.keys(g.rubric || {}).map((catName, idx) => {
        const items = g.rubric[catName] || [];
        const avg = catAverages[catName];
        const cssClass = ['cat-tech', 'cat-expr', 'cat-memo', 'cat-scen'][idx % 4];

        return `
                    <div class="report-category-box ${cssClass}">
                        <div class="report-cat-header">
                            <h4>${catName}</h4>
                            <span class="report-cat-score">${avg.toFixed(2)}</span>
                            <span class="report-cat-perc">${((avg / 20) * 100).toFixed(0)}%</span>
                        </div>
                        <div class="report-items-list">
                            ${items.filter(i => i.applied).map(i => `
                                <div class="report-item-row">
                                    <span>${i.name}</span>
                                    <div>
                                        <span class="val">${parseFloat(i.score || 0).toFixed(1)}</span>
                                        <span class="pct">${((parseFloat(i.score || 0) / 20) * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
    }).join('')}
        </div>

        <div class="report-scale-container" style="margin-top: 0.4rem;">
            <h6>ESCALA DE CALIFICACIÓN OFICIAL</h6>
            <div class="scale-mini-grid">
                <div class="scale-box"><span>AD (Profesional)</span> <span class="range">19-20</span></div>
                <div class="scale-box"><span>A+ (Moderado)</span> <span class="range">16-18</span></div>
                <div class="scale-box"><span>A (Principiante)</span> <span class="range">13-15</span></div>
                <div class="scale-box"><span>B (Débil)</span> <span class="range">11-12</span></div>
                <div class="scale-box"><span>C (Sin Desempeño)</span> <span class="range">0-10</span></div>
            </div>
        </div>

        <div class="report-micro-footer">
            <span>Casa del Pianista - Academia de Música</span>
            <span class="footer-page">PÁG. 1 DE 1</span>
        </div>
    `;
}

window.printReport = function () {
    window.print();
};

window.editReportFromModal = function () {
    const modal = document.getElementById('grading-report-modal');
    const index = modal.dataset.currentIndex;
    const mId = modal.dataset.currentModule;
    modal.classList.remove('active');

    // Switch global current module to ensure editor loads correct songs
    currentSyllabusModuleId = parseInt(mId);
    showGradeEditor(parseInt(index));
};

window.deleteReportFromModal = function () {
    const modal = document.getElementById('grading-report-modal');
    const index = modal.dataset.currentIndex;
    const mId = modal.dataset.currentModule;

    if (confirm("¿Estás seguro de eliminar esta evaluación?")) {
        // Switch context for delete
        currentSyllabusModuleId = parseInt(mId);
        deleteGrade(parseInt(index));
        modal.classList.remove('active');
    }
};

window.startBatchExport = function () {
    const selectedData = [];

    selectedGradesForExport.forEach(uniqueId => {
        const [m, localIdx] = uniqueId.split('-');
        const key = `student_grades_syllabus_${currentStudentId}_mod_${m}`;
        const gradesArray = JSON.parse(localStorage.getItem(key) || '[]');
        if (gradesArray[localIdx]) selectedData.push(gradesArray[localIdx]);
    });

    if (selectedData.length === 0) return;

    // Average EVERYTHING
    const averaged = averageEvaluations(selectedData);

    // Show Preview
    const previewCont = document.getElementById('satisfaction-stats-preview');
    previewCont.innerHTML = `
        <p><strong>Exámenes promediados:</strong> ${selectedData.length}</p>
        <p><strong>Promedio Final:</strong> ${averaged.finalScore.toFixed(2)} (${averaged.letter})</p>
        <p style="font-size: 0.8rem; color: #777; margin-top: 10px;">El reporte incluirá el desglose detallado de las 4 categorías promediadas.</p>
    `;

    document.getElementById('satisfaction-preview-modal').classList.add('active');

    // Store temporarily
    window._tempAveragedData = averaged;
};

function averageEvaluations(evals) {
    if (evals.length === 0) return null;

    const result = {
        examTitle: "Reporte Consolidado",
        theoreticalGrade: 0,
        instrument: evals[0].instrument,
        moduleId: evals[0].moduleId,
        rubric: {},
        date: new Date().toISOString()
    };

    let totalTheory = 0; let theoryCount = 0;

    // Consolidate Rubric Structure
    const categories = Object.keys(evals[0].rubric);
    categories.forEach(cat => {
        result.rubric[cat] = evals[0].rubric[cat].map(item => ({ name: item.name, score: 0, count: 0, applied: true }));
    });

    evals.forEach(ev => {
        if (ev.theoreticalGrade !== "" && !isNaN(ev.theoreticalGrade)) {
            totalTheory += parseFloat(ev.theoreticalGrade);
            theoryCount++;
        }

        categories.forEach(cat => {
            (ev.rubric[cat] || []).forEach((item, idx) => {
                if (item.applied && result.rubric[cat][idx]) {
                    result.rubric[cat][idx].score += parseFloat(item.score || 0);
                    result.rubric[cat][idx].count++;
                }
            });
        });
    });

    // Finalize Rubric Averages
    categories.forEach(cat => {
        result.rubric[cat].forEach(item => {
            item.score = item.count > 0 ? (item.score / item.count).toFixed(2) : "0.00";
        });
    });

    result.theoreticalGrade = theoryCount > 0 ? (totalTheory / theoryCount).toFixed(2) : "";

    // Helper calculation for the preview
    let totalP = 0; let pCount = 0;
    Object.keys(result.rubric).forEach(c => {
        (result.rubric[c] || []).forEach(i => { totalP += parseFloat(i.score); pCount++; });
    });
    const pAvg = pCount > 0 ? (totalP / pCount) : 0;
    const theoryVal = parseFloat(result.theoreticalGrade || 0);
    const finalScore = result.theoreticalGrade !== "" ? (pAvg + theoryVal) / 2 : pAvg;
    const { letter } = getPerformanceInfo(finalScore);

    result.finalScore = finalScore;
    result.letter = letter;

    return result;
}

window.confirmAndExportBatch = function () {
    document.getElementById('satisfaction-preview-modal').classList.remove('active');

    // Open detailed report modal with averaged data
    renderDetailedReportHTML(window._tempAveragedData, "grading-report-render-area", true);
    document.getElementById('grading-report-modal').classList.add('active');
};




function getPerformanceInfo(score) {
    if (score >= 19) return { letter: 'AD', performance: 'Desempeño profesional', colorClass: 'grade-ad' };
    if (score >= 16) return { letter: 'A+', performance: 'Desempeño moderado', colorClass: 'grade-aplus' };
    if (score >= 13) return { letter: 'A', performance: 'Desempeño principiante', colorClass: 'grade-a' };
    if (score >= 11) return { letter: 'B', performance: 'Desempeño débil', colorClass: 'grade-b' };
    return { letter: 'C', performance: 'Sin desempeño', colorClass: 'grade-c' };
}

let currentCustomSongs = [];

window.showGradeEditor = function (index = null, studentIdOverride = null, moduleIdOverride = null) {
    const instrument = getStudentInstrument();
    const capturedId = studentIdOverride || currentStudentId;
    document.getElementById('grade-student-id').value = capturedId;

    // Use Override -> Global -> DOM -> Default '1'
    const targetModId = moduleIdOverride || currentSyllabusModuleId || document.getElementById('grade-module-selector').value || '1';

    const key = `student_grades_syllabus_${capturedId}_mod_${targetModId}`;
    const rawData = localStorage.getItem(key);
    let gradesArray = [];
    if (rawData) {
        const parsed = JSON.parse(rawData);
        gradesArray = Array.isArray(parsed) ? parsed : [parsed];
    }

    let gradesData = (index !== null) ? gradesArray[index] : {
        "rubric": {},
        "examTitle": "",
        "theoreticalGrade": "",
        "evaluatedSongs": [],
        "customSongs": [],
        "instrument": instrument,
        "moduleId": currentSyllabusModuleId
    };

    document.getElementById('grade-edit-index').value = (index !== null) ? index : "";
    document.getElementById('grade-exam-title').value = gradesData.examTitle || '';

    // Date Logic
    const dateInput = document.getElementById('grade-exam-date');
    if (gradesData.date) {
        // Format to YYYY-MM-DD for input[type=date]
        const d = new Date(gradesData.date);
        dateInput.value = d.toISOString().split('T')[0];
    } else {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    document.getElementById('grade-theory-score').value = gradesData.theoreticalGrade || '';
    document.getElementById('grade-module-selector').value = gradesData.moduleId || currentSyllabusModuleId;

    const instrumentSelector = document.getElementById('grade-instrument-selector');
    instrumentSelector.value = gradesData.instrument || instrument;

    // Set Exam Type
    const typeSelector = document.getElementById('grade-exam-type');
    typeSelector.value = gradesData.examType || 'regular';
    typeSelector.onchange = window.autoFillTheoreticalGrade; // Bind Listener

    // Render Module Song Selector
    renderModuleSongsSelector(gradesData.evaluatedSongs || []);

    // Render Custom Songs
    currentCustomSongs = JSON.parse(JSON.stringify(gradesData.customSongs || []));
    renderCustomSongsPills();

    // Render Rubric Editor
    renderRubricEditor(gradesData.rubric || null);

    // Render Module Subtasks Selector
    renderModuleSubtasksSelector(gradesData.evaluatedSubtasks || []);

    // Initial count update
    updateSelectedSongsCount();
    updateSelectedSubtasksCount();

    document.getElementById('grade-editor-modal').classList.add('active');

    // Auto-fill logic on open (only for new evaluations or empty fields)
    if (index === null || !gradesData.theoreticalGrade) {
        window.autoFillTheoreticalGrade();
    }
};

window.autoFillTheoreticalGrade = function () {
    const typeSelector = document.getElementById('grade-exam-type');
    const theoryInput = document.getElementById('grade-theory-score');
    if (!typeSelector || !theoryInput) return;

    // Only auto-fill if empty or 0, to avoid overwriting user explicit input 
    if (theoryInput.value !== "" && theoryInput.value != "0") return;

    const examType = typeSelector.value;
    if (examType !== 'partial' && examType !== 'final') return;

    const modId = document.getElementById('grade-module-selector').value || currentSyllabusModuleId;
    const instrument = document.getElementById('grade-instrument-selector').value || getStudentInstrument();
    const capturedId = document.getElementById('grade-student-id').value || currentStudentId;

    const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[]}');

    const searchTerm = (examType === 'partial') ? 'Parcial' : 'Final';
    const topicIdx = masterData.topics.findIndex(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

    if (topicIdx !== -1) {
        const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
        const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
        const details = progressData.taskDetails?.[topicIdx];

        // Check subtasks for a grade
        if (details && details.subtasks && details.subtasks.length > 0) {
            const gradedSubtask = details.subtasks.find(st => st.grade !== undefined && st.grade > 0);
            if (gradedSubtask) {
                theoryInput.value = gradedSubtask.grade;
                // Visual feedback
                theoryInput.style.backgroundColor = '#d1fae5';
                setTimeout(() => theoryInput.style.backgroundColor = '', 1000);
                console.log(`Auto-filled theoretical grade: ${gradedSubtask.grade}`);
            }
        }
    }
};

window.hideGradeEditor = function () {
    document.getElementById('grade-editor-modal').classList.remove('active');
};

window.toggleSongDropdown = function (event) {
    if (event) event.stopPropagation();
    const list = document.getElementById('song-dropdown-list');
    const isVisible = list.style.display === 'block';

    // Close any other open dropdowns if they exist (good practice)
    list.style.display = isVisible ? 'none' : 'block';
};

// Global click listener to close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    // Songs dropdown
    const songList = document.getElementById('song-dropdown-list');
    const songTrigger = document.querySelector('.multiselect-trigger');
    if (songList && songList.style.display === 'block') {
        if (!songList.contains(e.target) && !songTrigger.contains(e.target)) {
            songList.style.display = 'none';
        }
    }

    // Subtasks dropdown
    const subtaskList = document.getElementById('subtask-dropdown-list');
    const subtaskTrigger = document.querySelector('#subtask-dropdown-list')?.previousElementSibling; // The trigger
    if (subtaskList && subtaskList.style.display === 'block') {
        if (!subtaskList.contains(e.target) && (subtaskTrigger && !subtaskTrigger.contains(e.target))) {
            subtaskList.style.display = 'none';
        }
    }
});

window.toggleSubtaskDropdown = function (event) {
    if (event) event.stopPropagation();
    const list = document.getElementById('subtask-dropdown-list');
    const isVisible = list.style.display === 'block';
    list.style.display = isVisible ? 'none' : 'block';
};

function updateSelectedSubtasksCount() {
    const checked = document.querySelectorAll('#grade-subtasks-selector input:checked').length;
    const countDisplay = document.getElementById('selected-subtasks-count');
    const placeholder = document.getElementById('subtask-multiselect-placeholder');

    if (countDisplay) countDisplay.textContent = `${checked} seleccionadas`;

    if (placeholder) {
        if (checked === 0) {
            placeholder.textContent = "Haz click para seleccionar subtareas...";
            placeholder.style.color = "#999";
        } else {
            placeholder.textContent = `${checked} subtareas seleccionadas del módulo`;
            placeholder.style.color = "#2563eb";
            placeholder.style.fontWeight = "600";
        }
    }

    // Toggle selected class on labels
    document.querySelectorAll('#grade-subtasks-selector .song-pill-check').forEach(label => {
        const input = label.querySelector('input');
        if (input.checked) label.classList.add('selected');
        else label.classList.remove('selected');
    });
}

function updateSelectedSongsCount() {
    const checked = document.querySelectorAll('#grade-songs-selector input:checked').length;
    const countDisplay = document.getElementById('selected-songs-count');
    const placeholder = document.getElementById('multiselect-placeholder');

    if (countDisplay) countDisplay.textContent = `${checked} seleccionadas`;

    if (placeholder) {
        if (checked === 0) {
            placeholder.textContent = "Haz click para seleccionar canciones...";
            placeholder.style.color = "#999";
        } else {
            placeholder.textContent = `${checked} canciones seleccionadas del módulo`;
            placeholder.style.color = "var(--primary-color)";
            placeholder.style.fontWeight = "600";
        }
    }

    // Toggle selected class on labels
    document.querySelectorAll('#grade-songs-selector .song-pill-check').forEach(label => {
        const input = label.querySelector('input');
        if (input.checked) label.classList.add('selected');
        else label.classList.remove('selected');
    });
}

window.refreshGradeEditorTemplate = function () {
    // Refresh both songs and rubric based on new instrument
    renderModuleSongsSelector([]);
    renderModuleSubtasksSelector([]);
    renderRubricEditor(null);
};

function renderModuleSongsSelector(savedEvaluatedIndices) {
    const instrument = document.getElementById('grade-instrument-selector').value;
    const modId = document.getElementById('grade-module-selector').value;
    if (!modId) return;

    // 1. Get Master Songs
    const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[]}');
    const masterSongs = masterData.songs || [];

    // 2. Get Student's External Songs (if viewing a specific student)
    let externalSongs = [];
    if (currentStudentId) {
        const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${modId}`;
        const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
        externalSongs = progressData.externalSongs || [];
    }

    const songSelector = document.getElementById('grade-songs-selector');
    let html = '';

    // Grouping Master Songs (Sorting by displayOrder within categories)
    const famousSongs = masterSongs
        .map((s, idx) => ({ ...s, originalIdx: idx }))
        .filter(s => s.category !== 'practica' && !s.isArchived)
        .sort((a, b) => {
            const orderA = a.displayOrder !== undefined ? a.displayOrder : a.originalIdx;
            const orderB = b.displayOrder !== undefined ? b.displayOrder : b.originalIdx;
            return orderA - orderB;
        });

    const practiceSongs = masterSongs
        .map((s, idx) => ({ ...s, originalIdx: idx }))
        .filter(s => s.category === 'practica' && !s.isArchived)
        .sort((a, b) => {
            const orderA = a.displayOrder !== undefined ? a.displayOrder : a.originalIdx;
            const orderB = b.displayOrder !== undefined ? b.displayOrder : b.originalIdx;
            return orderA - orderB;
        });

    // 1. Render Famous Group First
    if (famousSongs.length > 0) {
        html += `<div class="subtask-group-header">CANCIONES FAMOSAS</div>`;
        html += famousSongs.map(s => `
            <label class="song-pill-check">
                <input type="checkbox" value="${s.originalIdx}" ${savedEvaluatedIndices.includes(s.originalIdx) ? 'checked' : ''} 
                       onchange="updateSelectedSongsCount()">
                <span>${s.title}</span>
            </label>
        `).join('');
    }

    // 2. Render Practice Group
    if (practiceSongs.length > 0) {
        html += `<div class="subtask-group-header">CANCIONES DE PRÁCTICA</div>`;
        html += practiceSongs.map(s => `
            <label class="song-pill-check">
                <input type="checkbox" value="${s.originalIdx}" ${savedEvaluatedIndices.includes(s.originalIdx) ? 'checked' : ''} 
                       onchange="updateSelectedSongsCount()">
                <span>${s.title}</span>
            </label>
        `).join('');
    }

    // 3. Render External Group (if viewing a specific student)
    if (externalSongs.length > 0) {
        html += `<div class="subtask-group-header">CANCIONES EXTERNAS</div>`;
        html += externalSongs.map((s, idx) => {
            const fullIdx = `ext_${idx}`;
            return `
                <label class="song-pill-check external">
                    <input type="checkbox" value="${fullIdx}" ${savedEvaluatedIndices.includes(fullIdx) ? 'checked' : ''} 
                           onchange="updateSelectedSongsCount()">
                    <span>${s.title}</span>
                </label>
            `;
        }).join('');
    }

    if (!html) {
        songSelector.innerHTML = '<div style="padding: 10px; color: #999; font-size: 0.8rem; width: 100%; text-align: center;">No hay canciones registradas en este módulo.</div>';
    } else {
        songSelector.innerHTML = html;
    }

    updateSelectedSongsCount();
}

window.renderModuleSubtasksSelector = function (savedEvaluatedSubtasks) { };

function renderRubricEditor(savedRubric) {
    const instrument = document.getElementById('grade-instrument-selector').value;
    const editor = document.getElementById('rubric-editor-container');

    // SNAPSHOT PROTECTION: If savedRubric is provided, use IT instead of the template.
    // This preserves custom text edits made in previous sessions.

    let structure = {};
    if (savedRubric && Object.keys(savedRubric).length > 0) {
        structure = savedRubric;
    } else {
        const template = GRADING_TEMPLATES[instrument] || GRADING_TEMPLATES["Piano"];
        Object.keys(template).forEach(cat => {
            structure[cat] = template[cat].map(itemName => ({ name: itemName, applied: false, score: "" }));
        });
    }

    editor.innerHTML = Object.keys(structure).map(cat => {
        const items = structure[cat];
        return `
            <div class="rubric-category-editor">
                <div class="rubric-cat-header-edit">
                    <input type="text" class="cat-title-editable" value="${cat}" placeholder="Categoría">
                </div>
                <div class="rubric-items-editor">
                    ${items.map((item) => `
                            <div class="rubric-item-edit-row">
                                <input type="text" class="item-name-editable" value="${item.name}" placeholder="Ítem">
                                <div class="item-inputs">
                                    <input type="text" placeholder="00.00" class="rubric-score-input" value="${item.score}" 
                                           oninput="handleScoreInput(this)" onclick="this.disabled=false">
                                    <label class="apply-check">
                                        <input type="checkbox" class="rubric-apply-check" ${item.applied ? 'checked' : ''} 
                                               onchange="this.parentElement.previousElementSibling.disabled = !this.checked">
                                        <span>Evaluar</span>
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

window.duplicateEvaluation = function (uniqueId) {
    const [m, localIdx] = uniqueId.split('-');
    const key = `student_grades_syllabus_${currentStudentId}_mod_${m}`;
    const gradesArray = JSON.parse(localStorage.getItem(key) || '[]');
    const sourceGrade = gradesArray[localIdx];

    if (!sourceGrade) return alert("Error al intentar duplicar.");

    // Switch context to that module
    currentSyllabusModuleId = parseInt(m);

    // Create Clone
    const clonedData = JSON.parse(JSON.stringify(sourceGrade));

    // 1. Reset Title
    clonedData.examTitle = `Copia de ${clonedData.examTitle || 'Evaluación'}`;

    // 2. Reset Date to Today (but allowing manual change)
    clonedData.date = new Date().toISOString();

    // 3. Reset Songs (FORCED CHANGE)
    clonedData.evaluatedSongs = [];

    // Open Editor in "New" mode (index = null)
    showGradeEditor(null);

    // Overwrite fields in the DOM
    document.getElementById('grade-exam-title').value = clonedData.examTitle;
    document.getElementById('grade-theory-score').value = clonedData.theoreticalGrade;
    document.getElementById('grade-exam-date').value = new Date().toISOString().split('T')[0];

    // Select instrument/module
    document.getElementById('grade-instrument-selector').value = clonedData.instrument;
    document.getElementById('grade-module-selector').value = clonedData.moduleId;

    // Custom songs
    currentCustomSongs = clonedData.customSongs || [];
    renderCustomSongsPills();

    // The most important part: The Rubric Snapshot
    renderRubricEditor(clonedData.rubric);

    updateSelectedSongsCount();
    renderModuleSongsSelector([]);

    alert("Evaluación Duplicada. Por favor selecciona la NUEVA canción y ajusta la fecha/título si es necesario.");
};

window.handleScoreInput = function (input) {
    const row = input.closest('.rubric-item-edit-row');
    const check = row.querySelector('.rubric-apply-check');
    if (input.value.trim() !== '') {
        check.checked = true;
        input.disabled = false;
    }
};

window.addCustomSongPill = function () {
    const input = document.getElementById('custom-song-name');
    if (input.value.trim() === '') return;
    currentCustomSongs.push(input.value.trim());
    input.value = '';
    renderCustomSongsPills();
};

function renderCustomSongsPills() {
    const cont = document.getElementById('custom-songs-container');
    cont.innerHTML = currentCustomSongs.map((song, idx) => `
        <div class="song-pill-check custom-pill">
            <span>${song}</span>
            <button onclick="removeCustomSong(${idx})" style="background:none; border:none; color:#ef4444; margin-left:5px; cursor:pointer;">&times;</button>
        </div>
    `).join('');
}

window.removeCustomSong = function (idx) {
    currentCustomSongs.splice(idx, 1);
    renderCustomSongsPills();
};

window.saveGrades = function () {
    const editIndex = document.getElementById('grade-edit-index').value;
    const rubric = {};
    const categories = document.querySelectorAll('.rubric-category-editor');

    categories.forEach(catEl => {
        const catTitle = catEl.querySelector('.cat-title-editable').value;
        const rows = catEl.querySelectorAll('.rubric-item-edit-row');
        rubric[catTitle] = Array.from(rows).map(row => ({
            name: row.querySelector('.item-name-editable').value,
            score: row.querySelector('.rubric-score-input').value,
            applied: row.querySelector('.rubric-apply-check').checked
        }));
    });

    const evaluatedSongs = Array.from(document.querySelectorAll('#grade-songs-selector input:checked')).map(el => {
        const val = el.value;
        return (val.startsWith('ext_')) ? val : parseInt(val);
    });

    const evaluatedSubtasks = Array.from(document.querySelectorAll('#grade-subtasks-selector input:checked')).map(el => el.value);

    const gradesData = {
        examTitle: document.getElementById('grade-exam-title').value,
        examType: document.getElementById('grade-exam-type').value, // Save Exam Type
        theoreticalGrade: document.getElementById('grade-theory-score').value,
        moduleId: document.getElementById('grade-module-selector').value,
        instrument: document.getElementById('grade-instrument-selector').value,
        evaluatedSongs: evaluatedSongs,
        evaluatedSubtasks: evaluatedSubtasks,
        customSongs: currentCustomSongs,
        rubric: rubric,
        date: document.getElementById('grade-exam-date').value || new Date().toISOString()
    };

    const targetModId = document.getElementById('grade-module-selector').value || currentSyllabusModuleId;
    const capturedId = document.getElementById('grade-student-id').value || currentStudentId;
    const key = `student_grades_syllabus_${capturedId}_mod_${targetModId}`;
    const rawData = localStorage.getItem(key);
    let gradesArray = [];
    if (rawData) {
        const parsed = JSON.parse(rawData);
        gradesArray = Array.isArray(parsed) ? parsed : [parsed];
    }

    if (editIndex !== "") {
        gradesArray[parseInt(editIndex)] = gradesData;
    } else {
        gradesArray.push(gradesData);
    }

    // SYLLABUS LINKING LOGIC
    // If it's a Partial or Final exam, find the corresponding topic in the Syllabus and grade it.
    if (gradesData.examType === 'partial' || gradesData.examType === 'final') {
        const instrument = gradesData.instrument;
        const masterKey = `master_syllabus_${instrument}_mod_${targetModId}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[], "songs":[]}');

        // Find topic index
        const searchTerm = (gradesData.examType === 'partial') ? 'Parcial' : 'Final';
        const topicIdx = masterData.topics.findIndex(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

        if (topicIdx !== -1) {
            // Calculate Score for Syllabus (Avg of Theory + Rubric)
            const theoryScore = parseFloat(gradesData.theoreticalGrade || 0);
            let totalP = 0; let pCount = 0;

            Object.keys(gradesData.rubric || {}).forEach(c => {
                (gradesData.rubric[c] || []).forEach(i => {
                    if (i.applied) {
                        totalP += parseFloat(i.score || 0);
                        pCount++;
                    }
                });
            });

            const pAvg = pCount > 0 ? (totalP / pCount) : 0;
            const finalScore = (gradesData.theoreticalGrade !== "" && !isNaN(theoryScore)) ? (pAvg + theoryScore) / 2 : pAvg;

            // Update Syllabus Progress
            const progressKey = `student_progress_syllabus_${capturedId}_mod_${targetModId}`;
            const progressData = JSON.parse(localStorage.getItem(progressKey) || '{"mastery":[], "songMastery":[], "grades":{}, "status":"En curso"}');

            if (!progressData.grades) progressData.grades = {};
            progressData.grades[topicIdx] = finalScore.toFixed(2);

            // Mark as mastered if not already
            if (!progressData.mastery.includes(topicIdx)) {
                progressData.mastery.push(topicIdx);
            }

            localStorage.setItem(progressKey, JSON.stringify(progressData));
            console.log(`Linked Exam (${gradesData.examType}) to Syllabus Topic '${masterData.topics[topicIdx].title}' (Base Index: ${topicIdx}) with Score: ${finalScore}`);
        }
    }

    localStorage.setItem(key, JSON.stringify(gradesArray));

    // Update Subtask View if open (to reflect "Calificado" status change)
    if (document.getElementById('assignment-detail-view') &&
        document.getElementById('assignment-detail-view').style.display === 'block' &&
        window.currentDetailModId &&
        window.currentDetailTopicIdx !== undefined) {
        renderSubtasksInMod(window.currentDetailModId, window.currentDetailTopicIdx);
    }

    alert('Calificación guardada correctamente.');
    hideGradeEditor();
    renderModuleDetails();
};

window.deleteGrade = function (index) {
    if (!confirm('¿Estás seguro de eliminar esta evaluación?')) return;
    const capturedId = document.getElementById('grade-student-id').value || currentStudentId;
    const key = `student_grades_syllabus_${capturedId}_mod_${currentSyllabusModuleId}`;
    const gradesArray = JSON.parse(localStorage.getItem(key) || '[]');
    gradesArray.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(gradesArray));
    renderModuleDetails();
};

window.exportEvaluationPDF = function (index) {
    // In a real scenario, this would filter by index, for now we print the whole view
    window.print();
};

// INTERACTIVE ACTIONS
window.toggleTopicLearned = function (idx) {
    const key = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"mastery":[], "songMastery":[], "status":"En curso"}');

    const masteryIdx = data.mastery.indexOf(idx);
    if (masteryIdx === -1) {
        data.mastery.push(idx);
    } else {
        data.mastery.splice(masteryIdx, 1);
    }

    localStorage.setItem(key, JSON.stringify(data));
    renderModuleDetails();
};

window.toggleSongLearned = function (idx) {
    const isEx = typeof idx === 'string' && idx.startsWith('ext_');
    const actualIdx = isEx ? parseInt(idx.replace('ext_', '')) : parseInt(idx);

    const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{"mastery":[], "songMastery":[], "externalSongs":[], "externalSongMastery":[], "status":"En curso"}');

    if (isEx) {
        if (!progressData.externalSongMastery) progressData.externalSongMastery = [];
        const mIdx = progressData.externalSongMastery.indexOf(actualIdx);
        if (mIdx === -1) progressData.externalSongMastery.push(actualIdx);
        else progressData.externalSongMastery.splice(mIdx, 1);
    } else {
        const mIdx = progressData.songMastery.indexOf(actualIdx);
        if (mIdx === -1) progressData.songMastery.push(actualIdx);
        else progressData.songMastery.splice(mIdx, 1);
    }

    // Set status to "En curso" if it was pending
    if (progressData.status === 'Pendiente') progressData.status = 'En curso';

    localStorage.setItem(progressKey, JSON.stringify(progressData));
    renderModuleDetails();
};

window.updateTopicGrade = function (idx, val) {
    const key = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
    const data = JSON.parse(localStorage.getItem(key));
    if (!data.grades) data.grades = {};
    data.grades[idx] = val;
    localStorage.setItem(key, JSON.stringify(data));
};

window.updateSongGrade = function (idx, val) {
    const key = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
    const data = JSON.parse(localStorage.getItem(key));
    if (!data.songGrades) data.songGrades = {};
    data.songGrades[idx] = val;
    localStorage.setItem(key, JSON.stringify(data));
};

window.moveTopic = function (idx, direction) {
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[], "songs":[]}');
    const topics = masterData.topics;

    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= topics.length) return;

    // 1. Swap in master list
    const temp = topics[idx];
    topics[idx] = topics[newIdx];
    topics[newIdx] = temp;
    localStorage.setItem(masterKey, JSON.stringify(masterData));

    // 2. Update ALL students progress and evaluations for this specific module/instrument
    const students = JSON.parse(localStorage.getItem('studentsData') || '[]');
    students.forEach(s => {
        if (s.instrumento !== instrument) return;

        // Progress Keys
        const progressKey = `student_progress_syllabus_${s.id}_mod_${currentSyllabusModuleId}`;
        const progressRaw = localStorage.getItem(progressKey);
        if (progressRaw) {
            const progressData = JSON.parse(progressRaw);

            // Swap Mastery Indices
            if (progressData.mastery) {
                const hadIdx = progressData.mastery.includes(idx);
                const hadNewIdx = progressData.mastery.includes(newIdx);

                progressData.mastery = progressData.mastery.filter(i => i !== idx && i !== newIdx);
                if (hadIdx) progressData.mastery.push(newIdx);
                if (hadNewIdx) progressData.mastery.push(idx);
            }

            // Swap Grades (Simple mapping)
            if (progressData.grades) {
                const gradeIdx = progressData.grades[idx];
                const gradeNewIdx = progressData.grades[newIdx];

                if (gradeIdx !== undefined) progressData.grades[newIdx] = gradeIdx;
                else delete progressData.grades[newIdx];

                if (gradeNewIdx !== undefined) progressData.grades[idx] = gradeNewIdx;
                else delete progressData.grades[idx];
            }

            // Swap taskDetails (Specific metadata for each topic/task)
            if (progressData.taskDetails) {
                const detailIdx = progressData.taskDetails[idx];
                const detailNewIdx = progressData.taskDetails[newIdx];

                if (detailIdx !== undefined) progressData.taskDetails[newIdx] = detailIdx;
                else delete progressData.taskDetails[newIdx];

                if (detailNewIdx !== undefined) progressData.taskDetails[idx] = detailNewIdx;
                else delete progressData.taskDetails[idx];
            }

            // Swap taskDueDates
            if (progressData.taskDueDates) {
                const dateIdx = progressData.taskDueDates[idx];
                const dateNewIdx = progressData.taskDueDates[newIdx];

                if (dateIdx !== undefined) progressData.taskDueDates[newIdx] = dateIdx;
                else delete progressData.taskDueDates[newIdx];

                if (dateNewIdx !== undefined) progressData.taskDueDates[idx] = dateNewIdx;
                else delete progressData.taskDueDates[idx];
            }

            localStorage.setItem(progressKey, JSON.stringify(progressData));
        }

        // Evaluation History Keys (Used for the report system)
        const evalKey = `student_grades_syllabus_${s.id}_mod_${currentSyllabusModuleId}`;
        const evalRaw = localStorage.getItem(evalKey);
        if (evalRaw) {
            let evaluations = JSON.parse(evalRaw);
            if (!Array.isArray(evaluations)) evaluations = [evaluations];

            let changed = false;
            evaluations.forEach(e => {
                if (e._subtaskRef) {
                    if (parseInt(e._subtaskRef.topicIdx) === idx) {
                        e._subtaskRef.topicIdx = newIdx;
                        changed = true;
                    } else if (parseInt(e._subtaskRef.topicIdx) === newIdx) {
                        e._subtaskRef.topicIdx = idx;
                        changed = true;
                    }
                }
            });

            if (changed) {
                localStorage.setItem(evalKey, JSON.stringify(evaluations));
            }
        }
    });

    renderModuleDetails();
};

window.deleteTopic = function (idx) {
    if (!confirm('¿Eliminar este tema del sílabo global de este instrumento? (Afectará a todos los alumnos)')) return;
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey));
    masterData.topics.splice(idx, 1);
    localStorage.setItem(masterKey, JSON.stringify(masterData));
    renderModuleDetails();
};

window.deleteSong = function (idx) {
    const isEx = typeof idx === 'string' && idx.startsWith('ext_');
    const actualIdx = isEx ? parseInt(idx.replace('ext_', '')) : parseInt(idx);

    if (isEx) {
        if (!confirm('¿Eliminar esta canción externa de este alumno?')) return;
        const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
        const progressData = JSON.parse(localStorage.getItem(progressKey));
        progressData.externalSongs.splice(actualIdx, 1);
        if (progressData.externalSongMastery) {
            progressData.externalSongMastery = progressData.externalSongMastery.filter(i => i !== actualIdx).map(i => i > actualIdx ? i - 1 : i);
        }
        localStorage.setItem(progressKey, JSON.stringify(progressData));
    } else {
        if (!confirm('¿Eliminar esta canción del sílabo global? (Afectará a todos los alumnos)')) return;
        const instrument = getStudentInstrument();
        const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey));
        masterData.songs.splice(actualIdx, 1);
        localStorage.setItem(masterKey, JSON.stringify(masterData));
    }
    renderModuleDetails();
};

window.markModuleAsFinished = function () {
    if (!confirm('¿Estás seguro de marcar este módulo como terminado?')) return;
    const key = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
    const data = JSON.parse(localStorage.getItem(key));
    data.status = 'Terminado';
    localStorage.setItem(key, JSON.stringify(data));
    renderModuleDetails();
    alert('Módulo finalizado con éxito');
};

// SONG MANAGEMENT
window.showAddSongForm = function () {
    document.getElementById('song-modal-title').innerHTML = '<i class="ri-add-line"></i> Agregar Canción';
    document.getElementById('edit-song-index').value = '';
    document.getElementById('song-title').value = '';
    document.getElementById('song-category').value = 'famosa';
    document.getElementById('song-genre').value = 'infantil';
    document.getElementById('song-is-external').checked = false;
    document.getElementById('song-form-modal').style.display = 'block';
};

window.hideSongForm = function () {
    document.getElementById('song-form-modal').style.display = 'none';
};

window.editSong = function (idx) {
    const isEx = typeof idx === 'string' && idx.startsWith('ext_');
    const actualIdx = isEx ? parseInt(idx.replace('ext_', '')) : parseInt(idx);

    let song;
    if (isEx) {
        const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
        const progressData = JSON.parse(localStorage.getItem(progressKey));
        song = progressData.externalSongs[actualIdx];
    } else {
        const instrument = getStudentInstrument();
        const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey));
        song = masterData.songs[actualIdx];
    }

    document.getElementById('song-modal-title').innerHTML = '<i class="ri-edit-line"></i> Editar Canción';
    document.getElementById('edit-song-index').value = idx;
    document.getElementById('song-title').value = song.title;
    document.getElementById('song-category').value = song.category || 'famosa';
    document.getElementById('song-genre').value = song.genre || 'otros';
    document.getElementById('song-is-external').checked = isEx;

    document.getElementById('song-form-modal').style.display = 'block';
};

window.saveSong = function () {
    const title = document.getElementById('song-title').value;
    if (!title) return alert('El título es obligatorio');

    const isEx = document.getElementById('song-is-external').checked;
    const songIdx = document.getElementById('edit-song-index').value;

    const songData = {
        title: title,
        category: document.getElementById('song-category').value,
        genre: document.getElementById('song-genre').value
    };

    if (isEx) {
        const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
        const progressData = JSON.parse(localStorage.getItem(progressKey) || '{"mastery":[], "songMastery":[], "externalSongs":[], "externalSongMastery":[], "status":"En curso"}');

        const actualIdx = (typeof songIdx === 'string' && songIdx.startsWith('ext_'))
            ? parseInt(songIdx.replace('ext_', ''))
            : "";

        if (actualIdx === "") {
            if (!progressData.externalSongs) progressData.externalSongs = [];
            progressData.externalSongs.push(songData);
        } else {
            progressData.externalSongs[actualIdx] = songData;
        }
        localStorage.setItem(progressKey, JSON.stringify(progressData));
    } else {
        const instrument = getStudentInstrument();
        const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[], "songs":[]}');

        const actualIdx = (typeof songIdx === 'string' && songIdx.startsWith('ext_'))
            ? "" // If it was external and now isn't, we add as new or we should handle migration (adding as new for simplicity)
            : (songIdx === "" ? "" : parseInt(songIdx));

        if (actualIdx === "") {
            masterData.songs.push(songData);
        } else {
            masterData.songs[actualIdx] = songData;
        }
        localStorage.setItem(masterKey, JSON.stringify(masterData));
    }

    hideSongForm();
    renderModuleDetails();
};

// ========== SMART DELETE LOGIC WITH CUSTOM MODAL ==========

// Utility for Custom Modal
window.showCustomConfirm = function (options) {
    const modal = document.getElementById('custom-confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const iconEl = document.getElementById('confirm-icon');
    const btnAction = document.getElementById('confirm-btn-action');
    const btnCancel = document.getElementById('confirm-btn-cancel');

    titleEl.textContent = options.title || 'Confirmar';
    msgEl.innerHTML = options.message || '¿Está seguro?'; // Allow HTML

    // Icon Configuration
    iconEl.innerHTML = options.iconHtml || '<i class="ri-question-line"></i>';
    iconEl.style.color = options.iconColor || 'var(--primary-color)';
    iconEl.style.background = options.iconBg || 'rgba(246, 176, 0, 0.1)';

    // Button Configuration
    btnAction.textContent = options.confirmText || 'Confirmar';
    btnAction.className = options.confirmClass || 'btn-primary';

    // Handlers
    btnAction.onclick = () => {
        if (options.onConfirm) options.onConfirm();
        modal.classList.remove('active');
        modal.style.display = 'none';
    };

    btnCancel.onclick = () => {
        modal.classList.remove('active');
        modal.style.display = 'none';
    };

    // Show
    modal.style.display = 'flex'; // Flex for centering
    setTimeout(() => modal.classList.add('active'), 10);
};

window.checkSongUsage = function (songIdx, moduleId, instrument) {
    const students = JSON.parse(localStorage.getItem('studentsData') || '[]');
    let usageCount = 0;

    students.forEach(s => {
        // Check grade for this module
        const key = `student_grades_syllabus_${s.id}_mod_${moduleId}`;
        const raw = localStorage.getItem(key);
        if (!raw) return;

        const grades = JSON.parse(raw);
        // Normalize to array
        const gradesArr = Array.isArray(grades) ? grades : [grades];

        gradesArr.forEach(g => {
            // Check if this grade uses the target instrument (or default)
            const gInstrument = g.instrument || s.instrumento || 'Piano';
            if (gInstrument !== instrument) return;

            if (g.evaluatedSongs && g.evaluatedSongs.includes(songIdx)) {
                usageCount++;
            }
        });
    });

    return usageCount;
};

window.deleteSong = function (uniqueId) {
    if (uniqueId.startsWith('ext_')) {
        // External songs
        showCustomConfirm({
            title: 'Eliminar Canción Externa',
            message: 'Esta canción solo existe para este alumno. ¿Deseas eliminarla permanentemente?',
            iconHtml: '<i class="ri-delete-bin-line"></i>',
            iconColor: '#ef4444',
            iconBg: '#fee2e2',
            confirmText: 'Eliminar',
            confirmClass: 'btn-danger', // We can style this if needed
            onConfirm: () => {
                let idx = parseInt(uniqueId.replace('ext_', ''));
                const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
                const progressData = JSON.parse(localStorage.getItem(progressKey));

                if (progressData && progressData.externalSongs) {
                    progressData.externalSongs.splice(idx, 1);
                    if (progressData.externalSongMastery) {
                        progressData.externalSongMastery = progressData.externalSongMastery.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
                    }
                    localStorage.setItem(progressKey, JSON.stringify(progressData));
                    renderModuleDetails();
                }
            }
        });
        return;
    }

    // MASTER SONG DELETION
    const idx = parseInt(uniqueId);
    const instrument = getStudentInstrument();
    const moduleId = currentSyllabusModuleId;
    const masterKey = `master_syllabus_${instrument}_mod_${moduleId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[]}');

    // 1. Check Usage
    const usageCount = checkSongUsage(idx, moduleId, instrument);

    if (usageCount > 0) {
        // CASE: USED - BLOCK DELETE & OFFER ARCHIVE
        showCustomConfirm({
            title: '⚠️ Acción Bloqueada',
            message: `Esta canción tiene <b>${usageCount} calificación(es)</b> asociada(s).<br><br>
                      No se puede eliminar porque se perderían los datos históricos.<br>
                      Te recomendamos <b>ARCHIVARLA</b> en su lugar.`,
            iconHtml: '<i class="ri-shield-keyhole-line"></i>',
            iconColor: '#f59e0b',
            iconBg: '#fffbeb',
            confirmText: 'Archivar Canción',
            confirmClass: 'btn-warning',
            onConfirm: () => {
                archiveSong(idx, true); // True to skip 2nd confirm
            }
        });
        return;
    }

    // CASE: UNUSED - CONFIRM DELETE
    showCustomConfirm({
        title: 'Confirmar Eliminación',
        message: 'Esta canción NO tiene calificaciones asociadas. <br>¿Estás seguro de eliminarla permanentemente del sílabo?',
        iconHtml: '<i class="ri-delete-bin-2-line"></i>',
        iconColor: '#ef4444',
        iconBg: '#fee2e2',
        confirmText: 'Sí, Eliminar',
        confirmClass: 'btn-danger',
        onConfirm: () => {
            // Delete and Re-index
            masterData.songs.splice(idx, 1);
            localStorage.setItem(masterKey, JSON.stringify(masterData));

            // Note: Since we removed an item, indices shift. 
            // Since this song was UNUSED, no specific grade updates are needed for *grades pointing to this song* (since there are none).
            // BUT, grades appearing *after* this index in other students might point to wrong songs?
            // Wait, checkSongUsage passed "moduleId". But master syllabus is shared.
            // If OTHER students use this song, we shouldn't delete it either!

            // checkSongUsage checks ALL students. So if usageCount == 0, NO ONE has evaluated it.
            // So it is safe to delete. 
            // EXCEPT: If other students have evaluated songs at HIGHER indices, those indices will shift down.
            // We need to update ALL students' evaluations where index > deleted_idx -> index - 1

            // UPDATE: index shifting for unused songs
            // Migration script usage implied we prefer "names" but we still use indices mostly.
            // Let's rely on the fact it is 0 usage, so *this* index is free.
            // But we MUST shift indices > idx in ALL students.

            const allStudents = JSON.parse(localStorage.getItem('studentsData') || '[]');
            allStudents.forEach(s => {
                const gKey = `student_grades_syllabus_${s.id}_mod_${moduleId}`;
                const rawG = localStorage.getItem(gKey);
                if (rawG) {
                    let gData = JSON.parse(rawG);
                    if (!Array.isArray(gData)) gData = [gData];
                    let mod = false;
                    gData.forEach(g => {
                        if (g.evaluatedSongs) {
                            g.evaluatedSongs = g.evaluatedSongs.map(i => i > idx ? i - 1 : i);
                            mod = true;
                        }
                    });
                    if (mod) localStorage.setItem(gKey, JSON.stringify(gData));
                }

                // Also update progress/mastery if any (though mastery implies learned... wait.
                // If a student "learned" a song (checkbox) but wasn't graded?
                // checkSongUsage checks GRADES. Does it check mastery?
                // The current checkSongUsage iterates grades. 
                // We should probably also check mastery or just shift mastery indices too.

                const pKey = `student_progress_syllabus_${s.id}_mod_${moduleId}`;
                const rawP = localStorage.getItem(pKey);
                if (rawP) {
                    let pData = JSON.parse(rawP);
                    if (pData.songMastery) {
                        pData.songMastery = pData.songMastery.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
                        localStorage.setItem(pKey, JSON.stringify(pData));
                    }
                }
            });

            renderModuleDetails();
        }
    });
};

window.restoreSong = function (idx) {
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[]}');

    if (masterData.songs[idx]) {
        masterData.songs[idx].isArchived = false;
        localStorage.setItem(masterKey, JSON.stringify(masterData));

        // Refresh views
        renderModuleDetails();
        renderArchivedSongsModal(); // Refresh modal
    }
};

window.moveSong = function (originalIdx, direction) {
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[]}');
    const songs = masterData.songs;

    // Initialize displayOrder if needed
    songs.forEach((s, i) => { if (s.displayOrder === undefined) s.displayOrder = i; });

    // Find the item being moved
    const item = songs[originalIdx];
    const currentOrder = item.displayOrder;

    // Sort to find neighbors in VISUAL order
    // We create a temporary array of indices sorted by displayOrder
    const sortedIndices = songs.map((s, i) => i).sort((a, b) => songs[a].displayOrder - songs[b].displayOrder);

    // Find item's position in the sorted list
    const sortedPos = sortedIndices.indexOf(originalIdx);
    if (sortedPos === -1) return;

    // Calculate generic target
    const targetPos = sortedPos + direction;
    if (targetPos < 0 || targetPos >= sortedIndices.length) return; // Out of bounds

    const targetIdx = sortedIndices[targetPos];
    const targetItem = songs[targetIdx];

    // SWAP displayOrder values
    const temp = item.displayOrder;
    item.displayOrder = targetItem.displayOrder;
    targetItem.displayOrder = temp;

    localStorage.setItem(masterKey, JSON.stringify(masterData));
    renderModuleDetails();
};

window.openArchivedSongsModal = function () {
    renderArchivedSongsModal();
    document.getElementById('archived-songs-modal').dataset.activeModuleId = currentSyllabusModuleId;
    document.getElementById('archived-songs-modal').style.display = 'block';
};

window.closeArchivedSongsModal = function () {
    document.getElementById('archived-songs-modal').style.display = 'none';
};

window.renderArchivedSongsModal = function () {
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[]}');
    const songs = masterData.songs || [];

    const container = document.getElementById('archived-songs-list');

    const archivedItems = songs.map((s, i) => ({ ...s, idx: i })).filter(s => s.isArchived);

    if (archivedItems.length === 0) {
        container.innerHTML = '<div style="color:#aaa; text-align:center; padding:20px;">No hay canciones archivadas.</div>';
        return;
    }

    container.innerHTML = archivedItems.map(s => `
        <div class="archived-song-item">
            <div class="archived-song-info">
                <i class="ri-lock-2-line archived-icon"></i>
                <span>${s.title}</span>
                <span style="font-size:0.75rem; background:#eee; padding:2px 6px; border-radius:4px;">${s.category || 'famosa'}</span>
            </div>
            <button class="btn-restore" onclick="restoreSong(${s.idx})">
                <i class="ri-login-circle-line"></i> Restaurar
            </button>
        </div>
    `).join('');
};

window.goToGradeFromSong = function (idx) {
    // 1. Switch to Grades tab
    switchProfileTab('calificacion');

    const isEx = typeof idx === 'string' && idx.startsWith('ext_');
    const actualIdx = isEx ? parseInt(idx.replace('ext_', '')) : parseInt(idx);

    const key = `student_grades_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
    const gradesArray = JSON.parse(localStorage.getItem(key) || '[]');

    let evaluationIndex = -1;

    if (isEx) {
        // Find by title matching customSongs
        const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${currentSyllabusModuleId}`;
        const progressData = JSON.parse(localStorage.getItem(progressKey));
        const extSong = progressData.externalSongs[actualIdx];
        const searchTitle = extSong.title.trim().toLowerCase();

        evaluationIndex = gradesArray.findIndex(g => (g.customSongs || []).some(cs => cs.trim().toLowerCase() === searchTitle));
    } else {
        evaluationIndex = gradesArray.findIndex(g => (g.evaluatedSongs || []).includes(actualIdx));
    }

    if (evaluationIndex !== -1) {
        // 3. Open detailed report
        openDetailedReport(`${currentSyllabusModuleId}-${evaluationIndex}`);
    } else {
        alert("No se encontró una evaluación específica para esta canción.");
    }
};

// ========== DATA MIGRATION ==========
window.migrateGradesToSnapshot = function () {
    console.log("Starting Migration: Snapshotted Song Names...");
    const students = JSON.parse(localStorage.getItem('studentsData') || '[]');
    let updatedCount = 0;

    students.forEach(student => {
        // Check all modules 1-6
        for (let m = 1; m <= 6; m++) {
            const key = `student_grades_syllabus_${student.id}_mod_${m}`;
            const raw = localStorage.getItem(key);
            if (!raw) continue;

            let grades = JSON.parse(raw);
            if (!Array.isArray(grades)) grades = [grades];

            let modified = false;

            // Get Master Syllabus for this context (Assuming Piano if not set, or student instrument)
            // Note: Grades might have 'instrument' property, use that.

            grades.forEach(g => {
                // If already has snapshot, skip
                if (g.evaluatedSongTitles) return;

                const instrument = g.instrument || student.instrumento || 'Piano';
                const masterKey = `master_syllabus_${instrument}_mod_${m}`;
                const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[]}');
                const moduleSongs = masterData.songs || [];

                // Resolve Indices -> Names
                if (g.evaluatedSongs && g.evaluatedSongs.length > 0) {
                    g.evaluatedSongTitles = g.evaluatedSongs.map(idx => moduleSongs[idx]?.title || "Canción Eliminada");
                    modified = true;
                    updatedCount++;
                } else {
                    g.evaluatedSongTitles = []; // Empty array if no songs
                    modified = true; // Still mark modified to prevent re-scan
                }
            });

            if (modified) {
                localStorage.setItem(key, JSON.stringify(grades));
            }
        }
    });

    if (updatedCount > 0) {
        console.log(`Migration Complete: Updated ${updatedCount} evaluations with song name snapshots.`);
    } else {
        console.log("Migration Complete: No updates needed.");
    }
};

window.archiveSong = function (idx, skipConfirm = false) {
    const doArchive = () => {
        const instrument = getStudentInstrument();
        const masterKey = `master_syllabus_${instrument}_mod_${currentSyllabusModuleId}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[]}');

        if (masterData.songs[idx]) {
            masterData.songs[idx].isArchived = true;
            localStorage.setItem(masterKey, JSON.stringify(masterData));
            renderModuleDetails();
        }
    };

    if (skipConfirm) {
        doArchive();
        return;
    }

    showCustomConfirm({
        title: 'Archivar Canción',
        message: 'La canción se ocultará de la lista principal pero las notas antiguas se mantendrán. ¿Deseas continuar?',
        iconHtml: '<i class="ri-archive-line"></i>',
        iconColor: '#f59e0b',
        iconBg: '#fffbeb',
        confirmText: 'Archivar',
        confirmClass: 'btn-primary',
        onConfirm: doArchive
    });
};
// ==========================================
// SIMPLIFIED ASSIGNMENT TAB LOGIC
// ==========================================

function renderAssignmentsTab() {
    if (!currentStudentId) return;

    const container = document.getElementById('assignments-modules-container');
    if (!container) return;

    const instrument = getStudentInstrument();
    let html = '';

    for (let m = 1; m <= 6; m++) {
        const masterKey = `master_syllabus_${instrument}_mod_${m}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[], "songs":[]}');

        const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${m}`;
        const progressData = JSON.parse(localStorage.getItem(progressKey) || '{"mastery":[], "grades":{}, "taskDueDates":{}, "taskDetails":{}}');

        const assignments = masterData.topics
            .map((t, idx) => ({ ...t, originalIdx: idx }))
            .filter(t => t.isTask || t.isExam);

        const isActive = (parseInt(m) === parseInt(window.currentAssignmentModuleOpen));

        html += `
            <div class="assignment-mod-accordion ${isActive ? 'active' : ''}" id="mod-accordion-${m}">
                <div class="assignment-mod-header" onclick="toggleModuleAssignment(${m})">
                    <span><span class="mod-badge">Módulo ${m}</span> Tareas y Exámenes</span>
                    <i class="ri-arrow-down-s-line"></i>
                </div>
                <div class="assignment-mod-content">
                    <div class="table-responsive">
                        <table class="syllabus-table">
                            <thead>
                                <tr>
                                    <th style="width: 120px;">Tipo</th>
                                    <th>Título</th>
                                    <th style="width: 160px;">Fecha de Entrega</th>
                                    <th style="width: 180px;">Estado</th>
                                    <th style="width: 100px; text-align: center;">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderAssignmentRows(m, assignments, progressData)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function renderAssignmentRows(modId, assignments, progressData) {
    if (assignments.length === 0) {
        return `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#999;">No hay tareas ni exámenes configurados.</td></tr>`;
    }

    return assignments.map(item => {
        const idx = item.originalIdx;
        const isLearned = (progressData.mastery || []).includes(idx);
        const grade = (progressData.grades || {})[idx];
        const dueDate = (progressData.taskDueDates || {})[idx] || '';

        let displayGrade = grade || '-';

        let typeIcon = item.isExam
            ? `<i class="ri-medal-line" style="color:var(--primary-color);"></i> ${item.examType ? `<span style="background:#f59e0b; color:#fff; padding:2px 8px; border-radius:4px; font-size:0.75rem; margin-left:4px; font-weight:600;">${item.examType}</span>` : 'Examen'}`
            : `<i class="ri-task-line" style="color:#2563eb;"></i> ${item.taskType || 'Tarea'}`;

        let statusBadge = isLearned
            ? `<span class="status-badge success">Calificado (${displayGrade})</span>`
            : `<span class="status-badge pending">Pendiente</span>`;

        if (!isLearned && dueDate) {
            const today = new Date().toISOString().split('T')[0];
            if (dueDate < today) statusBadge = `<span class="status-badge missing">Vencido</span>`;
        }

        return `
            <tr>
                <td>${typeIcon}</td>
                <td style="font-weight:500;">${item.title}</td>
                <td>
                    <input type="date" class="input-minimal" value="${dueDate}" 
                           onchange="updateTaskDueDateInMod(${modId}, ${idx}, this.value)" 
                           style="width:140px; font-size:0.9rem;">
                </td>
                <td>${statusBadge}</td>
                <td style="text-align:center;">
                    <div style="display:flex; justify-content:center; gap:0.4rem;">
                        <button class="btn-secondary btn-sm" onclick="showAssignmentDetailInModule(${modId}, ${idx})" title="Entrar">
                            <i class="ri-eye-line"></i> Entrar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleModuleAssignment(m) {
    const acc = document.getElementById(`mod-accordion-${m}`);
    const wasActive = acc.classList.contains('active');

    // Close others
    document.querySelectorAll('.assignment-mod-accordion').forEach(a => a.classList.remove('active'));

    if (!wasActive) {
        acc.classList.add('active');
        window.currentAssignmentModuleOpen = m;
    } else {
        window.currentAssignmentModuleOpen = null;
    }
}


function updateTaskDueDateInMod(modId, topicIdx, date) {
    const capturedId = document.getElementById('assignment-student-id')?.value || currentStudentId;
    const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
    if (!progressData.taskDueDates) progressData.taskDueDates = {};
    progressData.taskDueDates[topicIdx] = date;
    localStorage.setItem(progressKey, JSON.stringify(progressData));
}

// ==========================================
// ASSIGNMENT DETAIL VIEW (MODULE AWARE)
// ==========================================

function showAssignmentDetailInModule(modId, topicIdx) {
    const capturedId = currentStudentId;
    const assignmentField = document.getElementById('assignment-student-id');
    if (assignmentField) assignmentField.value = capturedId;

    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey));
    const topic = masterData.topics[topicIdx];

    const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey));

    if (!progressData.taskDetails) progressData.taskDetails = {};
    const details = progressData.taskDetails[topicIdx] || { description: "", images: [] };

    document.getElementById('detail-topic-title').innerHTML = `${topic.isExam ? '<i class="ri-medal-line"></i> ' : ''}${topic.title}`;
    document.getElementById('detail-topic-content').textContent = topic.content || '-';
    document.getElementById('detail-topic-evidence').textContent = topic.evidence || '-';
    document.getElementById('detail-topic-achievement').textContent = topic.achievement || '-';

    // Render Subtasks
    renderSubtasksInMod(modId, topicIdx);

    // Dynamic Header Renaming for Exams
    const subtaskHeader = document.getElementById('subtasks-header-title');
    const subtaskBtn = document.getElementById('btn-add-subtask-label');

    if (topic.isExam && (topic.title.toLowerCase().includes('parcial') || topic.title.toLowerCase().includes('final'))) {
        if (subtaskHeader) subtaskHeader.innerHTML = '<i class="ri-file-paper-2-line"></i> Examen Teórico';
        if (subtaskBtn) subtaskBtn.innerHTML = '<i class="ri-add-line"></i> Agregar Examen Teórico';
    } else {
        if (subtaskHeader) subtaskHeader.innerHTML = '<i class="ri-list-check"></i> Subtareas y Recursos';
        if (subtaskBtn) subtaskBtn.innerHTML = '<i class="ri-add-line"></i> Agregar Subtarea';
    }

    const container = document.getElementById('detail-action-container');
    const statusDiv = document.getElementById('detail-grade-status');
    const currentGrade = (progressData.grades || {})[topicIdx];
    const isLearned = (progressData.mastery || []).includes(parseInt(topicIdx));

    const hasSubtasks = details.subtasks && details.subtasks.length > 0;

    if (isLearned) {
        const label = hasSubtasks ? 'PROMEDIO SUBTAREAS' : 'CALIFICADO';
        statusDiv.innerHTML = `<div class="grade-circle-large">${currentGrade}</div><span style="display:block; margin-top:0.5rem; color:#10b981; font-weight:bold;">${label}</span>`;
    } else {
        statusDiv.innerHTML = `<div class="grade-circle-large empty">-</div><span style="display:block; margin-top:0.5rem; color:#999;">PENDIENTE</span>`;
    }

    if (topic.isExam) {
        container.innerHTML = `
            <button class="btn-primary full-width" onclick="openExamGradeModalInMod(${modId}, ${topicIdx})">
                <i class="ri-medal-line"></i> Ver Nota / Detalles
            </button>
        `;
    } else {
        container.innerHTML = `
            <div style="font-size: 0.85rem; color: #64748b; background: #f1f5f9; padding: 1rem; border-radius: 8px; text-align: left;">
                <i class="ri-information-line"></i> La calificación de esta tarea se basa en el promedio de sus subtareas. 
                Utiliza el botón <i class="ri-list-check-2"></i> en cada subtarea para calificar con rúbrica.
            </div>
        `;
    }

    document.getElementById('assignments-list-view').style.display = 'none';
    document.getElementById('assignment-detail-view').style.display = 'block';

    window.currentDetailModId = modId;
    window.currentDetailTopicIdx = topicIdx;
}
// End of showAssignmentDetailInModule

function hideAssignmentDetail() {
    document.getElementById('assignment-detail-view').style.display = 'none';
    document.getElementById('assignments-list-view').style.display = 'block';
    renderAssignmentsTab();
}

window.goToTaskDetail = function (modId, topicIdx) {
    switchProfileTab('asignacion');
    window.currentAssignmentModuleOpen = modId;
    renderAssignmentsTab(); // Ensure it reflects the right module
    showAssignmentDetailInModule(modId, topicIdx);
};


// ==========================================
// SUBTASKS LOGIC
// ==========================================

let currentSubtaskImages = [];

window.openSubtaskForm = function (subtaskIdx = null) {
    const modId = window.currentDetailModId;
    const topicIdx = window.currentDetailTopicIdx;
    const capturedId = currentStudentId;
    document.getElementById('subtask-student-id').value = capturedId;

    document.getElementById('subtask-edit-index').value = subtaskIdx !== null ? subtaskIdx : '';

    // EXAM MODE CHECK
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[]}');
    const topic = masterData.topics[topicIdx];
    const isExam = topic.isExam && (topic.title.toLowerCase().includes('parcial') || topic.title.toLowerCase().includes('final'));

    const modalTitle = document.getElementById('subtask-modal-title');
    const titleLabel = document.getElementById('subtask-title-label');
    const extrasContainer = document.getElementById('subtask-extras-container');
    const examOptionsContainer = document.getElementById('subtask-exam-options-container');
    const theoryHint = document.getElementById('subtask-theory-only-hint');

    if (isExam) {
        modalTitle.innerHTML = subtaskIdx !== null ? '<i class="ri-edit-line"></i> Editar Examen Teórico' : '<i class="ri-add-line"></i> Nuevo Examen Teórico';
        if (titleLabel) titleLabel.textContent = "TÍTULO DEL EXAMEN TEÓRICO";
        if (extrasContainer) extrasContainer.style.display = 'none';
        if (examOptionsContainer) examOptionsContainer.style.display = 'block';

        // Dynamic Hint Text
        if (theoryHint) {
            const isPartial = topic.title.toLowerCase().includes('parcial');
            const typeStr = isPartial ? 'Nota Parcial' : 'Nota Final';
            theoryHint.innerHTML = `Si marcas esta opción, la nota que pongas aquí será la <b>${typeStr}</b> del módulo.`;
        }
    } else {
        modalTitle.innerHTML = subtaskIdx !== null ? '<i class="ri-edit-line"></i> Editar Subtarea' : '<i class="ri-add-line"></i> Nueva Subtarea';
        if (titleLabel) titleLabel.textContent = "Título de la Subtarea";
        if (extrasContainer) extrasContainer.style.display = 'block';
        if (examOptionsContainer) examOptionsContainer.style.display = 'none';
    }

    const progressKey = `student_progress_syllabus_${currentStudentId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
    const subtask = (subtaskIdx !== null && progressData.taskDetails?.[topicIdx]?.subtasks) ? progressData.taskDetails[topicIdx].subtasks[subtaskIdx] : null;

    document.getElementById('subtask-title').value = subtask ? subtask.title : '';
    document.getElementById('subtask-description').value = subtask ? subtask.description : '';
    document.getElementById('subtask-video').value = subtask ? subtask.video : '';

    // Populate song selector
    const songSelect = document.getElementById('subtask-song-link');
    if (songSelect) {
        songSelect.innerHTML = '<option value="">-- Sin canción vinculada --</option>';

        const instrument = getStudentInstrument();
        const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[]}');
        // ... (rest of song population logic)
    }

    // Auto-fill Title if New Exam
    if (subtaskIdx === null && isExam) {
        const typeStr = topic.title.toLowerCase().includes('parcial') ? 'Parcial' : 'Final';
        document.getElementById('subtask-title').value = `Examen Teórico ${typeStr}`;
        document.getElementById('subtask-description').value = `Evaluación teórica correspondiente al Examen ${typeStr}.`;
    }

    document.getElementById('subtask-form-modal').style.display = 'flex';
};

window.goToPracticeGradingFromTheory = function () {
    // Capture the grade from the temp input BEFORE closing (REMOVED: User requested removal)
    const theoryVal = '';

    closeSubtaskForm();


    // Determine exam type based on current topic
    const modId = window.currentDetailModId;

    // CRITICAL: Sync global module ID so showGradeEditor loads the correct data
    window.currentSyllabusModuleId = modId;

    const topicIdx = window.currentDetailTopicIdx;
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[]}');
    const topic = masterData.topics[topicIdx];

    const isPartial = topic.title.toLowerCase().includes('parcial');
    const targetType = isPartial ? 'partial' : 'final';

    // CHECK FOR EXISTING EVALUATION
    const capturedId = document.getElementById('assignment-student-id')?.value || currentStudentId; // Use assignment ID context
    const gradesKey = `student_grades_syllabus_${capturedId}_mod_${modId}`;
    let gradesArray = [];
    try {
        const raw = localStorage.getItem(gradesKey);
        if (raw) gradesArray = JSON.parse(raw);
        if (!Array.isArray(gradesArray)) gradesArray = [gradesArray];
    } catch (e) { }

    const existingIdx = gradesArray.findIndex(g => g.examType === targetType);

    // If exists, open in EDIT mode. If not, open in NEW mode.
    // ALSO PASS CAPTURED ID and MODULE ID to ensure we edit the correct student's data in the correct module context
    showGradeEditor(existingIdx !== -1 ? existingIdx : null, capturedId, modId);

    // Force set the selector
    const typeSelector = document.getElementById('grade-exam-type');
    const theoryScoreInput = document.getElementById('grade-theory-score');
    const moduleSelector = document.getElementById('grade-module-selector');

    if (moduleSelector && modId) {
        moduleSelector.value = modId;
        // Trigger generic change event if needed, or just ensure songs are rendered
        if (window.renderModuleSongsSelector) window.renderModuleSongsSelector([]);
    }

    if (typeSelector) {
        typeSelector.value = isPartial ? 'partial' : 'final';
        // Trigger auto-fill logic manually since we changed value programmatically
        if (window.autoFillTheoreticalGrade) window.autoFillTheoreticalGrade();
    }

    // Auto-fill the theory grade from the subtask input
    // This solves the issue of the grade not carrying over
    // We set it AFTER autoFillTheoreticalGrade because that function might overwrite it
    if (theoryScoreInput && theoryVal) {
        theoryScoreInput.value = theoryVal;
    }


};



window.closeSubtaskForm = function () {
    document.getElementById('subtask-form-modal').style.display = 'none';
};

window.triggerSubtaskImageUpload = function () {
    document.getElementById('subtask-image-input').click();
};

window.handleSubtaskImageUpload = function (input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentSubtaskImages.push(e.target.result);
            renderSubtaskImagesPreview();
        };
        reader.readAsDataURL(input.files[0]);
    }
};

function renderSubtaskImagesPreview() {
    const container = document.getElementById('subtask-images-preview');
    if (!container) return;
    container.innerHTML = currentSubtaskImages.map((img, i) => `
        <div style="width:60px; height:60px; position:relative; border-radius:4px; overflow:hidden; border:1px solid #ddd;">
            <img src="${img}" style="width:100%; height:100%; object-fit:cover;">
            <button onclick="removeSubtaskImagePreview(${i})" style="position:absolute; top:0; right:0; background:rgba(255,0,0,0.7); color:#fff; border:none; width:18px; height:18px; font-size:12px; cursor:pointer;">&times;</button>
        </div>
    `).join('');
}

window.removeSubtaskImagePreview = function (idx) {
    currentSubtaskImages.splice(idx, 1);
    renderSubtaskImagesPreview();
};

window.saveSubtask = function () {
    const modId = window.currentDetailModId;
    const topicIdx = window.currentDetailTopicIdx;
    const editIdx = document.getElementById('subtask-edit-index').value;

    const title = document.getElementById('subtask-title').value.trim();
    if (!title) return alert('El título es obligatorio');

    const capturedId = document.getElementById('subtask-student-id').value || currentStudentId;
    const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{"taskDetails":{}}');

    // If editing, preserve the existing grade and rubric
    let existingGrade = 0;
    let existingRubric = [];
    let existingRubricComment = '';

    if (editIdx !== '' && progressData.taskDetails?.[topicIdx]?.subtasks?.[parseInt(editIdx)]) {
        const oldSt = progressData.taskDetails[topicIdx].subtasks[parseInt(editIdx)];
        existingGrade = oldSt.grade || 0;
        existingRubric = oldSt.rubric || [];
        existingRubricComment = oldSt.rubricComment || '';
    }

    const subtaskData = {
        title: title,
        description: document.getElementById('subtask-description').value.trim(),
        video: document.getElementById('subtask-video').value.trim(),
        linkedSongIdx: document.getElementById('subtask-song-link') ? document.getElementById('subtask-song-link').value : '',
        images: currentSubtaskImages,
        grade: existingGrade,
        rubric: existingRubric,
        rubricComment: existingRubricComment
    };

    if (!progressData.taskDetails) progressData.taskDetails = {};
    if (!progressData.taskDetails[topicIdx]) progressData.taskDetails[topicIdx] = { subtasks: [] };
    if (!progressData.taskDetails[topicIdx].subtasks) progressData.taskDetails[topicIdx].subtasks = [];

    if (editIdx !== '') {
        progressData.taskDetails[topicIdx].subtasks[parseInt(editIdx)] = subtaskData;
    } else {
        progressData.taskDetails[topicIdx].subtasks.push(subtaskData);
    }

    localStorage.setItem(progressKey, JSON.stringify(progressData));

    // CHECK FOR "THEORY ONLY" GRADING (EXAMS)
    const isTheoryOnly = document.getElementById('subtask-theory-only')?.checked;

    if (isTheoryOnly && subtaskData.grade > 0) {
        // Auto-grade as Final Exam Score
        const instrument = getStudentInstrument();
        const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
        const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"topics":[]}');
        const topic = masterData.topics[topicIdx];

        if (topic.isExam) {
            // Create/Update Main Evaluation
            const evalKey = `student_grades_syllabus_${capturedId}_mod_${modId}`;
            let evaluations = JSON.parse(localStorage.getItem(evalKey) || '[]');
            if (!Array.isArray(evaluations)) evaluations = [evaluations];

            const newEval = {
                examTitle: topic.title.toUpperCase(),
                evalSubtitle: `Examen Teórico (Solo Teoría)`,
                date: new Date().toISOString().split('T')[0],
                instrument: instrument,
                moduleId: parseInt(modId),
                theoreticalGrade: subtaskData.grade.toString(),
                rubric: {}, // Empty rubric since it's theory only
                globalComment: "Calificado automáticamente desde Examen Teórico (Sin Práctica)",
                customSongs: [],
                evaluatedSongs: [],
                isSubtaskEval: false, // This is a MAIN eval now
                taskType: topic.taskType || 'Examen',
                examType: topic.title.toLowerCase().includes('parcial') ? 'partial' : 'final'
            };

            // Remove existing main eval for this exam type if exists to avoid dupes?
            // Better to update if exists.
            const existingEvalIdx = evaluations.findIndex(e =>
                e.moduleId === parseInt(modId) &&
                e.examType === newEval.examType &&
                !e.isSubtaskEval // Only main evals
            );

            if (existingEvalIdx !== -1) {
                // Update existing
                evaluations[existingEvalIdx] = { ...evaluations[existingEvalIdx], ...newEval };
                console.log('Updated existing main exam evaluation.');
            } else {
                // Create new
                evaluations.push(newEval);
                console.log('Created new main exam evaluation.');
            }

            localStorage.setItem(evalKey, JSON.stringify(evaluations));

            // Update Syllabus Progress (Mastery)
            if (!progressData.grades) progressData.grades = {};
            progressData.grades[topicIdx] = subtaskData.grade.toFixed(2);
            if (!progressData.mastery.includes(topicIdx)) {
                progressData.mastery.push(topicIdx);
            }
            localStorage.setItem(progressKey, JSON.stringify(progressData));

            alert('¡Examen Calificado! La nota teórica se ha guardado como Nota Final del Módulo.');
        }
    }

    // Automatically recalculate main task grade (only relevant for normal tasks, but harmless here)
    updateMainTaskGradeFromSubtasks(modId, topicIdx);

    closeSubtaskForm();
    renderSubtasksInMod(modId, topicIdx);
};

window.renderSubtasksInMod = function (modId, topicIdx) {
    const container = document.getElementById('subtasks-container');
    if (!container) return;
    const capturedId = document.getElementById('assignment-student-id')?.value || currentStudentId;
    const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
    const subtasks = progressData.taskDetails?.[topicIdx]?.subtasks || [];

    // Master list for song titles
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[]}');

    if (subtasks.length === 0) {
        container.innerHTML = `<div class="empty-state-minimal" style="text-align: center; padding: 2rem; color: #999; border: 1px dashed #ccc; border-radius: 8px;">No hay subtareas agregadas aún.</div>`;
        return;
    }

    container.innerHTML = subtasks.map((st, i) => `
        <div class="subtask-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; position: relative; transition: all 0.2s ease;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <h5 style="margin: 0; font-size: 1.1rem; color: #1e293b;">${st.title}</h5>
                    <span class="badge" style="background: #0f172a; color: #fbbf24; border: 1px solid #fbbf24; font-weight: 900; padding: 4px 12px; border-radius: 8px; font-size: 0.9rem; min-width: 50px; text-align: center; box-shadow: 0 4px 6px rgba(15, 23, 42, 0.2);">
                        ${st.grade !== undefined && st.grade > 0 ? st.grade.toFixed(2) : '-'}
                    </span>
                </div>
                <div class="subtask-actions" style="display: flex; gap: 5px;">
                    <button class="btn-icon" onclick="openSubtaskView(${i})" title="Visualizar"><i class="ri-eye-line"></i></button>
                    ${(() => {
            const isExam = masterData.topics[topicIdx] && masterData.topics[topicIdx].isExam;
            if (!isExam) return '';

            // HIDE check
            const isTheoryOnly = st.grade > 0 && (!st.rubric || (Array.isArray(st.rubric) ? st.rubric.length === 0 : Object.keys(st.rubric).length === 0));
            if (isTheoryOnly) return '';

            // CHECK IF ALREADY GRADED (Main Evaluation)
            const gradesKey = `student_grades_syllabus_${capturedId}_mod_${modId}`;
            let gradesArray = [];
            try {
                const raw = localStorage.getItem(gradesKey);
                if (raw) gradesArray = JSON.parse(raw);
                if (!Array.isArray(gradesArray)) gradesArray = [gradesArray];
            } catch (e) { }

            // Determine expected type
            const isPartial = masterData.topics[topicIdx].title.toLowerCase().includes('parcial');
            const targetType = isPartial ? 'partial' : 'final';

            const isGraded = gradesArray.some(g => g.examType === targetType);

            if (isGraded) {
                return `<button class="btn-icon" onclick="goToPracticeGradingFromTheory()" title="Examen Calificado (Click para Editar)" style="color: #10b981; font-weight:bold; font-size: 1.2rem;"><i class="ri-checkbox-circle-fill"></i></button>`;
            } else {
                return `<button class="btn-icon" onclick="goToPracticeGradingFromTheory()" title="Calificar Práctica" style="color: #f59e0b; font-weight:bold; font-size: 1.1rem;"><i class="ri-medal-fill"></i></button>`;
            }
        })()}
                    <button class="btn-icon" onclick="openSubtaskForm(${i})" title="Editar"><i class="ri-edit-line"></i></button>
                    <button class="btn-icon" onclick="openTaskRubricModalInMod(${modId}, ${topicIdx}, ${i})" title="Calificar con Rúbrica" style="color: var(--primary-color);"><i class="ri-list-check-2"></i></button>
                    ${st.grade !== undefined && st.grade > 0 ? `<button class="btn-icon" onclick="openSubtaskGradeDetail(${modId}, ${topicIdx}, ${i})" title="Ver Detalle de Nota" style="color: #0f172a;"><i class="ri-article-line"></i></button>` : ''}
                    <button class="btn-icon" onclick="deleteSubtaskInMod(${modId}, ${topicIdx}, ${i})" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
            <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 1rem; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${st.description || 'Sin descripción'}</p>
            
            <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                ${st.video ? `
                    <div style="display: flex; align-items: center; gap: 4px; color: #dc2626; font-size: 0.85rem; font-weight: 500;">
                        <i class="ri-video-line"></i> Video
                    </div>
                ` : ''}

                ${st.linkedSongIdx !== undefined && st.linkedSongIdx !== '' ? (() => {
            let songTitle = 'Canción';
            if (typeof st.linkedSongIdx === 'string' && st.linkedSongIdx.startsWith('ext_')) {
                const extIdx = parseInt(st.linkedSongIdx.replace('ext_', ''));
                const progressKey_ext = `student_progress_syllabus_${capturedId}_mod_${modId}`;
                const progressData_ext = JSON.parse(localStorage.getItem(progressKey_ext) || '{}');
                songTitle = (progressData_ext.externalSongs || [])[extIdx]?.title || 'Canción Ext.';
            } else {
                songTitle = masterData.songs[st.linkedSongIdx]?.title || 'Canción';
            }
            return `
                        <div style="display: flex; align-items: center; gap: 4px; color: #4338ca; font-size: 0.85rem; font-weight: 500; background: #eef2ff; padding: 2px 8px; border-radius: 4px; border: 1px solid #c7d2fe;">
                            <i class="ri-music-2-line"></i> ${songTitle}
                        </div>
                    `;
        })() : ''}
                
                ${st.images && st.images.length > 0 ? `
                    <div style="display: flex; gap: 4px;">
                        ${st.images.slice(0, 3).map(img => `
                            <div style="width: 24px; height: 24px; border-radius: 4px; overflow: hidden; border: 1px solid #cbd5e1;">
                                <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        `).join('')}
                        ${st.images.length > 3 ? `<span style="font-size: 0.75rem; color: #94a3b8;">+${st.images.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
};

window.deleteSubtaskInMod = function (modId, topicIdx, subtaskIdx) {
    if (!confirm('¿Eliminar esta subtarea y sus recursos?')) return;
    const capturedId = document.getElementById('assignment-student-id')?.value || currentStudentId;
    const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey));
    if (progressData.taskDetails?.[topicIdx]?.subtasks) {
        progressData.taskDetails[topicIdx].subtasks.splice(subtaskIdx, 1);
        localStorage.setItem(progressKey, JSON.stringify(progressData));

        // Recalculate average after delete
        updateMainTaskGradeFromSubtasks(modId, topicIdx);

        renderSubtasksInMod(modId, topicIdx);
    }
};

window.updateMainTaskGradeFromSubtasks = function (modId, topicIdx) {
    const capturedId = document.getElementById('assignment-student-id')?.value || currentStudentId;
    const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
    const subtasks = progressData.taskDetails?.[topicIdx]?.subtasks || [];

    const gradedSubtasks = subtasks.filter(st => st.grade !== undefined && st.grade > 0);
    const statusDiv = document.getElementById('detail-grade-status');

    if (gradedSubtasks.length > 0) {
        let total = 0;
        gradedSubtasks.forEach(st => total += (st.grade || 0));
        const avg = (total / gradedSubtasks.length).toFixed(2);

        if (!progressData.grades) progressData.grades = {};
        progressData.grades[topicIdx] = parseFloat(avg);

        if (!progressData.mastery) progressData.mastery = [];
        const idxNum = parseInt(topicIdx);
        if (!progressData.mastery.includes(idxNum)) {
            progressData.mastery.push(idxNum);
        }

        localStorage.setItem(progressKey, JSON.stringify(progressData));

        if (statusDiv) {
            statusDiv.innerHTML = `<div class="grade-circle-large">${avg}</div><span style="display:block; margin-top:0.5rem; color:#10b981; font-weight:bold;">PROMEDIO SUBTAREAS</span>`;
        }
    } else {
        // No graded subtasks left, return to pending
        if (progressData.grades) delete progressData.grades[topicIdx];
        if (progressData.mastery) {
            const mIdx = progressData.mastery.indexOf(parseInt(topicIdx));
            if (mIdx !== -1) progressData.mastery.splice(mIdx, 1);
        }

        localStorage.setItem(progressKey, JSON.stringify(progressData));

        if (statusDiv) {
            statusDiv.innerHTML = `<div class="grade-circle-large empty">-</div><span style="display:block; margin-top:0.5rem; color:#999;">PENDIENTE</span>`;
        }
    }

    // Refresh syllabus table if visible
    if (typeof renderModuleDetails === 'function') renderModuleDetails();
};

window.openSubtaskView = function (subtaskIdx) {
    const modId = window.currentDetailModId;
    const topicIdx = window.currentDetailTopicIdx;
    const capturedId = document.getElementById('assignment-student-id')?.value || currentStudentId;
    const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
    const subtask = progressData.taskDetails[topicIdx].subtasks[subtaskIdx];

    document.getElementById('view-subtask-title').textContent = subtask.title;
    document.getElementById('view-subtask-description').textContent = subtask.description || 'Sin descripción';

    // Linked Song
    const viewSongLink = document.getElementById('view-subtask-song-link');
    if (viewSongLink) {
        if (subtask.linkedSongIdx !== undefined && subtask.linkedSongIdx !== '') {
            let songTitle = 'Canción no encontrada';
            const instrument = getStudentInstrument();
            const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
            const masterData = JSON.parse(localStorage.getItem(masterKey) || '{"songs":[]}');

            if (typeof subtask.linkedSongIdx === 'string' && subtask.linkedSongIdx.startsWith('ext_')) {
                const extIdx = parseInt(subtask.linkedSongIdx.replace('ext_', ''));
                const progressKey_ext = `student_progress_syllabus_${capturedId}_mod_${modId}`;
                const progressData_ext = JSON.parse(localStorage.getItem(progressKey_ext) || '{}');
                songTitle = (progressData_ext.externalSongs || [])[extIdx]?.title || 'Canción Ext. no encontrada';
            } else {
                songTitle = masterData.songs[subtask.linkedSongIdx]?.title || 'Canción no encontrada';
            }

            viewSongLink.style.display = 'block';
            viewSongLink.innerHTML = `
                <div style="background: #eef2ff; border: 1px solid #c7d2fe; padding: 0.75rem; border-radius: 8px; display: flex; align-items: center; gap: 10px; color: #4338ca;">
                    <i class="ri-music-2-line" style="font-size: 1.25rem;"></i>
                    <div>
                        <small style="display: block; font-weight: 700; text-transform: uppercase; font-size: 0.7rem; opacity: 0.8;">Canción Vinculada</small>
                        <span style="font-weight: 600;">${songTitle}</span>
                    </div>
                </div>
            `;
        } else {
            viewSongLink.style.display = 'none';
        }
    }

    // Grade Pill
    const gradePill = document.getElementById('view-subtask-grade-pill');
    if (subtask.grade !== undefined) {
        gradePill.innerHTML = `<span style="background: var(--primary-color); color: #fff; padding: 5px 15px; border-radius: 30px; font-weight: 800; font-size: 1.2rem; box-shadow: 0 4px 10px rgba(246,176,0,0.3);">Nota: ${subtask.grade}</span>`;
    } else {
        gradePill.innerHTML = '';
    }

    // Media
    const videoContainer = document.getElementById('view-subtask-video-container');
    if (subtask.video) {
        videoContainer.innerHTML = `
            <div style="background: #f1f5f9; padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 10px;">
                <i class="ri-video-chat-line" style="font-size: 1.5rem; color: #ef4444;"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #1e293b;">Video de Apoyo</div>
                    <a href="${subtask.video}" target="_blank" style="font-size: 0.9rem; color: #3b82f6; text-decoration: underline; word-break: break-all;">${subtask.video}</a>
                </div>
                <a href="${subtask.video}" target="_blank" class="btn-primary btn-sm">Abrir Link</a>
            </div>
        `;
    } else {
        videoContainer.innerHTML = '';
    }

    const imagesGrid = document.getElementById('view-subtask-images-grid');
    if (subtask.images && subtask.images.length > 0) {
        imagesGrid.innerHTML = subtask.images.map(img => `
            <div onclick="openFullscreenImg('${img}')" style="aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; cursor: pointer; border: 1px solid #e2e8f0; transition: transform 0.2s;">
                <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        `).join('');
    } else {
        imagesGrid.innerHTML = '';
    }

    document.getElementById('subtask-view-modal').style.display = 'block';
};

window.closeSubtaskView = function () {
    document.getElementById('subtask-view-modal').style.display = 'none';
};

window.openFullscreenImg = function (src) {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out;";
    overlay.onclick = () => overlay.remove();
    const img = document.createElement('img');
    img.src = src;
    img.style = "max-width:95%; max-height:95%; object-fit:contain; border-radius:8px; box-shadow:0 0 30px rgba(0,0,0,0.5);";
    overlay.appendChild(img);
    document.body.appendChild(overlay);
};


// ==========================================
// TASK RUBRIC LOGIC (MODULE AWARE)
// ==========================================

window.openTaskRubricModalInMod = function (modId, topicIdx, subtaskIdx = null) {
    const capturedId = currentStudentId;
    document.getElementById('rubric-student-id').value = capturedId;
    const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
    let savedRubric = null;
    let savedComment = '';

    if (subtaskIdx !== null) {
        const st = progressData.taskDetails?.[topicIdx]?.subtasks?.[subtaskIdx];
        savedRubric = st?.rubric;
        savedComment = st?.rubricComment || '';
        document.getElementById('rubric-subtask-idx').value = subtaskIdx;
    } else {
        savedRubric = progressData.taskDetails?.[topicIdx]?.rubric;
        savedComment = progressData.taskDetails?.[topicIdx]?.rubricComment || '';
        document.getElementById('rubric-subtask-idx').value = '';
    }

    document.getElementById('rubric-task-idx').value = `${modId}-${topicIdx}`;
    document.getElementById('clear-rubric-btn').style.display = savedRubric ? 'flex' : 'none';

    const container = document.getElementById('rubric-items-container');
    container.innerHTML = '';

    // If no rubric, initialize with defaults
    if (!savedRubric || (Array.isArray(savedRubric) && savedRubric.length === 0) || Object.keys(savedRubric).length === 0) {
        initDefaultRubric();
    } else {
        renderRubricFromData(savedRubric);
    }

    calculateRubricTotal();
    document.getElementById('task-rubric-modal').style.display = 'flex'; // Use flex for centering
};

window.addNewRubricCategory = function () {
    renderRubricCategory("Nueva Categoría", [{ criteria: '', score: '', applied: false }]);
    calculateRubricTotal();
};

function initDefaultRubric() {
    renderRubricCategory("Técnica", Array(6).fill({ criteria: '', score: '', applied: false }));
    renderRubricCategory("Memoria y Concentración", Array(6).fill({ criteria: '', score: '', applied: false }));
}

function renderRubricCategory(catName, items) {
    const container = document.getElementById('rubric-items-container');
    const catDiv = document.createElement('div');
    catDiv.className = 'rubric-category-block';

    catDiv.innerHTML = `
        <div class="cat-header">
            <input type="text" class="input-minimal rubric-cat-name" value="${catName}" placeholder="Nombre de Categoría">
            <button class="btn-icon delete-sm" onclick="this.closest('.rubric-category-block').remove(); calculateRubricTotal();" title="Eliminar Categoría"><i class="ri-delete-bin-line"></i></button>
        </div>
        <div class="cat-items-list">
        </div>
        <div style="padding: 0 16px 16px;">
            <button class="btn-add-criterion" onclick="addRubricCriterionInCat(this)">
                <i class="ri-add-line"></i> Agregar Criterio
            </button>
        </div>
    `;

    const itemsList = catDiv.querySelector('.cat-items-list');
    items.forEach(item => {
        addRubricItemToContainer(itemsList, item.criteria, item.score, item.applied);
    });

    container.appendChild(catDiv);
}

window.addRubricCriterionInCat = function (btn) {
    const list = btn.closest('.rubric-category-block').querySelector('.cat-items-list');
    addRubricItemToContainer(list, '', '', false);
    calculateRubricTotal();
};

window.handleRubricScoreInput = function (input) {
    const row = input.closest('.rubric-item-row');
    const checkbox = row.querySelector('.rubric-applied');
    const val = parseFloat(input.value);

    // Auto-check if score is entered and checkbox is off
    if (!isNaN(val) && val > 0 && !checkbox.checked) {
        checkbox.checked = true;
    }

    calculateRubricTotal();
};

function addRubricItemToContainer(container, criteria = '', score = '', applied = false) {
    const div = document.createElement('div');
    div.className = 'rubric-item-row';
    div.innerHTML = `
        <input type="checkbox" class="rubric-applied" ${applied ? 'checked' : ''} onchange="calculateRubricTotal()">
        <input type="text" class="input-minimal rubric-criteria" placeholder="Criterio" value="${criteria}">
        <input type="number" class="input-minimal rubric-score" placeholder="Pts" value="${score}" oninput="handleRubricScoreInput(this)">
        <button class="btn-icon delete-sm" onclick="this.parentElement.remove(); calculateRubricTotal();" title="Quitar item"><i class="ri-close-line"></i></button>
    `;
    container.appendChild(div);
}

function renderRubricFromData(data) {
    if (Array.isArray(data)) {
        // Legacy flat format support
        renderRubricCategory("Evaluación", data);
    } else {
        // Categorized object format
        Object.entries(data).forEach(([catName, items]) => {
            renderRubricCategory(catName, items);
        });
    }
}


function calculateRubricTotal() {
    let total = 0;
    let count = 0;
    document.querySelectorAll('.rubric-item-row').forEach(row => {
        const isApplied = row.querySelector('.rubric-applied').checked;
        if (isApplied) {
            const val = parseFloat(row.querySelector('.rubric-score').value || 0);
            total += val;
            count++;
        }
    });

    // Calculate average if there are criteria
    const avg = count > 0 ? (total / count) : 0;

    document.getElementById('rubric-total-score').textContent = avg.toFixed(2);
    return avg;
}

function closeTaskRubricModal() {
    document.getElementById('task-rubric-modal').style.display = 'none';
}

window.saveTaskRubricGrade = function () {
    const combinedIdx = document.getElementById('rubric-task-idx').value;
    const subtaskIdxStr = document.getElementById('rubric-subtask-idx').value;
    const capturedId = document.getElementById('rubric-student-id').value || currentStudentId;
    const [modId, topicIdx] = (combinedIdx || '').split('-');

    const rubricData = {};
    document.querySelectorAll('.rubric-category-block').forEach(cat => {
        const catName = cat.querySelector('.rubric-cat-name').value.trim() || 'General';
        const items = [];
        cat.querySelectorAll('.rubric-item-row').forEach(row => {
            const criteria = row.querySelector('.rubric-criteria').value.trim();
            const score = parseFloat(row.querySelector('.rubric-score').value) || 0;
            const applied = row.querySelector('.rubric-applied').checked;
            if (criteria || score > 0) {
                items.push({ criteria, score, applied });
            }
        });
        if (items.length > 0) {
            rubricData[catName] = items;
        }
    });

    const totalScore = parseFloat(document.getElementById('rubric-total-score').textContent);

    const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');

    if (!progressData.taskDetails) progressData.taskDetails = {};
    if (!progressData.taskDetails[topicIdx]) progressData.taskDetails[topicIdx] = {};

    if (subtaskIdxStr !== '') {
        const subIdx = parseInt(subtaskIdxStr);
        if (!progressData.taskDetails[topicIdx].subtasks) progressData.taskDetails[topicIdx].subtasks = [];
        if (progressData.taskDetails[topicIdx].subtasks[subIdx]) {
            progressData.taskDetails[topicIdx].subtasks[subIdx].rubric = rubricData;
            progressData.taskDetails[topicIdx].subtasks[subIdx].rubricComment = ''; // No comment
            progressData.taskDetails[topicIdx].subtasks[subIdx].grade = totalScore;
        }
    } else {
        progressData.taskDetails[topicIdx].rubric = rubricData;
        progressData.taskDetails[topicIdx].rubricComment = ''; // No comment
        if (!progressData.grades) progressData.grades = {};
        progressData.grades[topicIdx] = totalScore;
    }

    localStorage.setItem(progressKey, JSON.stringify(progressData));

    // Automatically recalculate main task average
    updateMainTaskGradeFromSubtasks(modId, topicIdx);

    // [INTEGRATION] Save to general evaluation history if it's a subtask and has a grade
    if (subtaskIdxStr !== '' && totalScore > 0) {
        saveSubtaskToEvaluationHistory(modId, topicIdx, parseInt(subtaskIdxStr), totalScore, rubricData, '', capturedId);
    }

    closeTaskRubricModal();
    renderSubtasksInMod(modId, topicIdx);

    alert('Calificación guardada exitosamente');
};

function saveSubtaskToEvaluationHistory(modId, topicIdx, subIdx, score, rubricObject, comment, capturedId = null) {
    const targetStudentId = capturedId || currentStudentId;
    const instrument = getStudentInstrument();
    const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
    const masterData = JSON.parse(localStorage.getItem(masterKey) || '{}');
    const topic = masterData.topics?.[topicIdx];

    const progressKey = `student_progress_syllabus_${targetStudentId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
    const subtask = progressData.taskDetails?.[topicIdx]?.subtasks?.[subIdx];

    if (!topic || !subtask) return;

    const evalKey = `student_grades_syllabus_${targetStudentId}_mod_${modId}`;
    let evaluations = JSON.parse(localStorage.getItem(evalKey) || '[]');
    if (!Array.isArray(evaluations)) evaluations = [evaluations];

    // Format rubric correctly for the report system
    const evalRubric = {};
    Object.entries(rubricObject).forEach(([catName, items]) => {
        evalRubric[catName] = items.map(item => ({
            name: item.criteria || 'Criterio',
            score: item.score,
            applied: item.applied
        }));
    });

    const newEval = {
        examTitle: topic.title.toUpperCase(),
        evalSubtitle: `Subtarea: ${subtask.title}`,
        date: new Date().toISOString().split('T')[0],
        instrument: instrument,
        moduleId: parseInt(modId),
        theoreticalGrade: "",
        rubric: evalRubric,
        globalComment: comment,
        customSongs: [],
        evaluatedSongs: (subtask.linkedSongIdx !== undefined && subtask.linkedSongIdx !== '') ? [subtask.linkedSongIdx] : [],
        isSubtaskEval: true,
        taskType: topic.taskType || 'Tarea',
        _subtaskRef: { topicIdx: parseInt(topicIdx), subIdx: parseInt(subIdx) }
    };

    // Check if we should update existing or add new
    const existingIdx = evaluations.findIndex(e =>
        e._subtaskRef &&
        parseInt(e._subtaskRef.topicIdx) === parseInt(topicIdx) &&
        parseInt(e._subtaskRef.subIdx) === parseInt(subIdx)
    );

    if (existingIdx !== -1) {
        evaluations[existingIdx] = { ...evaluations[existingIdx], ...newEval };
    } else {
        evaluations.push(newEval);
    }

    localStorage.setItem(evalKey, JSON.stringify(evaluations));
}

window.clearSubtaskGrade = function () {
    confirmModal('¿Estás seguro de que deseas limpiar la calificación de esta subtarea? Se borrará la rúbrica y volverá a "Sin Nota".', () => {
        const combinedIdx = document.getElementById('rubric-task-idx').value;
        const subtaskIdxStr = document.getElementById('rubric-subtask-idx').value;
        const [modId, topicIdx] = (combinedIdx || '').split('-');
        const capturedId = document.getElementById('rubric-student-id').value || currentStudentId;
        if (!modId || !topicIdx || subtaskIdxStr === '') return;
        const subIdx = parseInt(subtaskIdxStr);

        const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
        const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');

        if (progressData.taskDetails?.[topicIdx]?.subtasks?.[subIdx]) {
            const st = progressData.taskDetails[topicIdx].subtasks[subIdx];
            st.grade = 0;
            st.rubric = [];
            st.rubricComment = '';

            localStorage.setItem(progressKey, JSON.stringify(progressData));
            updateMainTaskGradeFromSubtasks(modId, topicIdx);
            closeTaskRubricModal();
            renderSubtasksInMod(modId, topicIdx);
            alert('Calificación limpiada');
        }
    });
};

// ==========================================
// DEDICATED GRADING MODALS (CLEANUP)
// ==========================================

window.openExamGradeModalInMod = function (modId, topicIdx) {
    const capturedId = currentStudentId;
    document.getElementById('exam-student-id').value = capturedId;
    const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
    const currentGrade = (progressData.grades || {})[topicIdx];

    const display = document.getElementById('exam-grade-current');
    if (currentGrade !== undefined) {
        display.textContent = currentGrade;
        display.classList.remove('empty');
    } else {
        display.textContent = '-';
        display.classList.add('empty');
    }

    document.getElementById('grade-exam-mod-id').value = modId;
    document.getElementById('grade-exam-topic-idx').value = topicIdx;

    document.getElementById('exam-grade-modal').style.display = 'block';
};

window.closeExamGradeModal = function () {
    document.getElementById('exam-grade-modal').style.display = 'none';
};

window.goToExamGradesTab = function () {
    closeExamGradeModal();
    activeTab('calificacion');
};


window.openSubtaskGradeDetail = function (modId, topicIdx, subIdx) {
    try {
        const capturedId = document.getElementById('assignment-student-id')?.value || currentStudentId;
        if (!capturedId) {
            return alert('ID de estudiante no encontrado.');
        }

        const evalKey = `student_grades_syllabus_${capturedId}_mod_${modId}`;
        const evaluations = JSON.parse(localStorage.getItem(evalKey) || '[]');

        let evalObj = null;
        if (Array.isArray(evaluations)) {
            evalObj = evaluations.find(e =>
                e._subtaskRef &&
                parseInt(e._subtaskRef.topicIdx) === parseInt(topicIdx) &&
                parseInt(e._subtaskRef.subIdx) === parseInt(subIdx)
            );
        }

        // ALWAYS sync linked song data from current subtask definition, even if eval exists
        const progressKey = `student_progress_syllabus_${capturedId}_mod_${modId}`;
        const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
        const subtask = progressData.taskDetails?.[topicIdx]?.subtasks?.[subIdx];

        if (evalObj && subtask) {
            evalObj.evaluatedSongs = (subtask.linkedSongIdx !== undefined && subtask.linkedSongIdx !== '') ? [subtask.linkedSongIdx] : [];
        }

        if (!evalObj) {

            if (subtask && subtask.grade > 0 && subtask.rubric) {
                const instrument = getStudentInstrument();
                const masterKey = `master_syllabus_${instrument}_mod_${modId}`;
                const masterData = JSON.parse(localStorage.getItem(masterKey) || '{}');
                const topicTitle = masterData.topics?.[topicIdx]?.title || 'Tarea';

                const evalRubric = {};
                if (Array.isArray(subtask.rubric)) {
                    evalRubric["CRITERIOS DE EVALUACIÓN"] = subtask.rubric.map(item => ({
                        name: item.criteria,
                        score: item.score,
                        applied: item.applied || true
                    }));
                } else {
                    Object.entries(subtask.rubric || {}).forEach(([catName, items]) => {
                        evalRubric[catName] = items.map(item => ({
                            name: item.criteria || 'Criterio',
                            score: item.score,
                            applied: item.applied
                        }));
                    });
                }

                evalObj = {
                    examTitle: `[TAREA] ${topicTitle.toUpperCase()}`,
                    evalSubtitle: `Subtarea: ${subtask.title}`,
                    date: '--',
                    instrument: instrument,
                    moduleId: parseInt(modId),
                    theoreticalGrade: "",
                    rubric: evalRubric,
                    globalComment: subtask.rubricComment || '',
                    customSongs: [],
                    evaluatedSongs: (subtask.linkedSongIdx !== undefined && subtask.linkedSongIdx !== '') ? [subtask.linkedSongIdx] : [],
                    isSubtaskEval: true,
                    _subtaskRef: { topicIdx: parseInt(topicIdx), subIdx: parseInt(subIdx) }
                };
            }
        }

        if (!evalObj) {
            return alert('No hay detalles de calificación guardados para esta subtarea aún.');
        }

        const modal = document.getElementById('grading-report-modal');
        if (!modal) return alert('Modal de reporte no encontrado.');

        modal.dataset.currentIndex = Array.isArray(evaluations) ? evaluations.indexOf(evalObj) : -1;
        modal.dataset.currentModule = modId;
        modal.dataset.studentId = capturedId;

        renderDetailedReportHTML(evalObj, "grading-report-render-area");
        modal.classList.add('active');

    } catch (err) {
        alert('Error al abrir detalle: ' + err.message);
    }
};

