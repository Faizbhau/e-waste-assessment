/**
 * Main JavaScript file for E-Waste Quality Assessment application
 */

// Global variables
let isLoading = false;

// Function to handle file upload preview
function handleFileSelect(evt) {
    const fileInput = evt.target;
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewContainer.classList.remove('d-none');
        };
        
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        previewContainer.classList.add('d-none');
    }
}

// Function to show loading indicator
function showLoading() {
    isLoading = true;
    
    // Create loading overlay if it doesn't exist
    if (!document.getElementById('loading-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'spinner-overlay';
        overlay.innerHTML = `
            <div class="spinner-container">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 mb-0">Processing...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        document.getElementById('loading-overlay').style.display = 'flex';
    }
}

// Function to hide loading indicator
function hideLoading() {
    isLoading = false;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Function to download assessment report
function downloadReport(format) {
    showLoading();
    
    // Navigate to the download endpoint
    window.location.href = `/api/download-report?format=${format}`;
    
    // Hide loading after a short delay
    setTimeout(hideLoading, 1000);
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // File input event listener
    const fileInput = document.getElementById('file');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Form submission
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function() {
            const fileInput = document.getElementById('file');
            if (fileInput && fileInput.files.length > 0) {
                showLoading();
            }
        });
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    if (tooltipTriggerList.length > 0) {
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
});

// Handle errors
window.addEventListener('error', function(e) {
    console.error('Global error handler:', e.error);
    hideLoading();
    
    // Show error message
    const errorMsg = 'An error occurred: ' + (e.error ? e.error.message : 'Unknown error');
    if (!document.querySelector('.alert-danger')) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            ${errorMsg}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        const main = document.querySelector('main');
        if (main && main.firstChild) {
            main.insertBefore(alertDiv, main.firstChild);
        }
    }
});
