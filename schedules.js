// ========== SCHEDULE MANAGEMENT ==========

// Time slots configuration
const TIME_SLOTS = {
    morning: [
        '8:30 am - 9:30 am',
        '9:45 am - 10:45 am',
        '11:00 am - 12:00 pm'
    ],
    afternoon: [
        '3:00 pm - 4:00 pm',
        '4:15 pm - 5:15 pm',
        '5:30 pm - 6:30 pm',
        '6:45 pm - 7:45 pm',
        '8:00 pm - 9:00 pm'
    ]
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ALL_TIME_SLOTS = [...TIME_SLOTS.morning, ...TIME_SLOTS.afternoon];

let selectedStudentId = null;
let closedMode = false;
let currentViewMode = 'admin'; // 'admin' or 'client'

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeScheduleData();
    loadStudentSelector();
    generateAssignmentGrid();
    generateVisualizationGrid();

    // Event listeners
    const studentSelector = document.getElementById('student-selector');
    const toggleClosedBtn = document.getElementById('toggle-closed-mode');
    const saveScheduleBtn = document.getElementById('save-schedule-btn');
    const viewToggleBtns = document.querySelectorAll('.toggle-btn');

    if (studentSelector) {
        studentSelector.addEventListener('change', (e) => {
            selectedStudentId = e.target.value ? parseInt(e.target.value) : null;
            generateAssignmentGrid();
            document.getElementById('save-schedule-btn').style.display = selectedStudentId ? 'inline-flex' : 'none';
        });
    }

    if (toggleClosedBtn) {
        toggleClosedBtn.addEventListener('click', () => {
            closedMode = !closedMode;
            toggleClosedBtn.classList.toggle('active');
            toggleClosedBtn.innerHTML = closedMode
                ? '<i class="ri-check-line"></i> Modo Cerrado ON'
                : '<i class="ri-close-circle-line"></i> Marcar Cerrados';
        });
    }

    if (saveScheduleBtn) {
        saveScheduleBtn.addEventListener('click', saveSchedule);
    }

    viewToggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            viewToggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentViewMode = btn.dataset.view;
            generateVisualizationGrid();
        });
    });
});

// Initialize schedule data
function initializeScheduleData() {
    if (!localStorage.getItem('scheduleData')) {
        const scheduleData = {
            assignments: [], // { studentId, timeSlots: [{ day, time }] }
            closedSlots: []  // { day, time }
        };
        localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
    }
}

