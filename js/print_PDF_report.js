document.addEventListener('DOMContentLoaded', () => {
    const pdfBtn = document.getElementById('generatePdfBtn');

    if (pdfBtn) {
        pdfBtn.addEventListener('click', generatePDF);
    }
});

function generatePDF() {
    const sections = document.querySelectorAll(
        '#salesSection, #liveViewsSection, #employeeSection, #payoutSection, #inventorySection'
    );

    let firstVisible = null;
    sections.forEach((sec) => {
        sec.classList.remove('first-print-section');
        if (!sec.classList.contains('d-none') && !firstVisible) {
            firstVisible = sec;
        }
    });
    if (firstVisible) {
        firstVisible.classList.add('first-print-section');
    }

    window.print();
}
