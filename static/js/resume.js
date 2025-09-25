(function () {
    /**
     * Saarthi AI - Resume Builder JavaScript
     * Handles form initialization, live preview, save/load versions, PDF export
     */

    // ==========================================================================
    // GLOBAL VARIABLES & CONFIGURATION
    // ==========================================================================

    const RESUME_API_BASE_URL = window.location.origin; // Unique to avoid API_BASE_URL conflict
    const RESUME_CACHE_KEY_PREFIX = 'saarthi_resume_v2_'; // Unique prefix
    const RESUME_CACHE_EXPIRY_HOURS = 168; // 1 week expiry, renamed to avoid conflict
    let resumeInternshipData = null; // Unique variable name

    // Placeholder user_id (replace with actual auth logic)
    const USER_ID = 'placeholder-user-id'; // Update this with real user ID from auth

    // ==========================================================================
    // UTILITY FUNCTIONS
    // ==========================================================================

    // Fallback showToast if script.js doesn't provide it
    const showToast = window.showToast || ((message, type) => {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.log(`Toast: ${message} (${type})`);
            return;
        }
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} border-0`;
        toast.role = 'alert';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        setTimeout(() => bsToast.hide(), 5000);
    });

    /**
     * Format date for "Last updated"
     */
    function formatDate(date) {
        return new Intl.DateTimeFormat('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    }

    /**
     * Sanitize input to prevent XSS
     */
    function sanitizeInput(input) {
        return input ? input.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    }

    /**
     * Split input by newlines or commas for lists
     */
    function splitInput(input, delimiter = '\n') {
        return input ? input.split(delimiter).map(item => item.trim()).filter(item => item) : [];
    }

    /**
     * Debounce function to limit update frequency
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ==========================================================================
    // API COMMUNICATION
    // ==========================================================================

    /**
     * Fetch internship details
     */
    async function fetchInternshipDetails(internshipId) {
        try {
            const response = await fetch(`${RESUME_API_BASE_URL}/api/internship/${internshipId}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch internship:', error);
            showToast('Unable to load internship details. Using default values.', 'error');
            return null;
        }
    }

    // ==========================================================================
    // FORM HANDLING
    // ==========================================================================

    /**
     * Initialize form with internship data
     */
    async function initializeForm() {
        console.log('Initializing form...');
        const jobTitle = document.getElementById('job-title');
        if (!jobTitle) {
            console.error('Element #job-title not found');
            showToast('Job title element missing. Using default resume.', 'error');
        }

        const internshipId = sessionStorage.getItem('selectedInternshipId');
        if (internshipId) {
            resumeInternshipData = await fetchInternshipDetails(internshipId);
            if (resumeInternshipData && jobTitle) {
                jobTitle.textContent = `${resumeInternshipData.role_title} at ${resumeInternshipData.company}`;
                const summaryField = document.getElementById('summary');
                if (summaryField) {
                    summaryField.value = `Seeking a ${resumeInternshipData.role_title} position at ${resumeInternshipData.company} to apply my skills in ${resumeInternshipData.required_skills.join(', ')}.`;
                }
                const proTipSection = document.getElementById('pro-tip-section');
                const proTipText = document.getElementById('pro-tip-text');
                if (proTipSection && proTipText) {
                    proTipText.innerHTML = `Learn ${resumeInternshipData.required_skills[0]} at <a href="https://www.coursera.org" target="_blank">Coursera</a> to stand out for this role.`;
                    proTipSection.classList.remove('d-none');
                }
            } else if (jobTitle) {
                jobTitle.textContent = 'Generic Resume';
            }
        } else if (jobTitle) {
            jobTitle.textContent = 'Generic Resume';
        }
        updatePreview(); // Initial preview update
    }

    /**
     * Validate form
     */
    function validateForm() {
        const form = document.getElementById('resumeForm');
        if (!form) {
            console.error('Form #resumeForm not found');
            return false;
        }
        form.classList.add('was-validated');
        return form.checkValidity();
    }

    /**
     * Update live preview
     */
    function updatePreview() {
        console.log('Updating preview...');
        const container = document.getElementById('previewContainer');
        const preview = document.getElementById('previewResume');
        if (container && preview) {
            const containerRect = container.getBoundingClientRect();
            const previewRect = preview.getBoundingClientRect();
            console.log(`Container: ${containerRect.width}x${containerRect.height}, Preview: ${previewRect.width}x${previewRect.height}, Offset: ${previewRect.left - containerRect.left}`);
            preview.style.position = 'relative';
            preview.style.left = '0';
            preview.style.top = '0';
        } else {
            console.warn('Preview container or resume not found');
        }

        const fields = ['name', 'email', 'phone', 'github', 'linkedin', 'summary', 'education', 'experience', 'skills', 'projects'];
        const values = {};

        // Collect field values
        fields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                values[id] = sanitizeInput(element.value);
                console.log(`Field ${id} value: ${values[id]}`); // Debug log
            } else {
                console.warn(`Form element #${id} not found, using empty value`);
                values[id] = '';
            }
        });

        const name = values.name || 'Your Name';
        const email = values.email;
        const phone = values.phone;
        const github = values.github;
        const linkedin = values.linkedin;
        const summary = values.summary;
        const education = values.education;
        const experience = values.experience;
        const skills = values.skills;
        const projects = values.projects;

        // Update preview elements
        const previewName = document.getElementById('previewName');
        if (previewName) {
            previewName.textContent = name;
            console.log(`PreviewName updated to: ${name}`); // Debug log
        } else {
            console.warn('Preview element #previewName not found');
        }

        const previewContact = document.getElementById('previewContact');
        if (previewContact) {
            const contactParts = [];
            if (github) contactParts.push(`<a href="https://github.com/${github}" target="_blank">${github}</a>`);
            if (linkedin) contactParts.push(`<a href="https://linkedin.com/in/${linkedin}" target="_blank">${linkedin}</a>`);
            if (email) contactParts.push(`<a href="mailto:${email}" target="_blank">${email}</a>`);
            if (phone) contactParts.push(`<a href="tel:${phone}" target="_blank">${phone}</a>`);
            previewContact.innerHTML = contactParts.join(' | ');
            console.log(`PreviewContact updated to: ${previewContact.innerHTML}`); // Debug log
        } else {
            console.warn('Preview element #previewContact not found');
        }

        const previewSummary = document.getElementById('previewSummary');
        if (previewSummary) {
            previewSummary.innerHTML = summary.replace(/\n/g, '<br>') || '';
            console.log(`PreviewSummary updated to: ${previewSummary.innerHTML}`); // Debug log
        } else {
            console.warn('Preview element #previewSummary not found');
        }

        const previewEducation = document.getElementById('previewEducation');
        if (previewEducation) {
            const educationLines = splitInput(education);
            previewEducation.innerHTML = educationLines.map(line => `<div>${line}</div>`).join('');
            console.log(`PreviewEducation updated to: ${previewEducation.innerHTML}`); // Debug log
        } else {
            console.warn('Preview element #previewEducation not found');
        }

        const previewExperience = document.getElementById('previewExperience');
        if (previewExperience) {
            const experienceLines = splitInput(experience);
            const experienceHTML = experienceLines.map(line => {
                const [title, ...details] = line.split(':');
                const dateMatch = title.match(/\(([^)]+)\)$/);
                const date = dateMatch ? dateMatch[1] : '';
                const cleanTitle = dateMatch ? title.replace(/\([^)]+\)$/, '').trim() : title.trim();
                return `
                    <div class="job-entry">
                        <strong>${cleanTitle}</strong>
                        <span>${date}</span>
                    </div>
                    ${details.length ? `<div class="job-details"><ul><li>${details.join('').trim()}</li></ul></div>` : ''}
                `;
            }).join('');
            previewExperience.innerHTML = experienceHTML;
            console.log(`PreviewExperience updated to: ${previewExperience.innerHTML}`); // Debug log
        } else {
            console.warn('Preview element #previewExperience not found');
        }

        const previewSkills = document.getElementById('previewSkills');
        if (previewSkills) {
            const skillItems = splitInput(skills, ',');
            previewSkills.innerHTML = skillItems.map(item => `<li>${item}</li>`).join('');
            console.log(`PreviewSkills updated to: ${previewSkills.innerHTML}`); // Debug log
        } else {
            console.warn('Preview element #previewSkills not found');
        }

        const previewProjects = document.getElementById('previewProjects');
        if (previewProjects) {
            const projectLines = splitInput(projects);
            const projectsHTML = projectLines.map(line => {
                const [title, ...linkAndDesc] = line.split(':');
                const linkMatch = linkAndDesc.join('').match(/GitHub link: ([^\s]+)/);
                const link = linkMatch ? linkMatch[1] : '';
                const desc = linkMatch ? linkAndDesc.join('').replace(/GitHub link: [^\s]+/, '').trim() : linkAndDesc.join('').trim();
                return `
                    <div class="job-entry">
                        <strong>${title.trim()}</strong>
                        ${link ? `<span><a href="${link}" target="_blank">GitHub link</a></span>` : ''}
                    </div>
                    <div class="job-details">${desc}</div>
                `;
            }).join('');
            previewProjects.innerHTML = projectsHTML;
            console.log(`PreviewProjects updated to: ${previewProjects.innerHTML}`); // Debug log
        } else {
            console.warn('Preview element #previewProjects not found');
        }
    }

    // Debounced version of updatePreview
    const debouncedUpdatePreview = debounce(updatePreview, 300);

    /**
     * Save resume version to database
     */
    async function saveResumeVersion() {
        if (!validateForm()) {
            showToast('Please fill required fields.', 'error');
            return;
        }
        const fields = ['name', 'email', 'phone', 'github', 'linkedin', 'summary', 'education', 'experience', 'skills', 'projects'];
        const resumeData = {};
        fields.forEach(id => {
            const element = document.getElementById(id);
            resumeData[id] = element ? element.value : '';
        });
        resumeData.internshipId = sessionStorage.getItem('selectedInternshipId');

        try {
            const response = await fetch(`${RESUME_API_BASE_URL}/api/save_resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resume_data: resumeData,
                    user_id: USER_ID,
                    internship_id: resumeData.internshipId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.success) {
                updateVersionList();
                showToast('Resume saved successfully!', 'success');
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Failed to save resume:', error);
            showToast('Failed to save resume. Please try again.', 'error');
        }
    }

    /**
     * Update dropdown with saved resume versions
     */
    function updateVersionList() {
        // Note: This is a placeholder since we need a load endpoint to fetch saved resumes
        // For now, we'll simulate it or update it once we add /api/load_resume
        const versionList = document.getElementById('versionList');
        if (!versionList) {
            console.warn('Element #versionList not found');
            return;
        }
        versionList.innerHTML = '<li><a class="dropdown-item" href="#">Loading versions...</a></li>';
        // Future: Fetch from /api/load_resume with user_id
    }

    /**
     * Load resume version from database (placeholder)
     */
    function loadResumeVersion(resumeId) {
        // Placeholder - implement with /api/load_resume endpoint later
        showToast('Loading not implemented yet.', 'info');
    }

    /**
     * Download resume as PDF using server-side generation
     */
    async function downloadPDF() {
        console.log('Starting PDF generation...');
        if (!validateForm()) {
            console.warn('Form validation failed');
            showToast('Please fill required fields before downloading.', 'error');
            return;
        }

        const fields = ['name', 'email', 'phone', 'github', 'linkedin', 'summary', 'education', 'experience', 'skills', 'projects'];
        const resumeData = {};
        fields.forEach(id => {
            const element = document.getElementById(id);
            resumeData[id] = element ? element.value : '';
        });

        try {
            const response = await fetch(`${RESUME_API_BASE_URL}/api/generate_pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resumeData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${resumeData['name'] || 'Resume'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('PDF downloaded successfully!', 'success');
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            showToast('Failed to download PDF. Please try again.', 'error');
        }
    }

    // ==========================================================================
    // EVENT LISTENERS & INITIALIZATION
    // ==========================================================================

    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Saarthi AI Resume Builder Initialized');

        // Initialize form and fetch internship data
        initializeForm().catch(error => {
            console.error('Initialization failed:', error);
            showToast('Failed to initialize resume builder. Using default values.', 'error');
            updatePreview(); // Ensure preview updates
        });

        // Set up form input listeners
        const fields = ['name', 'email', 'phone', 'github', 'linkedin', 'summary', 'education', 'experience', 'skills', 'projects'];
        fields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', debouncedUpdatePreview);
                console.log(`Added listener to #${id}`); // Debug log
            } else {
                console.warn(`Form element #${id} not found`);
            }
        });

        // Set up button listeners
        const saveButton = document.getElementById('saveVersion');
        if (saveButton) {
            saveButton.addEventListener('click', saveResumeVersion);
            console.log('Added listener to #saveVersion'); // Debug log
        } else {
            console.warn('Element #saveVersion not found');
        }

        const downloadButton = document.getElementById('downloadPDF');
        if (downloadButton) {
            downloadButton.addEventListener('click', downloadPDF);
            console.log('Added listener to #downloadPDF'); // Debug log
        } else {
            console.warn('Element #downloadPDF not found');
        }

        // Populate version list
        updateVersionList();

        // Add keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                saveResumeVersion();
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
                event.preventDefault();
                downloadPDF();
            }
        });

        // Network status monitoring
        window.addEventListener('online', () => {
            showToast('Back online! You can save and download your resume.', 'success');
        });
        window.addEventListener('offline', () => {
            showToast('You\'re offline. Saved resumes are still available.', 'info');
        });
    });
})();