// Load students into selector
function loadStudentSelector() {
    const studentsData = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const scheduleData = JSON.parse(localStorage.getItem('scheduleData') || '{}');
    const selector = document.getElementById('student-selector');

    if (!selector) return;

    selector.innerHTML = '<option value="">Seleccionar alumno...</option>';

    studentsData.forEach(student => {
        const hasSchedule = scheduleData.assignments?.some(a => a.studentId === student.id);
        const fullName = `${student.primerNombre} ${student.primerApellido}`;
        const status = hasSchedule ? '✓' : '○';

        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${status} ${fullName}`;
        selector.appendChild(option);
    });
}

// Generate assignment grid
function generateAssignmentGrid() {
    const tbody = document.getElementById('assignment-schedule-body');
    if (!tbody) return;

    const scheduleData = JSON.parse(localStorage.getItem('scheduleData') || '{}');
    const studentsData = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const assignments = scheduleData.assignments || [];
    const closedSlots = scheduleData.closedSlots || [];

    tbody.innerHTML = '';

    ALL_TIME_SLOTS.forEach(time => {
        const row = document.createElement('tr');

        // Time label cell
        const timeCell = document.createElement('td');
        timeCell.className = 'time-label';
        timeCell.textContent = time;
        row.appendChild(timeCell);

        // Day cells
        DAYS.forEach(day => {
            const cell = document.createElement('td');
            const cellDiv = document.createElement('div');
            cellDiv.className = 'schedule-cell';
            cellDiv.dataset.day = day;
            cellDiv.dataset.time = time;

            // Check if closed
            const isClosed = closedSlots.some(slot => slot.day === day && slot.time === time);

            if (isClosed) {
                cellDiv.classList.add('closed');
                cellDiv.innerHTML = '<i class="ri-close-line"></i>';
                cellDiv.style.cursor = 'not-allowed';
            } else {
                // Check assignments
                const cellAssignments = assignments.filter(a =>
                    a.timeSlots.some(ts => ts.day === day && ts.time === time)
                );

                if (selectedStudentId) {
                    // Check if selected student is assigned here
                    const isAssignedToSelected = cellAssignments.some(a => a.studentId === selectedStudentId);

                    if (isAssignedToSelected) {
                        cellDiv.classList.add('assigned');
                        cellDiv.innerHTML = '<i class="ri-check-line"></i>';
                    } else if (cellAssignments.length > 0) {
                        cellDiv.classList.add('occupied');
                        cellDiv.innerHTML = `<span class="count-badge">${cellAssignments.length}</span>`;
                    } else {
                        cellDiv.classList.add('available');
                    }
                } else {
                    if (cellAssignments.length > 0) {
                        cellDiv.classList.add('occupied');
                        cellDiv.innerHTML = `<span class="count-badge">${cellAssignments.length}</span>`;
                    } else {
                        cellDiv.classList.add('available');
                    }
                }
            }

            // Click handler
            cellDiv.addEventListener('click', () => handleCellClick(day, time, cellDiv));

            cell.appendChild(cellDiv);
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}

// Handle cell click
function handleCellClick(day, time, cellDiv) {
    const scheduleData = JSON.parse(localStorage.getItem('scheduleData') || '{}');

    if (closedMode) {
        // Toggle closed status
        toggleClosedSlot(day, time);
    } else if (selectedStudentId) {
        // Toggle assignment for selected student
        toggleStudentAssignment(selectedStudentId, day, time);
    }

    generateAssignmentGrid();
    generateVisualizationGrid();
}

// Toggle closed slot
function toggleClosedSlot(day, time) {
    const scheduleData = JSON.parse(localStorage.getItem('scheduleData') || '{}');
    const closedSlots = scheduleData.closedSlots || [];

    const index = closedSlots.findIndex(slot => slot.day === day && slot.time === time);

    if (index >= 0) {
        closedSlots.splice(index, 1);
    } else {
        closedSlots.push({ day, time });
    }

    scheduleData.closedSlots = closedSlots;
    localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
}

// Toggle student assignment
function toggleStudentAssignment(studentId, day, time) {
    const scheduleData = JSON.parse(localStorage.getItem('scheduleData') || '{}');
    let assignments = scheduleData.assignments || [];

    // Find student's assignment
    let studentAssignment = assignments.find(a => a.studentId === studentId);

    if (!studentAssignment) {
        studentAssignment = { studentId, timeSlots: [] };
        assignments.push(studentAssignment);
    }

    // Check if this slot is already assigned
    const slotIndex = studentAssignment.timeSlots.findIndex(ts => ts.day === day && ts.time === time);

    if (slotIndex >= 0) {
        // Remove assignment
        studentAssignment.timeSlots.splice(slotIndex, 1);

        // Remove student assignment if no slots left
        if (studentAssignment.timeSlots.length === 0) {
            assignments = assignments.filter(a => a.studentId !== studentId);
        }
    } else {
        // Add assignment
        studentAssignment.timeSlots.push({ day, time });
    }

    scheduleData.assignments = assignments;
    localStorage.setItem('scheduleData', JSON.stringify(scheduleData));

    // Update student's weekly frequency
    updateStudentFrequency(studentId, studentAssignment.timeSlots.length);
}

// Update student frequency
function updateStudentFrequency(studentId, frequency) {
    const studentsData = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const student = studentsData.find(s => s.id === studentId);

    if (student) {
        student.clasesSemanales = frequency;
        localStorage.setItem('studentsData', JSON.stringify(studentsData));

        // Reload student list if it exists
        if (typeof loadStudentsTable === 'function') {
            loadStudentsTable();
        }
    }
}

// Save schedule (optional confirm button)
function saveSchedule() {
    alert('✅ Horario guardado exitosamente');
    loadStudentSelector();
    generateAssignmentGrid();
    generateVisualizationGrid();
}

// Generate visualization grid
function generateVisualizationGrid() {
    const tbody = document.getElementById('visualization-schedule-body');
    if (!tbody) return;

    const scheduleData = JSON.parse(localStorage.getItem('scheduleData') || '{}');
    const studentsData = JSON.parse(localStorage.getItem('studentsData') || '[]');
    const assignments = scheduleData.assignments || [];
    const closedSlots = scheduleData.closedSlots || [];

    tbody.innerHTML = '';

    ALL_TIME_SLOTS.forEach(time => {
        const row = document.createElement('tr');

        // Time label cell
        const timeCell = document.createElement('td');
        timeCell.className = 'time-label';
        timeCell.textContent = time;
        row.appendChild(timeCell);

        // Day cells
        DAYS.forEach(day => {
            const cell = document.createElement('td');

            // Check if closed
            const isClosed = closedSlots.some(slot => slot.day === day && slot.time === time);

            if (isClosed) {
                cell.innerHTML = '<div class="schedule-cell"><div class="status-cell"><i class="ri-close-circle-line"></i> Cerrado</div></div>';
            } else {
                // Find assignments for this slot
                const cellAssignments = assignments.filter(a =>
                    a.timeSlots.some(ts => ts.day === day && ts.time === time)
                );

                if (currentViewMode === 'admin') {
                    // Admin view - show student names
                    if (cellAssignments.length > 0) {
                        const studentNames = cellAssignments.map(a => {
                            const student = studentsData.find(s => s.id === a.studentId);
                            return student ? `${student.primerNombre} ${student.primerApellido}` : 'Desconocido';
                        });

                        const badgesHtml = studentNames.map(name =>
                            `<span class="student-badge">${name}</span>`
                        ).join('');
                        cell.innerHTML = `<div class="schedule-cell">${badgesHtml}</div>`;
                    } else {
                        cell.innerHTML = '<div class="schedule-cell"><div class="status-cell disponible">Disponible</div></div>';
                    }
                } else {
                    // Client view - show only occupied/available
                    if (cellAssignments.length > 0) {
                        cell.innerHTML = '<div class="schedule-cell"><div class="status-cell ocupado">Ocupado</div></div>';
                    } else {
                        cell.innerHTML = '<div class="schedule-cell"><div class="status-cell disponible">Disponible</div></div>';
                    }
                }
            }

            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}
