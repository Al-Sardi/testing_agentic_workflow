// Get DOM elements
const form = document.getElementById('uploadForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const pdfInput = document.getElementById('pdf');
const fileNameDisplay = document.getElementById('fileName');
const submitButton = document.getElementById('submitButton');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const successText = document.getElementById('successText');
const errorText = document.getElementById('errorText');

// Error message elements
const nameError = document.getElementById('nameError');
const emailError = document.getElementById('emailError');
const pdfError = document.getElementById('pdfError');

// File input change handler
pdfInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Validate file type
        if (file.type !== 'application/pdf') {
            showError(pdfError, 'Bitte wählen Sie eine PDF-Datei aus');
            pdfInput.value = '';
            fileNameDisplay.textContent = '';
            fileNameDisplay.classList.remove('active');
            return;
        }

        // Validate file size (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showError(pdfError, 'Die Datei ist zu groß. Maximale Größe: 10 MB');
            pdfInput.value = '';
            fileNameDisplay.textContent = '';
            fileNameDisplay.classList.remove('active');
            return;
        }

        // Display file name
        fileNameDisplay.textContent = `📄 ${file.name} (${formatFileSize(file.size)})`;
        fileNameDisplay.classList.add('active');
        clearError(pdfError);
    }
});

// Form validation
function validateForm() {
    let isValid = true;

    // Validate name
    if (nameInput.value.trim().length < 2) {
        showError(nameError, 'Bitte geben Sie einen gültigen Namen ein');
        isValid = false;
    } else {
        clearError(nameError);
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
        showError(emailError, 'Bitte geben Sie eine gültige E-Mail-Adresse ein');
        isValid = false;
    } else {
        clearError(emailError);
    }

    // Validate PDF
    if (!pdfInput.files || pdfInput.files.length === 0) {
        showError(pdfError, 'Bitte wählen Sie eine PDF-Datei aus');
        isValid = false;
    } else {
        clearError(pdfError);
    }

    return isValid;
}

// Form submit handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Hide previous messages
    successMessage.classList.remove('active');
    errorMessage.classList.remove('active');

    // Validate form
    if (!validateForm()) {
        return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('name', nameInput.value.trim());
    formData.append('email', emailInput.value.trim());
    formData.append('pdf', pdfInput.files[0]);

    // Show progress
    progressContainer.classList.add('active');
    submitButton.disabled = true;
    submitButton.classList.add('loading');

    try {
        // Simulate upload progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            progressFill.style.width = `${progress}%`;
        }, 200);

        // Send request - using relative path for deployment compatibility
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
        });

        clearInterval(progressInterval);
        progressFill.style.width = '100%';

        const data = await response.json();

        if (response.ok) {
            // Success
            progressText.textContent = 'Erfolgreich hochgeladen!';
            setTimeout(() => {
                progressContainer.classList.remove('active');
                successText.textContent = data.message || 'Ihre PDF wurde erfolgreich verarbeitet. Überprüfen Sie Ihre E-Mail für die Zusammenfassung.';
                successMessage.classList.add('active');

                // Reset form
                form.reset();
                fileNameDisplay.textContent = '';
                fileNameDisplay.classList.remove('active');
                progressFill.style.width = '0%';
            }, 1000);
        } else {
            // Error from server
            throw new Error(data.error || 'Ein Fehler ist aufgetreten');
        }

    } catch (error) {
        console.error('Upload error:', error);
        progressContainer.classList.remove('active');
        progressFill.style.width = '0%';

        errorText.textContent = error.message || 'Ein Fehler ist beim Hochladen aufgetreten. Bitte versuchen Sie es erneut.';
        errorMessage.classList.add('active');
    } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
    }
});

// Helper functions
function showError(element, message) {
    element.textContent = message;
    element.classList.add('active');
}

function clearError(element) {
    element.textContent = '';
    element.classList.remove('active');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Real-time validation
nameInput.addEventListener('blur', () => {
    if (nameInput.value.trim().length > 0 && nameInput.value.trim().length < 2) {
        showError(nameError, 'Der Name muss mindestens 2 Zeichen lang sein');
    } else {
        clearError(nameError);
    }
});

emailInput.addEventListener('blur', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailInput.value.trim().length > 0 && !emailRegex.test(emailInput.value.trim())) {
        showError(emailError, 'Bitte geben Sie eine gültige E-Mail-Adresse ein');
    } else {
        clearError(emailError);
    }
});
