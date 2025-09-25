// /**
//  * Saarthi AI - Frontend JavaScript
//  * Handles form submission, API calls, and dynamic UI updates
//  */

// // ==========================================================================
// // GLOBAL VARIABLES & CONFIGURATION
// // ==========================================================================

// const API_BASE_URL = window.location.origin;
// const CACHE_KEY_PREFIX = 'saarthi_';
// const CACHE_EXPIRY_HOURS = 24;

// // State management
// let currentSearchResults = null;
// let isSearching = false;

// // ==========================================================================
// // UTILITY FUNCTIONS
// // ==========================================================================

// /**
//  * Display toast notifications to user
//  */
// function showToast(message, type = 'info') {
//     let toastContainer = document.getElementById('toast-container');
//     if (!toastContainer) {
//         toastContainer = document.createElement('div');
//         toastContainer.id = 'toast-container';
//         toastContainer.className = 'position-fixed top-0 end-0 p-3';
//         toastContainer.style.zIndex = '9999';
//         document.body.appendChild(toastContainer);
//     }

//     const toastId = 'toast-' + Date.now();
//     const toastHTML = `
//         <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0" role="alert">
//             <div class="d-flex">
//                 <div class="toast-body">
//                     <i class="bi bi-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
//                     ${message}
//                 </div>
//                 <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
//             </div>
//         </div>
//     `;

//     toastContainer.insertAdjacentHTML('beforeend', toastHTML);
//     const toastElement = document.getElementById(toastId);
//     const toast = new bootstrap.Toast(toastElement, {
//         autohide: true,
//         delay: type === 'error' ? 8000 : 4000
//     });
//     toast.show();

//     toastElement.addEventListener('hidden.bs.toast', () => {
//         toastElement.remove();
//     });
// }

// /**
//  * Cache management for offline support
//  */
// function setCacheData(key, data) {
//     try {
//         const cacheData = { data, timestamp: Date.now(), expires: Date.now() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000) };
//         localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData));
//     } catch (error) {
//         console.warn('Cache storage failed:', error);
//     }
// }

// function getCacheData(key) {
//     try {
//         const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
//         if (!cached) return null;
//         const cacheData = JSON.parse(cached);
//         if (Date.now() > cacheData.expires) {
//             localStorage.removeItem(CACHE_KEY_PREFIX + key);
//             return null;
//         }
//         return cacheData.data;
//     } catch (error) {
//         console.warn('Cache retrieval failed:', error);
//         return null;
//     }
// }

// /**
//  * Smooth scroll to element
//  */
// function scrollToElement(elementId) {
//     const element = document.getElementById(elementId);
//     if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
// }

// /**
//  * Generate cache key from form data
//  */
// function generateCacheKey(formData) {
//     const keyData = {
//         education: formData.education,
//         interests: formData.interests.sort().join(','),
//         location: formData.location,
//         skills: formData.skills
//     };
//     return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
// }

// // ==========================================================================
// // API COMMUNICATION
// // ==========================================================================

// /**
//  * Make API request with error handling and loading states
//  */
// async function makeAPIRequest(endpoint, options = {}) {
//     try {
//         const response = await fetch(`${API_BASE_URL}${endpoint}`, {
//             headers: { 'Content-Type': 'application/json', ...options.headers },
//             ...options
//         });
//         if (!response.ok) {
//             const errorData = await response.json().catch(() => ({}));
//             throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
//         }
//         return await response.json();
//     } catch (error) {
//         console.error('API Request failed:', error);
//         if (!navigator.onLine) throw new Error('No internet connection. Please check your network and try again.');
//         throw error;
//     }
// }

// /**
//  * Search for internships
//  */
// async function searchInternships(formData) {
//     const cacheKey = generateCacheKey(formData);
//     const cachedResults = getCacheData(cacheKey);
//     if (cachedResults) {
//         console.log('Using cached results');
//         return cachedResults;
//     }
//     const results = await makeAPIRequest('/api/search', { method: 'POST', body: JSON.stringify(formData) });
//     setCacheData(cacheKey, results);
//     return results;
// }

// // ==========================================================================
// // FORM HANDLING
// // ==========================================================================

// /**
//  * Collect and validate form data
//  */
// function collectFormData() {
//     const form = document.getElementById('searchForm');
//     const formData = new FormData(form);
//     const interests = [];
//     document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => interests.push(checkbox.value));

//     const education = formData.get('education');
//     const location = formData.get('location');
//     const skills = formData.get('skills') || '';

//     if (!education) throw new Error('Please select your education level');
//     if (!location) throw new Error('Please select your preferred location');
//     if (interests.length === 0) throw new Error('Please select at least one area of interest');

//     return { education, interests, location, skills: skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0), preferred_location: location };
// }

// /**
//  * Update button loading state
//  */
// function updateButtonState(isLoading) {
//     const searchBtn = document.getElementById('searchBtn');
//     const btnText = searchBtn.querySelector('.btn-text');
//     const spinner = document.getElementById('loadingSpinner');

//     if (isLoading) {
//         searchBtn.disabled = true;
//         btnText.textContent = 'Finding Your Perfect Matches...';
//         spinner.classList.remove('d-none');
//         searchBtn.classList.add('loading');
//     } else {
//         searchBtn.disabled = false;
//         btnText.textContent = 'Find My Perfect Internships';
//         spinner.classList.add('d-none');
//         searchBtn.classList.remove('loading');
//     }
// }

// /**
//  * Handle form submission
//  */
// async function handleFormSubmission(event) {
//     event.preventDefault();
//     if (isSearching) return;
//     try {
//         isSearching = true;
//         updateButtonState(true);
//         const formData = collectFormData();
//         console.log('Searching with data:', formData);
//         const results = await searchInternships(formData);
//         console.log('Search results:', results);
//         currentSearchResults = results;
//         displaySearchResults(results);
//         showToast(`Found ${results.matches.length} perfect matches for you!`, 'success');
//         setTimeout(() => scrollToElement('results-section'), 500);
//     } catch (error) {
//         console.error('Search failed:', error);
//         showToast(error.message, 'error');
//         document.getElementById('searchForm').classList.add('was-validated');
//     } finally {
//         isSearching = false;
//         updateButtonState(false);
//     }
// }

