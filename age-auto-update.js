// Auto-update age when birthday changes
document.getElementById('student-cumpleanos')?.addEventListener('change', function () {
    const birthdayValue = this.value;
    if (birthdayValue) {
        const birthday = new Date(birthdayValue);
        const today = new Date();
        const edad = Math.floor((today - birthday) / (365.25 * 24 * 60 * 60 * 1000));
        document.getElementById('student-edad').value = edad;
    }
});
