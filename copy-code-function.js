// Copy student code to clipboard
function copyStudentCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        // Show temporary success feedback
        const btn = event.target.closest('.btn-copy-code');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="ri-check-line"></i>';
        btn.style.color = 'var(--success)';

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.color = '';
        }, 1500);
    }).catch(err => {
        console.error('Error copying code:', err);
        alert('Error al copiar código');
    });
}