// // ==========================================================================
// // RESULTS DISPLAY
// // ==========================================================================

// /**
//  * Create internship card HTML
//  */
// function createInternshipCard(internship, index) {
//     const explanations = internship.explanations || [];
//     const proTips = internship.pro_tips || [];
//     const skills = internship.required_skills || [];
//     const companyInitials = internship.company.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();

//     return `
//         <div class="col-lg-6 col-xl-4">
//             <div class="card internship-card fade-in" style="animation-delay: ${index * 0.1}s">
//                 <div class="match-score">${Math.round(internship.match_score)}% Match</div>
//                 <div class="company-logo">${companyInitials}</div>
//                 <h3 class="role-title" data-internship-id="${internship.id}">${internship.role_title}</h3>
//                 <p class="company-name">${internship.company}</p>
//                 <div class="internship-meta">
//                     <div class="meta-item"><i class="bi bi-geo-alt-fill"></i>${internship.location}</div>
//                     <div class="meta-item"><i class="bi bi-clock-fill"></i>${internship.duration}</div>
//                     <div class="meta-item"><i class="bi bi-currency-rupee"></i>${internship.stipend}</div>
//                 </div>
//                 <p class="description">${internship.description}</p>
//                 ${explanations.length > 0 ? `<div class="explanation-section"><div class="explanation-title">Why This Matches You</div><ul class="explanation-list">${explanations.map(exp => `<li>${exp}</li>`).join('')}</ul></div>` : ''}
//                 ${proTips.length > 0 ? `<div class="pro-tip"><p class="pro-tip-content">${proTips[0]}</p></div>` : ''}
//                 ${skills.length > 0 ? `<div class="skills-tags">${skills.slice(0, 4).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}${skills.length > 4 ? `<span class="skill-tag">+${skills.length - 4} more</span>` : ''}</div>` : ''}
//                 <div class="card-actions">
//                     <button class="btn btn-primary flex-fill build-resume-btn" data-internship-id="${internship.id}"><i class="bi bi-file-earmark-person me-2"></i>Build Resume</button>
//                     <button class="btn btn-success apply-now-btn" data-internship-id="${internship.id}"><i class="bi bi-arrow-right-circle me-2"></i>Apply Now</button>
//                 </div>
//             </div>
//         </div>
//     `;
// }

// /**
//  * Display search results
//  */
// function displaySearchResults(results) {
//     const resultsSection = document.getElementById('results-section');
//     const resultsContainer = document.getElementById('resultsContainer');
//     const noResultsDiv = document.getElementById('no-results');
//     const shareSection = document.getElementById('share-section');
//     const shareUrl = document.getElementById('shareUrl');

//     document.getElementById('search-form').style.display = 'none';
//     resultsSection.classList.remove('d-none');

//     if (results.matches && results.matches.length > 0) {
//         noResultsDiv.classList.add('d-none');
//         resultsContainer.innerHTML = results.matches.map((internship, index) => createInternshipCard(internship, index)).join('');
        
//         document.querySelectorAll('.build-resume-btn').forEach(button => {
//             button.addEventListener('click', () => {
//                 sessionStorage.setItem('selectedInternshipId', button.getAttribute('data-internship-id'));
//                 window.location.href = '/resume-builder';
//             });
//         });

//         document.querySelectorAll('.apply-now-btn').forEach(button => {
//             button.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 showApplyNowModal(button.getAttribute('data-internship-id'));
//             });
//         });

//         const subtitle = document.getElementById('results-subtitle');
//         subtitle.textContent = `Found ${results.matches.length} perfect matches based on your profile`;
//         if (results.share_id) {
//             shareUrl.value = `${window.location.origin}/shared/${results.share_id}`;
//             shareSection.style.display = 'block';
//         }
//     } else {
//         resultsContainer.innerHTML = '';
//         noResultsDiv.classList.remove('d-none');
//         shareSection.style.display = 'none';
//     }
// }

// /**
//  * Show apply now modal
//  */
// function showApplyNowModal(internshipId) {
//     let modal = document.getElementById('applyNowModal');
//     if (!modal) {
//         const modalHTML = `
//             <div class="modal fade" id="applyNowModal" tabindex="-1" aria-labelledby="applyNowModalLabel" aria-hidden="true">
//                 <div class="modal-dialog modal-dialog-centered">
//                     <div class="modal-content">
//                         <div class="modal-header">
//                             <h5 class="modal-title" id="applyNowModalLabel">Application Redirect</h5>
//                             <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
//                         </div>
//                         <div class="modal-body">
//                             You would now be redirected to the official portal to complete your application with your new resume.
//                         </div>
//                         <div class="modal-footer">
//                             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
//                             <button type="button" class="btn btn-primary okay-btn" data-internship-id="${internshipId}">Okay</button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//         document.body.insertAdjacentHTML('beforeend', modalHTML);
//         modal = document.getElementById('applyNowModal');
//         document.querySelector('.okay-btn').addEventListener('click', () => {
//             window.location.href = `/apply-test?internshipId=${internshipId}`;
//         });
//     }
//     const bsModal = new bootstrap.Modal(modal);
//     bsModal.show();
// }

// // ==========================================================================
// // INTERNSHIP ACTIONS
// // ==========================================================================

// /**
//  * Navigate to resume builder for specific internship
//  */
// function buildResumeFor(internshipId) {
//     try {
//         sessionStorage.setItem('selectedInternshipId', internshipId);
//         sessionStorage.setItem('searchResults', JSON.stringify(currentSearchResults));
//         window.location.href = '/resume-builder';
//     } catch (error) {
//         console.error('Error navigating to resume builder:', error);
//         showToast('Unable to open resume builder. Please try again.', 'error');
//     }
// }

