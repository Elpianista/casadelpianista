// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // 1. LIBRARY HUB: Category Tabs Filtering (Simulated)
    const tabBtns = document.querySelectorAll('.tab-btn');
    const articleCards = document.querySelectorAll('.article-card');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked
            btn.classList.add('active');

            const category = btn.getAttribute('data-category');

            // Filter logic
            articleCards.forEach(card => {
                // Remove animation initially for reset
                card.style.animation = 'none';
                card.offsetHeight; // trigger reflow

                if (category === 'todos' || card.getAttribute('data-category') === category) {
                    card.style.display = 'flex';
                    // Re-apply animation
                    card.style.animation = 'fadeInUp 0.6s ease forwards';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // 2. LIBRARY HUB: Search Simulation
    const searchInput = document.getElementById('library-search');
    const searchBtn = document.querySelector('.search-btn');

    const handleSearch = () => {
        if (!searchInput) return;

        const query = searchInput.value.toLowerCase().trim();
        let found = false;

        articleCards.forEach(card => {
            const title = card.querySelector('.article-title').textContent.toLowerCase();
            const excerpt = card.querySelector('.article-excerpt').textContent.toLowerCase();
            const categoryBadge = card.querySelector('.article-category-badge').textContent.toLowerCase();

            if (title.includes(query) || excerpt.includes(query) || categoryBadge.includes(query)) {
                card.style.display = 'flex';
                found = true;
            } else {
                card.style.display = 'none';
            }
        });

        // If no results, could show a styled message, but for simulation just filtering is enough.
    };

    if (searchInput) {
        searchInput.addEventListener('keyup', handleSearch);
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    // 3. ARTICLE DETAIL: "Like" Button Logic
    const likeBtn = document.getElementById('like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', function () {
            const isLiked = this.classList.contains('liked');
            const countSpan = this.querySelector('.like-count');
            let count = parseInt(countSpan.textContent);

            if (isLiked) {
                this.classList.remove('liked');
                count--;
            } else {
                this.classList.add('liked');
                count++;
                // Add tiny heartbeat animation
                this.style.animation = 'none';
                this.offsetHeight; /* trigger reflow */
                this.style.animation = 'pulse 0.3s ease';
            }

            countSpan.textContent = count;
        });
    }

    // 4. ARTICLE DETAIL: Share Buttons Validation Notification
    const shareBtns = document.querySelectorAll('.share-btn');
    shareBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Just a visual feedback for the UI simulation
            const originalTitle = btn.getAttribute('title');

            // Temporary feedback
            const icon = btn.querySelector('i');
            const originalIconClass = icon.className;
            icon.className = 'ri-check-line';
            icon.style.color = 'var(--color-gold)';

            setTimeout(() => {
                icon.className = originalIconClass;
                icon.style.color = '';
            }, 1500);
        });
    });
});

