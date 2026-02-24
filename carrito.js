// Datos de productos
const productsData = [
    {
        id: 1,
        title: "Método Bastien - Nivel 1",
        category: "metodos",
        price: 45.00,
        image: "https://via.placeholder.com/300x400/f6b000/0a0a0a?text=Metodo+Bastien+1",
        description: "Método completo para principiantes"
    },
    {
        id: 2,
        title: "100 Partituras Clásicas",
        category: "partituras",
        price: 60.00,
        image: "https://via.placeholder.com/300x400/0a0a0a/f6b000?text=Partituras+Clasicas",
        description: "Selección de obras para todos los niveles"
    },
    {
        id: 3,
        title: "Teoría Musical Aplicada",
        category: "teoria",
        price: 35.00,
        image: "https://via.placeholder.com/300x400/f6b000/0a0a0a?text=Teoria+Musical",
        description: "Fundamentos teóricos para pianistas"
    },
    {
        id: 4,
        title: "Método Hanon Completo",
        category: "metodos",
        price: 50.00,
        image: "https://via.placeholder.com/300x400/1a1a1a/f6b000?text=Metodo+Hanon",
        description: "Ejercicios técnicos esenciales"
    },
    {
        id: 5,
        title: "Obras Románticas para Piano",
        category: "partituras",
        price: 55.00,
        image: "https://via.placeholder.com/300x400/f6b000/0a0a0a?text=Romanticas",
        description: "Piezas de Chopin, Liszt y más"
    },
    {
        id: 6,
        title: "Armonía para Pianistas",
        category: "teoria",
        price: 40.00,
        image: "https://via.placeholder.com/300x400/0a0a0a/f6b000?text=Armonia",
        description: "Guía completa de armonía aplicada"
    }
];

// Carrito de compras (localStorage)
let cart = JSON.parse(localStorage.getItem('pianoCart')) || [];

// Estado
let currentCategory = 'todos';
let searchQuery = '';

// Inicializar
document.addEventListener('DOMContentLoaded', function () {
    renderProducts();
    updateCartUI();
    initializeFilters();
    initializeSearch();
    initializeCartModal();
    initializeFloatingCart();
});

// Renderizar productos
function renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    let filteredProducts = productsData;

    // Filtrar por categoría
    if (currentCategory !== 'todos') {
        filteredProducts = filteredProducts.filter(p => p.category === currentCategory);
    }

    // Filtrar por búsqueda
    if (searchQuery) {
        filteredProducts = filteredProducts.filter(p =>
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="no-results"><i class="ri-shopping-bag-line"></i><p>No se encontraron productos</p></div>';
        return;
    }

    container.innerHTML = filteredProducts.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.image}" alt="${product.title}">
                <button class="btn-add-cart" onclick="addToCart(${product.id})">
                    <i class="ri-shopping-cart-line"></i>
                </button>
            </div>
            <div class="product-info">
                <span class="product-category">${getCategoryName(product.category)}</span>
                <h3>${product.title}</h3>
                <p>${product.description}</p>
                <div class="product-price">S/ ${product.price.toFixed(2)}</div>
            </div>
        </div>
    `).join('');
}

// Agregar al carrito
function addToCart(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartUI();
    showCartNotification();
}

// Eliminar del carrito
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    renderCartItems();
}

// Actualizar cantidad
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    saveCart();
    updateCartUI();
    renderCartItems();
}

// Guardar carrito
function saveCart() {
    localStorage.setItem('pianoCart', JSON.stringify(cart));
}

// Actualizar UI del carrito
function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    // Solo actualizamos el contador flotante, el badge del menú fue eliminado
    document.querySelectorAll('#cart-float-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

// Renderizar items del carrito
function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total-amount');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart"><i class="ri-shopping-cart-line"></i><p>El carrito está vacío</p></div>';
        totalEl.textContent = 'S/ 0.00';
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.title}">
            <div class="cart-item-info">
                <h4>${item.title}</h4>
                <p>S/ ${item.price.toFixed(2)}</p>
            </div>
            <div class="cart-item-controls">
                <button onclick="updateQuantity(${item.id}, -1)"><i class="ri-subtract-line"></i></button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity(${item.id}, 1)"><i class="ri-add-line"></i></button>
            </div>
            <button class="btn-remove" onclick="removeFromCart(${item.id})">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
    `).join('');

    totalEl.textContent = `S/ ${total.toFixed(2)}`;
}

// Inicializar modal del carrito
function initializeCartModal() {
    const modal = document.getElementById('cart-modal');
    const closeBtn = modal?.querySelector('.modal-close');
    const checkoutBtn = document.getElementById('checkout-btn');

    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));

    checkoutBtn?.addEventListener('click', function () {
        if (cart.length === 0) {
            alert('El carrito está vacío');
            return;
        }

        const message = `Hola! Me gustaría realizar el siguiente pedido:\n\n${cart.map(item =>
            `- ${item.title} x${item.quantity} (S/ ${(item.price * item.quantity).toFixed(2)})`
        ).join('\n')}\n\nTotal: S/ ${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}`;

        const whatsappUrl = `https://wa.me/51939111322?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    });
}

// Inicializar botón flotante
function initializeFloatingCart() {
    const floatBtn = document.getElementById('cart-float');
    const modal = document.getElementById('cart-modal');

    floatBtn?.addEventListener('click', function () {
        modal.classList.add('active');
        renderCartItems();
    });
}

// Mostrar notificación
function showCartNotification() {
    // Implementar feedback visual simple
    const floatBtn = document.getElementById('cart-float');
    floatBtn?.classList.add('bounce');
    setTimeout(() => floatBtn?.classList.remove('bounce'), 600);
}

// Inicializar filtros
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            renderProducts();
        });
    });
}

// Inicializar búsqueda
function initializeSearch() {
    const searchInput = document.getElementById('shop-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', function () {
        searchQuery = this.value;
        renderProducts();
    });
}

// Obtener nombre de categoría
function getCategoryName(category) {
    const names = {
        'metodos': 'Métodos',
        'partituras': 'Partituras',
        'teoria': 'Teoría'
    };
    return names[category] || category;
}