// /**
//  * View detailed internship information
//  */
// async function viewInternshipDetails(internshipId) {
//     try {
//         let internship = currentSearchResults?.matches?.find(match => match.id === internshipId);
//         if (!internship) internship = await makeAPIRequest(`/api/internship/${internshipId}`);
//         showInternshipModal(internship);
//     } catch (error) {
//         console.error('Error fetching internship details:', error);
//         showToast('Unable to load internship details. Please try again.', 'error');
//     }
// }

// /**
//  * Show internship details in modal
//  */
// function showInternshipModal(internship) {
//     let modal = document.getElementById('internshipModal');
//     if (!modal) {
//         const modalHTML = `
//             <div class="modal fade" id="internshipModal" tabindex="-1">
//                 <div class="modal-dialog modal-lg modal-dialog-scrollable">
//                     <div class="modal-content">
//                         <div class="modal-header">
//                             <h5 class="modal-title" id="modalTitle"></h5>
//                             <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
//                         </div>
//                         <div class="modal-body" id="modalBody"></div>
//                         <div class="modal-footer">
//                             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
//                             <button type="button" class="btn btn-primary" id="modalResumeBtn"><i class="bi bi-file-earmark-person me-2"></i>Build Resume</button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//         document.body.insertAdjacentHTML('beforeend', modalHTML);
//         modal = document.getElementById('internshipModal');
//     }
//     document.getElementById('modalTitle').textContent = internship.role_title;
//     document.getElementById('modalBody').innerHTML = `
//         <div class="row">
//             <div class="col-md-8">
//                 <h6 class="text-primary mb-3">Company</h6><p>${internship.company}</p>
//                 <h6 class="text-primary mb-3">Description</h6><p>${internship.description}</p>
//                 <h6 class="text-primary mb-3">Location</h6><p><i class="bi bi-geo-alt me-2"></i>${internship.location}</p>
//                 <h6 class="text-primary mb-3">Required Skills</h6><div class="d-flex flex-wrap gap-2">${(internship.required_skills || []).map(skill => `<span class="badge bg-light text-dark">${skill}</span>`).join('')}</div>
//             </div>
//             <div class="col-md-4">
//                 <div class="card bg-light"><div class="card-body"><h6 class="card-title">Quick Info</h6><p class="mb-2"><strong>Duration:</strong> ${internship.duration}</p><p class="mb-2"><strong>Stipend:</strong> ${internship.stipend}</p><p class="mb-2"><strong>Deadline:</strong> ${internship.deadline}</p><p class="mb-0"><strong>Qualification:</strong> ${internship.min_qualification}</p></div></div>
//             </div>
//         </div>
//     `;
//     document.getElementById('modalResumeBtn').onclick = () => { bootstrap.Modal.getInstance(modal).hide(); buildResumeFor(internship.id); };
//     new bootstrap.Modal(modal).show();
// }

// // ==========================================================================
// // UI HELPERS
// // ==========================================================================

// /**
//  * Scroll to form section
//  */
// function scrollToForm() { scrollToElement('search-form'); }

// /**
//  * Reset search and show form
//  */
// function resetSearch() {
//     document.getElementById('results-section').classList.add('d-none');
//     document.getElementById('search-form').style.display = 'block';
//     document.getElementById('searchForm').classList.remove('was-validated');
//     currentSearchResults = null;
//     scrollToForm();
//     showToast('Ready for a new search!', 'info');
// }

// /**
//  * Copy share URL to clipboard
//  */
// async function copyShareUrl() {
//     const shareUrl = document.getElementById('shareUrl');
//     try {
//         await navigator.clipboard.writeText(shareUrl.value);
//         showToast('Share link copied to clipboard!', 'success');
//     } catch (error) {
//         shareUrl.select();
//         document.execCommand('copy');
//         showToast('Share link copied to clipboard!', 'success');
//     }
// }

// /**
//  * Handle shared results from URL
//  */
// async function handleSharedResults() {
//     const path = window.location.pathname;
//     const sharedMatch = path.match(/^\/shared\/(.+)$/);
//     if (sharedMatch) {
//         try {
//             const results = await makeAPIRequest(`/api/shared/${sharedMatch[1]}`);
//             currentSearchResults = results;
//             displaySearchResults(results);
//             showToast('Shared results loaded successfully!', 'success');
//         } catch (error) {
//             console.error('Error loading shared results:', error);
//             showToast('Unable to load shared results. The link may be expired.', 'error');
//         }
//     }
// }

// // ==========================================================================
// // EVENT LISTENERS & INITIALIZATION
// // ==========================================================================

// document.addEventListener('DOMContentLoaded', function() {
//     console.log('🚀 Saarthi AI Frontend Initialized');
//     const searchForm = document.getElementById('searchForm');
//     if (searchForm) searchForm.addEventListener('submit', handleFormSubmission);
//     handleSharedResults();
//     document.addEventListener('keydown', function(event) {
//         if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
//             event.preventDefault();
//             document.getElementById('education').focus();
//         }
//         if (event.key === 'Escape' && currentSearchResults) resetSearch();
//     });
//     let scrollToTopBtn = document.createElement('button');
//     scrollToTopBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
//     scrollToTopBtn.className = 'btn btn-primary rounded-circle scroll-to-top';
//     scrollToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
//     document.body.appendChild(scrollToTopBtn);
//     window.addEventListener('scroll', function() {
//         if (window.scrollY > 500) scrollToTopBtn.classList.add('show');
//         else scrollToTopBtn.classList.remove('show');
//     });
//     window.addEventListener('online', () => showToast('Back online! You can now search for internships.', 'success'));
//     window.addEventListener('offline', () => showToast('You\'re offline. Cached results will still be available.', 'info'));
// });

// // ==========================================================================
// // GLOBAL FUNCTION EXPORTS
// // ==========================================================================

// window.scrollToForm = scrollToForm;
// window.resetSearch = resetSearch;
// window.copyShareUrl = copyShareUrl;
// window.buildResumeFor = buildResumeFor;
// window.viewInternshipDetails = viewInternshipDetails;


