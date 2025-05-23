document.addEventListener('DOMContentLoaded', function() {
    // Handle form submission and loading state
    const uploadForm = document.querySelector('form');
    const submitButton = uploadForm?.querySelector('button[type="submit"]');
    
    if (uploadForm && submitButton) {
        uploadForm.addEventListener('submit', function(e) {
            // Show loading state
            submitButton.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Processing...
            `;
            submitButton.disabled = true;
            
            // Add loading class to form
            uploadForm.classList.add('loading');
        });
    }

    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // File input validation
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const fileSize = file.size / 1024 / 1024; // Convert to MB
                if (fileSize > 16) {
                    alert('File size must be less than 16MB');
                    fileInput.value = '';
                }
            }
        });
    }

    // Location input auto-complete placeholder
    // TODO: Add Google Places API integration for location autocomplete
});
