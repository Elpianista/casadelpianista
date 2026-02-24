document.addEventListener('DOMContentLoaded', () => {
    // --- DATABASE ---
    const pianos = [
        {
            id: 'p1',
            brand: 'Yamaha',
            model: 'P-145',
            image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?q=80&w=800&auto=format&fit=crop', // Placeholder for Yamaha P-145
            nivel: 'Principiante',
            edad: 'Adultos',
            precioCat: 'Económico',
            priceStr: '$499 - $550',
            specs: {
                keys: '88 teclas GHC contrapesadas',
                polyphony: '64 notas',
                voices: '10 voces',
                speakers: '2 x 7W'
            },
            pros: ['Muy compacto y ligero', 'Tacto GHC realista para el precio', 'Compatible con app Smart Pianist'],
            cons: ['Polifonía algo baja (64)', 'Pocas voces adicionales'],
            youtubeId: 'Wz3-Oa_7gZc' // Replace with actual overview video ID
        },
        {
            id: 'p2',
            brand: 'Roland',
            model: 'FP-10',
            image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=800&auto=format&fit=crop', // Placeholder for Roland FP-10
            nivel: 'Principiante',
            edad: 'Adultos',
            precioCat: 'Económico',
            priceStr: '$500 - $600',
            specs: {
                keys: '88 teclas PHA-4 Standard',
                polyphony: '96 notas',
                voices: '15 voces (SuperNATURAL)',
                speakers: '2 x 6W'
            },
            pros: ['Mejor acción de teclado en su clase (PHA-4)', 'Motor de sonido SuperNATURAL rico', 'Bluetooth MIDI'],
            cons: ['Altavoces apuntan hacia abajo', 'Botones de control limitados'],
            youtubeId: 'B-uX0zH79F8'
        },
        {
            id: 'p3',
            brand: 'Casio',
            model: 'Privia PX-S1100',
            image: 'https://images.unsplash.com/photo-1571446738914-1e031a0b3fd3?q=80&w=800&auto=format&fit=crop', // Placeholder
            nivel: 'Intermedio',
            edad: 'Adultos',
            precioCat: 'Gama Media',
            priceStr: '$699 - $750',
            specs: {
                keys: '88 teclas Smart Scaled Hammer',
                polyphony: '192 notas',
                voices: '18 voces',
                speakers: '2 x 8W'
            },
            pros: ['Diseño ultradelgado y moderno', 'Panel táctil elegante', 'Altavoces mejorados vs modelo anterior'],
            cons: ['Acción de teclas un poco más ligera', 'Difícil de usar sin la app móvil'],
            youtubeId: '8qM03W-v4bU'
        },
        {
            id: 'p4',
            brand: 'Yamaha',
            model: 'PSS-F30',
            image: 'https://images.unsplash.com/photo-1621274220310-53bc31015c7e?q=80&w=800&auto=format&fit=crop', // Placeholder Keyboard
            nivel: 'Principiante',
            edad: 'Niños',
            precioCat: 'Económico',
            priceStr: '$60 - $80',
            specs: {
                keys: '37 miniteclas HQ',
                polyphony: '32 notas',
                voices: '120 voces + 114 ritmos',
                speakers: '1 x 1.4W'
            },
            pros: ['Perfecto para manos pequeñas', 'Canciones integradas atractivas', 'Funciona con pilas'],
            cons: ['Teclas no contrapesadas', 'Sonido básico de juguete'],
            youtubeId: 'kS5lK_j1n_U'
        },
        {
            id: 'p5',
            brand: 'Kawai',
            model: 'ES120',
            image: 'https://images.unsplash.com/photo-1601312389178-5e6e3362a26c?q=80&w=800&auto=format&fit=crop',
            nivel: 'Intermedio',
            edad: 'Adultos',
            precioCat: 'Gama Media',
            priceStr: '$899 - $950',
            specs: {
                keys: '88 teclas Responsive Hammer Compact',
                polyphony: '192 notas',
                voices: '25 voces (Harmonic Imaging)',
                speakers: '2 x 10W'
            },
            pros: ['Sonido de piano acústico superior', 'Acción de teclado muy fluida', 'Conectividad Bluetooth Audio/MIDI'],
            cons: ['Precio más elevado para entrada', 'Diseño algo clásico'],
            youtubeId: 'd6qT1Lp1iC8'
        },
        {
            id: 'p6',
            brand: 'Roland',
            model: 'RD-88',
            image: 'https://images.unsplash.com/photo-1634568165039-b9a622a55928?q=80&w=800&auto=format&fit=crop',
            nivel: 'Avanzado',
            edad: 'Adultos',
            precioCat: 'Profesional',
            priceStr: '$1,299 - $1,400',
            specs: {
                keys: '88 teclas PHA-4 Standard',
                polyphony: '256 notas (ZEN-Core)',
                voices: '> 3000 tonos',
                speakers: '2 x 6W integrados'
            },
            pros: ['Librería de sonidos masiva', 'Excelente integración con MainStage', 'Controles en tiempo real orientados al directo'],
            cons: ['Curva de aprendizaje empinada', 'Altavoces integrados débiles para su liga'],
            youtubeId: 'YvH_X-f4t_k'
        }
    ];

    // --- DOM ELEMENTS ---
    const catalogContainer = document.getElementById('piano-catalog');
    const levelTabs = document.querySelectorAll('#level-filters .tab-btn');
    const ageTabs = document.querySelectorAll('#age-filters .tab-btn');
    const priceTabs = document.querySelectorAll('#price-filters .tab-btn');

    // Video Modal Elements
    const videoModal = document.getElementById('videoModal');
    const closeVideoModal = document.getElementById('closeVideoModal');
    const youtubeIframe = document.getElementById('youtubeIframe');

    // Comparison Elements
    const compareFloatingBar = document.getElementById('compareFloatingBar');
    const compareCountText = document.getElementById('compareCountText');
    const clearCompareBtn = document.getElementById('clearCompareBtn');
    const openCompareModalBtn = document.getElementById('openCompareModalBtn');

    const compareModal = document.getElementById('compareModal');
    const closeCompareModal = document.getElementById('closeCompareModal');
    const compareTable = document.getElementById('compareTable');

    // State Variables
    let currentFilters = { nivel: 'todos', edad: 'todos', precioCat: 'todos' };
    let selectedForCompare = [];
    const MAX_COMPARE = 3;

    // --- RENDER CATALOG ---
    function renderPianos(pianosToRender) {
        catalogContainer.innerHTML = '';

        if (pianosToRender.length === 0) {
            catalogContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: rgba(255,255,255,0.5);">No se encontraron pianos con esos filtros.</div>';
            return;
        }

        pianosToRender.forEach(piano => {
            const isChecked = selectedForCompare.some(p => p.id === piano.id) ? 'checked' : '';

            const cardHTML = `
                <div class="piano-card fade-in-up">
                    <div class="piano-image-wrapper">
                        <div class="piano-badges">
                            <span class="piano-badge badge-nivel">${piano.nivel}</span>
                            <span class="piano-badge badge-edad">${piano.edad}</span>
                            <span class="piano-badge badge-precio">${piano.precioCat}</span>
                        </div>
                        <img src="${piano.image}" alt="${piano.brand} ${piano.model}">
                    </div>
                    <div class="piano-content">
                        <h3 class="piano-title">${piano.brand} ${piano.model}</h3>
                        <div class="piano-price">${piano.priceStr}</div>
                        <ul class="piano-specs">
                            <li><i class="ri-skip-right-line" style="color:var(--color-gold);"></i> ${piano.specs.keys}</li>
                            <li><i class="ri-disc-line" style="color:var(--color-gold);"></i> Polifonía: ${piano.specs.polyphony}</li>
                            <li><i class="ri-volume-up-line" style="color:var(--color-gold);"></i> Altavoces: ${piano.specs.speakers}</li>
                        </ul>
                        <div class="piano-actions">
                            <button class="btn btn-primary video-btn" onclick="openVideo('${piano.youtubeId}')">
                                <i class="ri-play-circle-line" style="font-size:1.2rem;"></i> Ver Video
                            </button>
                            <label class="compare-checkbox-wrapper">
                                <input type="checkbox" class="compare-checkbox" value="${piano.id}" onchange="toggleCompare(this)" ${isChecked}>
                                Comparar
                            </label>
                        </div>
                    </div>
                </div>
            `;
            catalogContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // --- FILTERING LOGIC ---
    function applyFilters() {
        const filtered = pianos.filter(piano => {
            const matchNivel = currentFilters.nivel === 'todos' || piano.nivel === currentFilters.nivel;
            const matchEdad = currentFilters.edad === 'todos' || piano.edad === currentFilters.edad;
            const matchPrecio = currentFilters.precioCat === 'todos' || piano.precioCat === currentFilters.precioCat;
            return matchNivel && matchEdad && matchPrecio;
        });
        renderPianos(filtered);
    }

    function setupFilterTabs(tabsNodeList, filterKey) {
        tabsNodeList.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active class
                tabsNodeList.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update current filters and re-render
                currentFilters[filterKey] = tab.dataset.filter;
                applyFilters();
            });
        });
    }

    setupFilterTabs(levelTabs, 'nivel');
    setupFilterTabs(ageTabs, 'edad');
    setupFilterTabs(priceTabs, 'precioCat');

    // --- VIDEO MODAL LOGIC ---
    window.openVideo = function (youtubeId) {
        youtubeIframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
        videoModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };

    function closeVideo() {
        videoModal.classList.remove('show');
        youtubeIframe.src = ''; // Stop video playback
        document.body.style.overflow = '';
    }

    closeVideoModal.addEventListener('click', closeVideo);
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) closeVideo(); // Close on click outside
    });

    // --- COMPARISON LOGIC ---
    window.toggleCompare = function (checkbox) {
        const pianoId = checkbox.value;
        const pianoData = pianos.find(p => p.id === pianoId);

        if (checkbox.checked) {
            if (selectedForCompare.length >= MAX_COMPARE) {
                alert(`Puedes comparar un máximo de ${MAX_COMPARE} pianos a la vez.`);
                checkbox.checked = false;
                return;
            }
            selectedForCompare.push(pianoData);
        } else {
            selectedForCompare = selectedForCompare.filter(p => p.id !== pianoId);
        }
        updateCompareBar();
    };

    function updateCompareBar() {
        const count = selectedForCompare.length;
        compareCountText.textContent = `${count}/${MAX_COMPARE} Pianos seleccionados`;

        if (count > 0) {
            compareFloatingBar.classList.add('show');
            openCompareModalBtn.disabled = count < 2; // Require at least 2 to compare
        } else {
            compareFloatingBar.classList.remove('show');
        }

        // Update checkboxes state visually if needed (handled by re-render if filtered, but direct manipulation is better here)
        const allCheckboxes = document.querySelectorAll('.compare-checkbox');
        allCheckboxes.forEach(cb => {
            if (!cb.checked && count >= MAX_COMPARE) {
                cb.disabled = true;
            } else {
                cb.disabled = false;
            }
        });
    }

    clearCompareBtn.addEventListener('click', () => {
        selectedForCompare = [];
        updateCompareBar();
        // Uncheck all rendered checkboxes
        document.querySelectorAll('.compare-checkbox').forEach(cb => cb.checked = false);
    });

    openCompareModalBtn.addEventListener('click', () => {
        buildCompareTable();
        compareModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    });

    closeCompareModal.addEventListener('click', () => {
        compareModal.classList.remove('show');
        document.body.style.overflow = '';
    });

    compareModal.addEventListener('click', (e) => {
        if (e.target === compareModal) {
            compareModal.classList.remove('show');
            document.body.style.overflow = '';
        }
    });

    function buildCompareTable() {
        if (selectedForCompare.length === 0) return;

        // Set CSS variable based on count to divide width evenly
        compareTable.style.setProperty('--compare-count', selectedForCompare.length);

        let tableHTML = `
            <thead>
                <tr>
                    <th class="feature-col">Característica</th>
                    ${selectedForCompare.map(p => `<th class="item-col" style="text-align:center;">
                        <img src="${p.image}" alt="${p.model}" class="compare-img">
                        <h3>${p.brand} ${p.model}</h3>
                        <div class="compare-price">${p.priceStr}</div>
                    </th>`).join('')}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th class="feature-col">Teclado</th>
                    ${selectedForCompare.map(p => `<td class="item-col">${p.specs.keys}</td>`).join('')}
                </tr>
                <tr>
                    <th class="feature-col">Polifonía</th>
                    ${selectedForCompare.map(p => `<td class="item-col">${p.specs.polyphony}</td>`).join('')}
                </tr>
                <tr>
                    <th class="feature-col">Voces/Tonos</th>
                    ${selectedForCompare.map(p => `<td class="item-col">${p.specs.voices}</td>`).join('')}
                </tr>
                <tr>
                    <th class="feature-col">Altavoces</th>
                    ${selectedForCompare.map(p => `<td class="item-col">${p.specs.speakers}</td>`).join('')}
                </tr>
                <tr>
                    <th class="feature-col" style="color: #2ed573;">Pros 👍</th>
                    ${selectedForCompare.map(p => `<td class="item-col">
                        <ul style="padding-left:1.2rem; margin:0;">
                            ${p.pros.map(pro => `<li>${pro}</li>`).join('')}
                        </ul>
                    </td>`).join('')}
                </tr>
                <tr>
                    <th class="feature-col" style="color: #ff4757;">Contras 👎</th>
                    ${selectedForCompare.map(p => `<td class="item-col">
                        <ul style="padding-left:1.2rem; margin:0;">
                            ${p.cons.map(con => `<li>${con}</li>`).join('')}
                        </ul>
                    </td>`).join('')}
                </tr>
            </tbody>
        `;
        compareTable.innerHTML = tableHTML;
    }

    // --- INITIALIZATION ---
    renderPianos(pianos);
});