/**
 * Saarthi AI - Frontend JavaScript
 * Handles form submission, API calls, and dynamic UI updates
 */

// ==========================================================================
// GLOBAL VARIABLES & CONFIGURATION
// ==========================================================================

// // Use window.location.origin to correctly target the deployed backend URL (e.g., https://saarthi-ai-sih.onrender.com)
// const API_BASE_URL = window.location.origin; 
// const CACHE_KEY_PREFIX = 'saarthi_';
// const CACHE_EXPIRY_HOURS = 24;

// // State management
// let currentSearchResults = null;
// let isSearching = false;

// // ==========================================================================
// // UTILITY FUNCTIONS
// // ==========================================================================

// /**
//  * Display toast notifications to user
//  */
// function showToast(message, type = 'info') {
//     let toastContainer = document.getElementById('toast-container');
//     if (!toastContainer) {
//         toastContainer = document.createElement('div');
//         toastContainer.id = 'toast-container';
//         toastContainer.className = 'position-fixed top-0 end-0 p-3';
//         toastContainer.style.zIndex = '9999';
//         document.body.appendChild(toastContainer);
//     }

//     const toastId = 'toast-' + Date.now();
//     const toastHTML = `
//         <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0" role="alert">
//             <div class="d-flex">
//                 <div class="toast-body">
//                     <i class="bi bi-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
//                     ${message}
//                 </div>
//                 <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
//             </div>
//         </div>
//     `;

//     toastContainer.insertAdjacentHTML('beforeend', toastHTML);
//     const toastElement = document.getElementById(toastId);
//     // eslint-disable-next-line no-undef
//     const toast = new bootstrap.Toast(toastElement, {
//         autohide: true,
//         delay: type === 'error' ? 8000 : 4000
//     });
//     toast.show();

//     toastElement.addEventListener('hidden.bs.toast', () => {
//         toastElement.remove();
//     });
// }

// /**
//  * Cache management for offline support
//  */
// function setCacheData(key, data) {
//     try {
//         const cacheData = { data, timestamp: Date.now(), expires: Date.now() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000) };
//         localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData));
//     } catch (error) {
//         console.warn('Cache storage failed:', error);
//     }
// }

// function getCacheData(key) {
//     try {
//         const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
//         if (!cached) return null;
//         const cacheData = JSON.parse(cached);
//         if (Date.now() > cacheData.expires) {
//             localStorage.removeItem(CACHE_KEY_PREFIX + key);
//             return null;
//         }
//         return cacheData.data;
//     } catch (error) {
//         console.warn('Cache retrieval failed:', error);
//         return null;
//     }
// }

// /**
//  * Smooth scroll to element
//  */
// function scrollToElement(elementId) {
//     const element = document.getElementById(elementId);
//     if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
// }

// /**
//  * Generate cache key from form data
//  */
// function generateCacheKey(formData) {
//     const keyData = {
//         education: formData.education,
//         interests: formData.interests.sort().join(','),
//         location: formData.location,
//         skills: formData.skills
//     };
//     return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
// }

// // ==========================================================================
// // API COMMUNICATION
// // ==========================================================================

// /**
//  * Make API request with error handling and loading states
//  */
// async function makeAPIRequest(endpoint, options = {}) {
//     try {
//         const response = await fetch(`${API_BASE_URL}${endpoint}`, {
//             headers: { 'Content-Type': 'application/json', ...options.headers },
//             ...options
//         });
//         if (!response.ok) {
//             const errorData = await response.json().catch(() => ({}));
//             // Throw the specific error from the backend if available
//             throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
//         }
//         return await response.json();
//     } catch (error) {
//         console.error('API Request failed:', error);
//         if (!navigator.onLine) throw new Error('No internet connection. Please check your network and try again.');
//         throw error;
//     }
// }

// /**
//  * Search for internships
//  */
// async function searchInternships(formData) {
//     const cacheKey = generateCacheKey(formData);
//     const cachedResults = getCacheData(cacheKey);
//     if (cachedResults) {
//         console.log('Using cached results');
//         return cachedResults;
//     }
//     const results = await makeAPIRequest('/api/search', { method: 'POST', body: JSON.stringify(formData) });
//     setCacheData(cacheKey, results);
//     return results;
// }

// // ==========================================================================
// // FORM HANDLING
// // ==========================================================================

// /**
//  * Collect and validate form data
//  */
// function collectFormData() {
//     const form = document.getElementById('searchForm');
//     const formData = new FormData(form);
//     const interests = [];
//     document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => interests.push(checkbox.value));

//     const education = formData.get('education');
//     const location = formData.get('location');
//     const skills = formData.get('skills') || '';

//     if (!education) throw new Error('Please select your education level');
//     if (!location) throw new Error('Please select your preferred location');
//     if (interests.length === 0) throw new Error('Please select at least one area of interest');

//     return { education, interests, location, skills: skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0), preferred_location: location };
// }

// /**
//  * Update button loading state
//  */
// function updateButtonState(isLoading) {
//     const searchBtn = document.getElementById('searchBtn');
//     const btnText = searchBtn.querySelector('.btn-text');
//     const spinner = document.getElementById('loadingSpinner');

//     if (isLoading) {
//         searchBtn.disabled = true;
//         btnText.textContent = 'Finding Your Perfect Matches...';
//         spinner.classList.remove('d-none');
//         searchBtn.classList.add('loading');
//     } else {
//         searchBtn.disabled = false;
//         btnText.textContent = 'Find My Perfect Internships';
//         spinner.classList.add('d-none');
//         searchBtn.classList.remove('loading');
//     }
// }

// /**
//  * Handle form submission
//  */
// async function handleFormSubmission(event) {
//     event.preventDefault();
//     if (isSearching) return;
//     try {
//         isSearching = true;
//         updateButtonState(true);
//         const formData = collectFormData();
//         console.log('Searching with data:', formData);
//         const results = await searchInternships(formData);
//         console.log('Search results:', results);
//         currentSearchResults = results;
//         displaySearchResults(results);
//         showToast(`Found ${results.matches.length} perfect matches for you!`, 'success');
//         setTimeout(() => scrollToElement('results-section'), 500);
//     } catch (error) {
//         console.error('Search failed:', error);
//         showToast(error.message, 'error');
//         document.getElementById('searchForm').classList.add('was-validated');
//     } finally {
//         isSearching = false;
//         updateButtonState(false);
//     }
// }

