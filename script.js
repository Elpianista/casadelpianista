document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('main-header');

    // Check for active session
    const adminBtn = document.getElementById('admin-btn');
    const isAdminActive = localStorage.getItem('adminSession') === 'active';

    if (isAdminActive && adminBtn) {
        const icon = adminBtn.querySelector('i');
        if (icon) {
            icon.className = 'ri-dashboard-line';
        }
        adminBtn.title = 'Volver al Panel';

        // Direct redirect without modal
        adminBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent original listener if it wasn't replaced
            window.location.href = 'admin.html';
        }, true); // Use capture phase to intercept
    }

    // Throttle scroll events and prioritize visibility
    const heroSection = document.querySelector('.hero-modern');
    let isTicking = false;
    let lastScrollY = window.scrollY;

    const updateScrollEffects = () => {
        // Header scroll effect - Simple class toggle is fast
        if (lastScrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Parallax effect with zoom for hero background ONLY if near top
        if (heroSection && lastScrollY < window.innerHeight * 1.5) {
            const parallaxSpeed = 0.3; // Movimiento más sutil
            const zoomSpeed = 0.0002; // Velocidad del zoom

            const yPos = -(lastScrollY * parallaxSpeed);
            const scale = 1 + (lastScrollY * zoomSpeed); // Zoom gradual

            heroSection.style.backgroundPosition = `center ${yPos}px`;
            heroSection.style.backgroundSize = `${scale * 100}%`;
        }

        // Teach Watermark Scroll Animation - Optional logic
        const watermarkContainer = document.querySelector('.teach-watermark');
        if (watermarkContainer) {
            const rect = watermarkContainer.getBoundingClientRect();
            // Solo animar si la sección es visible en el viewport
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                if (watermarkRows && watermarkRows.length > 0) {
                    watermarkRows.forEach((row, index) => {
                        const speed = (index + 1) * 0.1;
                        const xOffset = (lastScrollY * speed) % 100;
                        const direction = index % 2 === 0 ? 1 : -1;
                        row.style.transform = `translateX(${direction * xOffset}px)`;
                    });
                }
            }
        }

        isTicking = false;
    };

    window.addEventListener('scroll', () => {
        lastScrollY = window.scrollY;
        if (!isTicking) {
            window.requestAnimationFrame(updateScrollEffects);
            isTicking = true;
        }
    }, { passive: true });

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

    // Add subtle reveal animation on scroll for all interactive sections
    const animateElements = document.querySelectorAll('.info-card, .plan-card, .chat-bubble, .teach-card, .teach-header, .route-card, .route-header');
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animateElements.forEach(el => {
        observer.observe(el);
    });

    // Teach Watermark Scroll Animation initialized above in the ticking scroll event.
    const watermarkRows = document.querySelectorAll('.watermark-row');

    // Mobile Menu Toggle Logic
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('nav');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking a link
        document.querySelectorAll('nav a').forEach(link => {
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

    // Authentication Modal Logic - Inject HTML dynamically if missing
    let authModal = document.getElementById('auth-modal');
    if (!authModal) {
        const modalHtml = `
            <div id="auth-modal" class="modal">
                <div class="modal-content">
                    <span class="modal-close">&times;</span>
                    <div class="modal-header">
                        <i class="ri-shield-keyhole-line"></i>
                        <h2>Panel Administrativo</h2>
                        <p class="modal-subtitle">Sistema de Gestión Académica</p>
                    </div>
                    <div class="modal-body">
                        <div class="warning-box">
                            <i class="ri-alert-line"></i>
                            <p><strong>Acceso Restringido</strong><br>Solo para personal autorizado</p>
                        </div>
                        <div class="auth-features-grid">
                            <div class="auth-feature-item" style="animation-delay: 0s;">
                                <i class="ri-team-line"></i>
                            </div>
                            <div class="auth-feature-item" style="animation-delay: 0.2s;">
                                <i class="ri-calendar-event-line"></i>
                            </div>
                            <div class="auth-feature-item" style="animation-delay: 0.4s;">
                                <i class="ri-money-dollar-circle-line"></i>
                            </div>
                            <div class="auth-feature-item" style="animation-delay: 0.6s;">
                                <i class="ri-music-2-line"></i>
                            </div>
                            <div class="auth-feature-item" style="animation-delay: 0.8s;">
                                <i class="ri-admin-line"></i>
                            </div>
                        </div>
                        <form id="auth-form">
                            <label for="access-code">Código de Acceso</label>
                            <input type="password" id="access-code" placeholder="Ingrese su código" autocomplete="off" required>
                            <button type="submit" class="btn btn-primary">
                                <i class="ri-login-box-line"></i> Ingresar
                            </button>
                            <p class="error-message" id="auth-error"></p>
                        </form>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        authModal = document.getElementById('auth-modal');
    }
    const modalClose = document.querySelector('.modal-close');
    const authForm = document.getElementById('auth-form');
    const accessCodeInput = document.getElementById('access-code');
    const authError = document.getElementById('auth-error');

    // Open modal
    adminBtn?.addEventListener('click', (e) => {
        if (isAdminActive) return; // Logic handled above
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
            localStorage.setItem('adminSession', 'active');
            localStorage.setItem('currentStaffCode', code);
            // Redirect to admin panel
            window.location.href = 'admin.html';
        } else {
            authError.textContent = '❌ Código de acceso incorrecto';
            accessCodeInput.value = '';
            accessCodeInput.focus();
        }
    });

    // Location Map Interaction
    const locationItems = document.querySelectorAll('.location-item');
    const moto = document.querySelector('.delivery-moto');

    if (moto && locationItems.length > 0) {
        const positions = {
            'morales': { bottom: '65%', right: '65%', rotate: '15deg' },
            'tarapoto': { bottom: '45%', right: '45%', rotate: '0deg' },
            'banda': { bottom: '25%', right: '25%', rotate: '-20deg' }
        };

        locationItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                const target = item.getAttribute('data-target');
                const pos = positions[target];

                if (pos) {
                    moto.style.bottom = pos.bottom;
                    moto.style.right = pos.right;
                    moto.style.transform = `rotate(${pos.rotate}) scale(1.2)`;
                    moto.classList.add('moving');
                }
            });

            item.addEventListener('mouseleave', () => {
                moto.style.transform = `rotate(0deg) scale(1)`;
                moto.classList.remove('moving');
            });
        });
    }
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
