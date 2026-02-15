document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('main-header');

    // Sticky Header Scroll Logic
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Smooth scroll for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add subtle reveal animation on scroll for cards
    const cards = document.querySelectorAll('.info-card');
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease-out';
        observer.observe(card);
    });

    // Mobile Menu Toggle Logic
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking a link
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !navMenu.contains(e.target) && navMenu.classList.contains('active')) {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    // Initialize default admin data if not exists
    initializeDefaultData();

    // Authentication Modal Logic
    const adminBtn = document.getElementById('admin-btn');
    const authModal = document.getElementById('auth-modal');
    const modalClose = document.querySelector('.modal-close');
    const authForm = document.getElementById('auth-form');
    const accessCodeInput = document.getElementById('access-code');
    const authError = document.getElementById('auth-error');

    // Open modal
    adminBtn.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.classList.add('active');
        accessCodeInput.value = '';
        authError.textContent = '';
    });

    // Close modal
    modalClose.addEventListener('click', () => {
        authModal.classList.remove('active');
    });

    // Close modal on background click
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.classList.remove('active');
        }
    });

    // Handle form submission
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = accessCodeInput.value.trim();

        if (validateAccessCode(code)) {
            // Store session
            sessionStorage.setItem('adminSession', 'active');
            sessionStorage.setItem('currentStaffCode', code);
            // Redirect to admin panel
            window.location.href = 'admin.html';
        } else {
            authError.textContent = '❌ Código de acceso incorrecto';
            accessCodeInput.value = '';
            accessCodeInput.focus();
        }
    });
});

// Initialize default staff data
function initializeDefaultData() {
    if (!localStorage.getItem('staffData')) {
        const defaultStaff = [
            {
                id: 1,
                primerNombre: 'Tony',
                segundoNombre: 'Luis',
                primerApellido: 'Alvarado',
                segundoApellido: 'Guevara',
                sexo: 'Masculino',
                edad: 28,
                cumpleanos: '12/09/1997',
                area: 'Administración',
                cargo: 'Gerente General',
                codigoAcceso: 'GGTLAG97',
                nivelAcceso: 'Total'
            }
        ];
        localStorage.setItem('staffData', JSON.stringify(defaultStaff));
    }
}

// Validate access code
function validateAccessCode(code) {
    const staffData = JSON.parse(localStorage.getItem('staffData') || '[]');
    return staffData.some(staff => staff.codigoAcceso === code);
}