// // ==========================================================================
// // RESULTS DISPLAY
// // ==========================================================================

// /**
//  * Create internship card HTML
//  */
// function createInternshipCard(internship, index) {
//     const explanations = internship.explanations || [];
//     const proTips = internship.pro_tips || [];
//     const skills = internship.required_skills || [];
//     const companyInitials = internship.company.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();

//     return `
//         <div class="col-lg-6 col-xl-4">
//             <div class="card internship-card fade-in" style="animation-delay: ${index * 0.1}s">
//                 <div class="match-score">${Math.round(internship.match_score)}% Match</div>
//                 <div class="company-logo">${companyInitials}</div>
//                 <h3 class="role-title" data-internship-id="${internship.id}">${internship.role_title}</h3>
//                 <p class="company-name">${internship.company}</p>
//                 <div class="internship-meta">
//                     <div class="meta-item"><i class="bi bi-geo-alt-fill"></i>${internship.location}</div>
//                     <div class="meta-item"><i class="bi bi-clock-fill"></i>${internship.duration}</div>
//                     <div class="meta-item"><i class="bi bi-currency-rupee"></i>${internship.stipend}</div>
//                 </div>
//                 <p class="description">${internship.description}</p>
//                 ${explanations.length > 0 ? `<div class="explanation-section"><div class="explanation-title">Why This Matches You</div><ul class="explanation-list">${explanations.map(exp => `<li>${exp}</li>`).join('')}</ul></div>` : ''}
//                 ${proTips.length > 0 ? `<div class="pro-tip"><p class="pro-tip-content">${proTips[0]}</p></div>` : ''}
//                 ${skills.length > 0 ? `<div class="skills-tags">${skills.slice(0, 4).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}${skills.length > 4 ? `<span class="skill-tag">+${skills.length - 4} more</span>` : ''}</div>` : ''}
//                 <div class="card-actions">
//                     <button class="btn btn-primary flex-fill" disabled title="Feature Disabled for Final Presentation"><i class="bi bi-file-earmark-person me-2"></i>Build Resume</button>
//                     <button class="btn btn-success" disabled title="Feature Disabled for Final Presentation"><i class="bi bi-arrow-right-circle me-2"></i>Apply Now</button>
//                     </div>
//             </div>
//         </div>
//     `;
// }

// /**
//  * Display search results
//  */
// function displaySearchResults(results) {
//     const resultsSection = document.getElementById('results-section');
//     const resultsContainer = document.getElementById('resultsContainer');
//     const noResultsDiv = document.getElementById('no-results');
//     const shareSection = document.getElementById('share-section');
    
//     // Hide the search form and show the results section
//     document.getElementById('search-form').style.display = 'none';
//     resultsSection.classList.remove('d-none');

//     if (results.matches && results.matches.length > 0) {
//         noResultsDiv.classList.add('d-none');
//         resultsContainer.innerHTML = results.matches.map((internship, index) => createInternshipCard(internship, index)).join('');
        
//         // Add event listener to role titles for modal view
//         document.querySelectorAll('.role-title').forEach(title => {
//             title.addEventListener('click', () => viewInternshipDetails(title.getAttribute('data-internship-id')));
//         });

//         const subtitle = document.getElementById('results-subtitle');
//         subtitle.textContent = `Found ${results.matches.length} perfect matches based on your profile`;
        
//         // Share link functionality is removed from the backend, so we hide this section.
//         shareSection.style.display = 'none';
        
//     } else {
//         resultsContainer.innerHTML = '';
//         noResultsDiv.classList.remove('d-none');
//         shareSection.style.display = 'none';
//     }
// }

// /**
//  * Show apply now modal (REMOVED: Keeping only the function body for stability)
//  */
// function showApplyNowModal() {
//     showToast('Application features are currently disabled for deployment stability.', 'info');
// }

// // ==========================================================================
// // INTERNSHIP ACTIONS (Simplified for stability)
// // ==========================================================================

// /**
//  * Navigate to resume builder for specific internship (DISABLED)
//  */
// function buildResumeFor(internshipId) {
//     showToast('Resume Builder feature temporarily disabled.', 'info');
// }

// /**
//  * View detailed internship information
//  */
// async function viewInternshipDetails(internshipId) {
//     try {
//         let internship = currentSearchResults?.matches?.find(match => match.id === internshipId);
//         if (!internship) internship = await makeAPIRequest(`/api/internship/${internshipId}`);
//         showInternshipModal(internship);
//     } catch (error) {
//         console.error('Error fetching internship details:', error);
//         showToast('Unable to load internship details. Please try again.', 'error');
//     }
// }

// /**
//  * Show internship details in modal
//  */
// function showInternshipModal(internship) {
//     let modal = document.getElementById('internshipModal');
//     if (!modal) {
//         const modalHTML = `
//             <div class="modal fade" id="internshipModal" tabindex="-1">
//                 <div class="modal-dialog modal-lg modal-dialog-scrollable">
//                     <div class="modal-content">
//                         <div class="modal-header">
//                             <h5 class="modal-title" id="modalTitle"></h5>
//                             <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
//                         </div>
//                         <div class="modal-body" id="modalBody"></div>
//                         <div class="modal-footer">
//                             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
//                             <button type="button" class="btn btn-primary" id="modalResumeBtn" disabled title="Feature Disabled"><i class="bi bi-file-earmark-person me-2"></i>Build Resume</button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//         document.body.insertAdjacentHTML('beforeend', modalHTML);
//         modal = document.getElementById('internshipModal');
//     }
//     document.getElementById('modalTitle').textContent = internship.role_title;
//     document.getElementById('modalBody').innerHTML = `
//         <div class="row">
//             <div class="col-md-8">
//                 <h6 class="text-primary mb-3">Company</h6><p>${internship.company}</p>
//                 <h6 class="text-primary mb-3">Description</h6><p>${internship.description}</p>
//                 <h6 class="text-primary mb-3">Location</h6><p><i class="bi bi-geo-alt me-2"></i>${internship.location}</p>
//                 <h6 class="text-primary mb-3">Required Skills</h6><div class="d-flex flex-wrap gap-2">${(internship.required_skills || []).map(skill => `<span class="badge bg-light text-dark">${skill}</span>`).join('')}</div>
//             </div>
//             <div class="col-md-4">
//                 <div class="card bg-light"><div class="card-body"><h6 class="card-title">Quick Info</h6><p class="mb-2"><strong>Duration:</strong> ${internship.duration}</p><p class="mb-2"><strong>Stipend:</strong> ${internship.stipend}</p><p class="mb-2"><strong>Deadline:</strong> ${internship.deadline}</p><p class="mb-0"><strong>Qualification:</strong> ${internship.min_qualification}</p></div></div>
//             </div>
//         </div>
//     `;
//     // Removed modalResumeBtn onclick logic since the feature is disabled
//     // eslint-disable-next-line no-undef
//     new bootstrap.Modal(modal).show();
// }

// // ==========================================================================
// // UI HELPERS
// // ==========================================================================

// /**
//  * Scroll to form section
//  */
// function scrollToForm() { scrollToElement('search-form'); }

// /**
//  * Reset search and show form
//  */
// function resetSearch() {
//     document.getElementById('results-section').classList.add('d-none');
//     document.getElementById('search-form').style.display = 'block';
//     document.getElementById('searchForm').classList.remove('was-validated');
//     currentSearchResults = null;
//     scrollToForm();
//     showToast('Ready for a new search!', 'info');
// }

// /**
//  * Copy share URL to clipboard (Functionality disabled)
//  */
// async function copyShareUrl() {
//     showToast('Share link feature temporarily disabled.', 'info');
// }

// /**
//  * Handle shared results from URL (Route removed from backend)
//  */
// async function handleSharedResults() {
//     const path = window.location.pathname;
//     const sharedMatch = path.match(/^\/shared\/(.+)$/);
//     if (sharedMatch) {
//         // Feature disabled: Just show an error and redirect to the main page
//         showToast('The shared results feature is currently unavailable.', 'error');
//         setTimeout(() => window.location.href = '/', 3000);
//     }
// }

// // ==========================================================================
// // EVENT LISTENERS & INITIALIZATION
// // ==========================================================================

// document.addEventListener('DOMContentLoaded', function() {
//     console.log('🚀 Saarthi AI Frontend Initialized');
//     const searchForm = document.getElementById('searchForm');
//     if (searchForm) searchForm.addEventListener('submit', handleFormSubmission);
//     handleSharedResults();
//     document.addEventListener('keydown', function(event) {
//         if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
//             event.preventDefault();
//             document.getElementById('education').focus();
//         }
//         if (event.key === 'Escape' && currentSearchResults) resetSearch();
//     });
//     let scrollToTopBtn = document.createElement('button');
//     scrollToTopBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
//     scrollToTopBtn.className = 'btn btn-primary rounded-circle scroll-to-top';
//     scrollToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
//     document.body.appendChild(scrollToTopBtn);
//     window.addEventListener('scroll', function() {
//         if (window.scrollY > 500) scrollToTopBtn.classList.add('show');
//         else scrollToTopBtn.classList.remove('show');
//     });
//     window.addEventListener('online', () => showToast('Back online! You can now search for internships.', 'success'));
//     window.addEventListener('offline', () => showToast('You\'re offline. Cached results will still be available.', 'info'));
// });

// // ==========================================================================
// // GLOBAL FUNCTION EXPORTS
// // ==========================================================================

// window.scrollToForm = scrollToForm;
// window.resetSearch = resetSearch;
// window.copyShareUrl = copyShareUrl;
// window.buildResumeFor = buildResumeFor;
// window.viewInternshipDetails = viewInternshipDetails;


//final
/**
 * Saarthi AI - Frontend JavaScript
 * Handles form submission, API calls, and dynamic UI updates
 */

// ==========================================================================
// GLOBAL VARIABLES & CONFIGURATION
// ==========================================================================

// Use window.location.origin to correctly target the deployed backend URL
const API_BASE_URL = window.location.origin;
const CACHE_KEY_PREFIX = 'saarthi_';
const CACHE_EXPIRY_HOURS = 24;

// State management
let currentSearchResults = null;
let isSearching = false;

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================

/**
 * Display toast notifications to user
 */
function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    // eslint-disable-next-line no-undef
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: type === 'error' ? 8000 : 4000
    });
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

/**
 * Cache management for offline support
 */
function setCacheData(key, data) {
    try {
        const cacheData = { data, timestamp: Date.now(), expires: Date.now() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000) };
        localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Cache storage failed:', error);
    }
}

function getCacheData(key) {
    try {
        const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
        if (!cached) return null;
        const cacheData = JSON.parse(cached);
        if (Date.now() > cacheData.expires) {
            localStorage.removeItem(CACHE_KEY_PREFIX + key);
            return null;
        }
        return cacheData.data;
    } catch (error) {
        console.warn('Cache retrieval failed:', error);
        return null;
    }
}

/**
 * Smooth scroll to element
 */
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Generate cache key from form data
 */
function generateCacheKey(formData) {
    const keyData = {
        education: formData.education,
        interests: formData.interests.sort().join(','),
        location: formData.location,
        skills: formData.skills
    };
    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
}

// ==========================================================================
// API COMMUNICATION
// ==========================================================================

/**
 * Make API request with error handling and loading states
 */
async function makeAPIRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Throw the specific error from the backend if available
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        if (!navigator.onLine) throw new Error('No internet connection. Please check your network and try again.');
        throw error;
    }
}

/**
 * Search for internships
 */
async function searchInternships(formData) {
    const cacheKey = generateCacheKey(formData);
    const cachedResults = getCacheData(cacheKey);
    if (cachedResults) {
        console.log('Using cached results');
        return cachedResults;
    }
    const results = await makeAPIRequest('/api/search', { method: 'POST', body: JSON.stringify(formData) });
    setCacheData(cacheKey, results);
    return results;
}

// ==========================================================================
// FORM HANDLING
// ==========================================================================

/**
 * Collect and validate form data
 */
function collectFormData() {
    const form = document.getElementById('searchForm');
    const formData = new FormData(form);
    const interests = [];
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => interests.push(checkbox.value));

    const education = formData.get('education');
    const location = formData.get('location');
    const skills = formData.get('skills') || '';

    if (!education) throw new Error('Please select your education level');
    if (!location) throw new Error('Please select your preferred location');
    if (interests.length === 0) throw new Error('Please select at least one area of interest');

    return { education, interests, location, skills: skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0), preferred_location: location };
}

/**
 * Update button loading state
 */
function updateButtonState(isLoading) {
    const searchBtn = document.getElementById('searchBtn');
    const btnText = searchBtn.querySelector('.btn-text');
    const spinner = document.getElementById('loadingSpinner');

    if (isLoading) {
        searchBtn.disabled = true;
        btnText.textContent = 'Finding Your Perfect Matches...';
        spinner.classList.remove('d-none');
        searchBtn.classList.add('loading');
    } else {
        searchBtn.disabled = false;
        btnText.textContent = 'Find My Perfect Internships';
        spinner.classList.add('d-none');
        searchBtn.classList.remove('loading');
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmission(event) {
    event.preventDefault();
    if (isSearching) return;
    try {
        isSearching = true;
        updateButtonState(true);
        const formData = collectFormData();
        console.log('Searching with data:', formData);
        const results = await searchInternships(formData);
        console.log('Search results:', results);
        currentSearchResults = results;
        displaySearchResults(results);
        showToast(`Found ${results.matches.length} perfect matches for you!`, 'success');
        setTimeout(() => scrollToElement('results-section'), 500);
    } catch (error) {
        console.error('Search failed:', error);
        showToast(error.message, 'error');
        document.getElementById('searchForm').classList.add('was-validated');
    } finally {
        isSearching = false;
        updateButtonState(false);
    }
}

// ==========================================================================
// RESULTS DISPLAY
// ==========================================================================

/**
 * Create internship card HTML
 */
function createInternshipCard(internship, index) {
    const explanations = internship.explanations || [];
    const proTips = internship.pro_tips || [];
    const skills = internship.required_skills || [];
    const companyInitials = internship.company.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();

    return `
        <div class="col-lg-6 col-xl-4">
            <div class="card internship-card fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="match-score">${Math.round(internship.match_score)}% Match</div>
                <div class="company-logo">${companyInitials}</div>
                <h3 class="role-title" data-internship-id="${internship.id}">${internship.role_title}</h3>
                <p class="company-name">${internship.company}</p>
                <div class="internship-meta">
                    <div class="meta-item"><i class="bi bi-geo-alt-fill"></i>${internship.location}</div>
                    <div class="meta-item"><i class="bi bi-clock-fill"></i>${internship.duration}</div>
                    <div class="meta-item"><i class="bi bi-currency-rupee"></i>${internship.stipend}</div>
                </div>
                <p class="description">${internship.description}</p>
                ${explanations.length > 0 ? `<div class="explanation-section"><div class="explanation-title">Why This Matches You</div><ul class="explanation-list">${explanations.map(exp => `<li>${exp}</li>`).join('')}</ul></div>` : ''}
                ${proTips.length > 0 ? `<div class="pro-tip"><p class="pro-tip-content">${proTips[0]}</p></div>` : ''}
                ${skills.length > 0 ? `<div class="skills-tags">${skills.slice(0, 4).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}${skills.length > 4 ? `<span class="skill-tag">+${skills.length - 4} more</span>` : ''}</div>` : ''}
                <div class="card-actions">
                    <button class="btn btn-primary flex-fill build-resume-btn" data-internship-id="${internship.id}"><i class="bi bi-file-earmark-person me-2"></i>Build Resume</button>
                    <button class="btn btn-success apply-now-btn" data-internship-id="${internship.id}"><i class="bi bi-arrow-right-circle me-2"></i>Apply Now</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Display search results
 */
function displaySearchResults(results) {
    const resultsSection = document.getElementById('results-section');
    const resultsContainer = document.getElementById('resultsContainer');
    const noResultsDiv = document.getElementById('no-results');
    const shareSection = document.getElementById('share-section');

    // Hide the search form and show the results section
    document.getElementById('search-form').style.display = 'none';
    resultsSection.classList.remove('d-none');

    if (results.matches && results.matches.length > 0) {
        noResultsDiv.classList.add('d-none');
        resultsContainer.innerHTML = results.matches.map((internship, index) => createInternshipCard(internship, index)).join('');

        // // Attach event listeners to the buttons for the modals/actions
        // document.querySelectorAll('.build-resume-btn').forEach(button => {
        //     button.addEventListener('click', (e) => {
        //         e.preventDefault();
        //         showToast('Resume Builder feature is part of our future scope! It will allow you to generate a custom resume.', 'info');
        //     });
        // });

        // document.querySelectorAll('.apply-now-btn').forEach(button => {
        //     button.addEventListener('click', (e) => {
        //         e.preventDefault();
        //         showApplyNowModal();
        //     });
        // });

        // Re-enable the Build Resume button's functionality
        document.querySelectorAll('.build-resume-btn').forEach(button => {
            button.addEventListener('click', () => {
                // This saves the ID and redirects to the resume builder page
                sessionStorage.setItem('selectedInternshipId', button.getAttribute('data-internship-id'));
                window.location.href = '/resume-builder';
            });
        });

        // Keep the Apply Now button showing the modal for stability
        document.querySelectorAll('.apply-now-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                showApplyNowModal();
            });
        });
        
        // Add event listener to role titles for modal view
        document.querySelectorAll('.role-title').forEach(title => {
            title.addEventListener('click', () => viewInternshipDetails(title.getAttribute('data-internship-id')));
        });

        const subtitle = document.getElementById('results-subtitle');
        subtitle.textContent = `Found ${results.matches.length} perfect matches based on your profile`;

        // Share link functionality is removed from the backend, so we hide this section.
        shareSection.style.display = 'none';

    } else {
        resultsContainer.innerHTML = '';
        noResultsDiv.classList.remove('d-none');
        shareSection.style.display = 'none';
    }
}

/**
 * Show apply now modal
 */
function showApplyNowModal() {
    let modal = document.getElementById('applyNowModal');
    if (!modal) {
        const modalHTML = `
            <div class="modal fade" id="applyNowModal" tabindex="-1" aria-labelledby="applyNowModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="applyNowModalLabel">Application In-Progress</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            The application would now be submitted. We will notify you once your application has been received by the company.
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary okay-btn" data-bs-dismiss="modal">Okay</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('applyNowModal');
    }
    // eslint-disable-next-line no-undef
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// ==========================================================================
// INTERNSHIP ACTIONS
// ==========================================================================

/**
 * Navigate to resume builder for specific internship (DISABLED)
 */
function buildResumeFor(internshipId) {
    showToast('Resume Builder feature temporarily disabled.', 'info');
}

/**
 * View detailed internship information
 */
async function viewInternshipDetails(internshipId) {
    try {
        let internship = currentSearchResults?.matches?.find(match => match.id === internshipId);
        if (!internship) internship = await makeAPIRequest(`/api/internship/${internshipId}`);
        showInternshipModal(internship);
    } catch (error) {
        console.error('Error fetching internship details:', error);
        showToast('Unable to load internship details. Please try again.', 'error');
    }
}

/**
 * Show internship details in modal
 */
function showInternshipModal(internship) {
    let modal = document.getElementById('internshipModal');
    if (!modal) {
        const modalHTML = `
            <div class="modal fade" id="internshipModal" tabindex="-1">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="modalTitle"></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="modalBody"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" id="modalResumeBtn" disabled title="Feature Disabled"><i class="bi bi-file-earmark-person me-2"></i>Build Resume</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('internshipModal');
    }
    document.getElementById('modalTitle').textContent = internship.role_title;
    document.getElementById('modalBody').innerHTML = `
        <div class="row">
            <div class="col-md-8">
                <h6 class="text-primary mb-3">Company</h6><p>${internship.company}</p>
                <h6 class="text-primary mb-3">Description</h6><p>${internship.description}</p>
                <h6 class="text-primary mb-3">Location</h6><p><i class="bi bi-geo-alt me-2"></i>${internship.location}</p>
                <h6 class="text-primary mb-3">Required Skills</h6><div class="d-flex flex-wrap gap-2">${(internship.required_skills || []).map(skill => `<span class="badge bg-light text-dark">${skill}</span>`).join('')}</div>
            </div>
            <div class="col-md-4">
                <div class="card bg-light"><div class="card-body"><h6 class="card-title">Quick Info</h6><p class="mb-2"><strong>Duration:</strong> ${internship.duration}</p><p class="mb-2"><strong>Stipend:</strong> ${internship.stipend}</p><p class="mb-2"><strong>Deadline:</strong> ${internship.deadline}</p><p class="mb-0"><strong>Qualification:</strong> ${internship.min_qualification}</p></div></div>
            </div>
        </div>
    `;
    // Removed modalResumeBtn onclick logic since the feature is disabled
    // eslint-disable-next-line no-undef
    new bootstrap.Modal(modal).show();
}

// ==========================================================================
// UI HELPERS
// ==========================================================================

/**
 * Scroll to form section
 */
function scrollToForm() { scrollToElement('search-form'); }

/**
 * Reset search and show form
 */
function resetSearch() {
    document.getElementById('results-section').classList.add('d-none');
    document.getElementById('search-form').style.display = 'block';
    document.getElementById('searchForm').classList.remove('was-validated');
    currentSearchResults = null;
    scrollToForm();
    showToast('Ready for a new search!', 'info');
}

/**
 * Copy share URL to clipboard (Functionality disabled)
 */
async function copyShareUrl() {
    showToast('Share link feature temporarily disabled.', 'info');
}

/**
 * Handle shared results from URL (Route removed from backend)
 */
async function handleSharedResults() {
    const path = window.location.pathname;
    const sharedMatch = path.match(/^\/shared\/(.+)$/);
    if (sharedMatch) {
        // Feature disabled: Just show an error and redirect to the main page
        showToast('The shared results feature is currently unavailable.', 'error');
        setTimeout(() => window.location.href = '/', 3000);
    }
}

// ==========================================================================
// EVENT LISTENERS & INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Saarthi AI Frontend Initialized');
    const searchForm = document.getElementById('searchForm');
    if (searchForm) searchForm.addEventListener('submit', handleFormSubmission);
    handleSharedResults();
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            document.getElementById('education').focus();
        }
        if (event.key === 'Escape' && currentSearchResults) resetSearch();
    });
    let scrollToTopBtn = document.createElement('button');
    scrollToTopBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    scrollToTopBtn.className = 'btn btn-primary rounded-circle scroll-to-top';
    scrollToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(scrollToTopBtn);
    window.addEventListener('scroll', function() {
        if (window.scrollY > 500) scrollToTopBtn.classList.add('show');
        else scrollToTopBtn.classList.remove('show');
    });
    window.addEventListener('online', () => showToast('Back online! You can now search for internships.', 'success'));
    window.addEventListener('offline', () => showToast('You\'re offline. Cached results will still be available.', 'info'));
});

// ==========================================================================
// GLOBAL FUNCTION EXPORTS
// ==========================================================================

window.scrollToForm = scrollToForm;
window.resetSearch = resetSearch;
window.copyShareUrl = copyShareUrl;
window.buildResumeFor = buildResumeFor;
window.viewInternshipDetails = viewInternshipDetails;