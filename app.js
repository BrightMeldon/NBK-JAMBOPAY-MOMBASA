// Enhanced System Configuration
const SYSTEM_VERSION = "3.2.0";
const SYSTEM_NAME = "NBK Jambo Pay Leave Rotation";
const DESIGNER = "Software Engineer Pius Maina";
const LEAVE_DURATION_WEEKS = 2;
const DAYS_IN_WEEK = 7;

// System state
let systemState = {
    staffData: [],
    notesData: [],
    autoRotateInterval: null,
    isAutoRotate: false,
    adminMode: false,
    isAuthenticated: false,
    settings: {
        leaveDuration: LEAVE_DURATION_WEEKS,
        rotationInterval: 'weekly',
        notifications: true,
        autoAdvance: true,
        theme: 'light'
    },
    authAttempts: 0,
    lastAuthAttempt: null,
    firebaseListeners: []
};

// DOM Elements cache
const elements = {
    // Authentication
    authModal: document.getElementById('authModal'),
    authForm: document.getElementById('authForm'),
    authEmail: document.getElementById('authEmail'),
    authPassword: document.getElementById('authPassword'),
    togglePassword: document.getElementById('togglePassword'),
    authError: document.getElementById('authError'),
    authSuccess: document.getElementById('authSuccess'),
    authSubmit: document.getElementById('authSubmit'),
    errorMessage: document.getElementById('errorMessage'),
    successMessage: document.getElementById('successMessage'),
    
    // Loading and Notification
    loading: document.getElementById('loading'),
    notification: document.getElementById('notification'),
    notificationTitle: document.getElementById('notificationTitle'),
    notificationMessage: document.getElementById('notificationMessage'),
    
    // Navigation
    adminToggle: document.getElementById('adminToggle'),
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    notesToggle: document.getElementById('notesToggle'),
    footerNav: document.getElementById('footerNav'),
    navDashboard: document.getElementById('navDashboard'),
    navStaff: document.getElementById('navStaff'),
    navTimeline: document.getElementById('navTimeline'),
    navNotes: document.getElementById('navNotes'),
    navAdmin: document.getElementById('navAdmin'),
    
    // Content Sections
    staffGrid: document.getElementById('staffGrid'),
    timelineContainer: document.getElementById('timelineContainer'),
    adminPanel: document.getElementById('adminPanel'),
    notesSection: document.getElementById('notesSection'),
    notesGrid: document.getElementById('notesGrid'),
    
    // Dashboard Stats
    currentLeave: document.getElementById('currentLeave'),
    completedLeaves: document.getElementById('completedLeaves'),
    remainingStaff: document.getElementById('remainingStaff'),
    nextStart: document.getElementById('nextStart'),
    progressBar: document.getElementById('progressBar'),
    
    // Misc
    lastUpdated: document.getElementById('lastUpdated'),
    resetSystemBtn: document.getElementById('resetSystemBtn'),
    addNoteBtn: document.getElementById('addNoteBtn'),
    exportTimeline: document.getElementById('exportTimeline'),
    addStaffBtn: document.getElementById('addStaffBtn'),
    
    // Modals
    addStaffModal: document.getElementById('addStaffModal'),
    addNoteModal: document.getElementById('addNoteModal'),
    
    // No Data States
    noStaffData: document.getElementById('noStaffData'),
    noTimelineData: document.getElementById('noTimelineData'),
    noNotesData: document.getElementById('noNotesData')
};

// Initialize the application
async function initApp() {
    showLoading();
    
    try {
        // Setup event listeners
        setupEventListeners();
        
        // Load settings from Firebase
        await loadSettings();
        
        // Setup Firebase real-time listeners
        setupFirebaseListeners();
        
        // Apply theme
        applyTheme();

        // Ensure adminStartDate default (next Monday) if not set
        const adminStartInput = document.getElementById('adminStartDate');
        if (adminStartInput && !adminStartInput.value) {
            adminStartInput.value = getNextMonday(new Date()).toISOString().split('T')[0];
        }
        
        // Update UI
        updateLastUpdated();
        
        // Initialize real-time updates
        initializeRealTimeUpdates();
        
        // Hide loading
        setTimeout(() => {
            hideLoading();
            showNotification('System Ready', 'Leave rotation system v3.2 connected to Firebase.', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error', 'Failed to connect to Firebase. Please check your configuration.', 'error');
        hideLoading();
    }
}

// Load settings from Firebase
async function loadSettings() {
    try {
        const settings = await firebaseUtils.getSettings();
        if (settings) {
            systemState.settings = { ...systemState.settings, ...settings };
            
            // Update UI with loaded settings
            document.getElementById('leaveDuration').value = systemState.settings.leaveDuration;
            document.getElementById('rotationInterval').value = systemState.settings.rotationInterval;
            document.getElementById('autoAdvance').value = systemState.settings.autoAdvance.toString();
            document.getElementById('notifications').value = systemState.settings.notifications.toString();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Setup Firebase real-time listeners
function setupFirebaseListeners() {
    // Staff listener
    const staffListener = firebaseUtils.setupStaffListener((staff) => {
        systemState.staffData = staff;
        updateStaffStatuses();
        renderDashboard();
        updateStats();
        updateStaffListTextarea();
    });
    
    // Notes listener
    const notesListener = firebaseUtils.setupNotesListener((notes) => {
        systemState.notesData = notes;
        renderNotes();
    });
    
    // Store listeners for cleanup
    systemState.firebaseListeners.push(staffListener, notesListener);
}

// Setup event listeners
function setupEventListeners() {
    // Admin toggle with authentication
    elements.adminToggle.addEventListener('change', function() {
        if (this.checked && !systemState.isAuthenticated) {
            showAuthModal();
            this.checked = false;
        } else if (this.checked && systemState.isAuthenticated) {
            systemState.adminMode = true;
            elements.adminPanel.style.display = 'block';
            elements.adminPanel.classList.add('active');
            updateNavButton('navAdmin', true);
            showNotification('Admin Mode', 'Administrative controls enabled.', 'success');
            renderDashboard();
        } else {
            systemState.adminMode = false;
            elements.adminPanel.style.display = 'none';
            elements.adminPanel.classList.remove('active');
            updateNavButton('navAdmin', false);
            showNotification('Staff Mode', 'Switched to staff view.', 'info');
            renderDashboard();
        }
    });

    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Password visibility toggle
    elements.togglePassword.addEventListener('click', function() {
        const type = elements.authPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        elements.authPassword.setAttribute('type', type);
        this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });

    // Form submission
    elements.authForm.addEventListener('submit', function(e) {
        e.preventDefault();
        authenticateAdmin();
    });

    // Notes toggle
    elements.notesToggle.addEventListener('click', toggleNotes);

    // Leave start date change listener
    document.getElementById('leaveStartDate')?.addEventListener('change', updateEndDate);

    // Leave duration change listener
    document.getElementById('leaveDuration')?.addEventListener('change', updateEndDate);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            openAddNoteModal();
        }
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveSettings();
            showNotification('Settings Saved', 'System settings saved to Firebase.', 'success');
        }
        if (e.key === 'Escape') {
            hideNotification();
            if (elements.authModal.classList.contains('active')) {
                cancelAuth();
            }
            closeAddStaffModal();
            closeAddNoteModal();
        }
    });

    // Scroll events for mobile navigation
    window.addEventListener('scroll', updateActiveNavButton);
}

// Show authentication modal
function showAuthModal() {
    elements.authModal.classList.add('active');
    elements.authError.classList.remove('show');
    elements.authSuccess.classList.remove('show');
    elements.authEmail.value = ADMIN_EMAIL;
    elements.authPassword.value = '';
    elements.authEmail.focus();
    document.body.style.overflow = 'hidden';
}

// Hide authentication modal
function hideAuthModal() {
    elements.authModal.classList.remove('active');
    elements.authError.classList.remove('show');
    elements.authSuccess.classList.remove('show');
    document.body.style.overflow = '';
}

// Enhanced authentication function
async function authenticateAdmin() {
    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;
    
    // Hide any previous messages
    elements.authError.classList.remove('show');
    elements.authSuccess.classList.remove('show');
    
    // Validate inputs
    if (!email || !password) {
        elements.errorMessage.textContent = 'Please enter both email and password';
        elements.authError.classList.add('show');
        shakeElement(elements.authError);
        return;
    }
    
    // Check for rate limiting
    const now = Date.now();
    if (systemState.lastAuthAttempt && (now - systemState.lastAuthAttempt) < 30000) {
        if (systemState.authAttempts >= 3) {
            elements.errorMessage.textContent = 'Too many attempts. Please wait 30 seconds.';
            elements.authError.classList.add('show');
            return;
        }
    }
    
    // Show loading state
    elements.authSubmit.disabled = true;
    elements.authSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
    
    try {
        const result = await firebaseUtils.authenticateUser(email, password);
        
        if (result.success) {
            // Successful authentication
            systemState.isAuthenticated = true;
            systemState.authAttempts = 0;
            systemState.lastAuthAttempt = null;
            
            // Show success message
            elements.successMessage.textContent = 'Authentication successful! Granting access...';
            elements.authSuccess.classList.add('show');
            
            // Update UI after delay
            setTimeout(() => {
                hideAuthModal();
                
                // Enable admin toggle
                elements.adminToggle.checked = true;
                systemState.adminMode = true;
                elements.adminPanel.style.display = 'block';
                elements.adminPanel.classList.add('active');
                updateNavButton('navAdmin', true);
                
                // Show welcome notification
                showNotification('Authentication Successful', 'Admin panel access granted.', 'success');
                
                // Store authentication session
                sessionStorage.setItem('nbkAdminAuth', 'true');
                sessionStorage.setItem('nbkAdminSession', Date.now().toString());
                
                // Render dashboard with admin controls
                renderDashboard();
                
                // Reset button state
                elements.authSubmit.disabled = false;
                elements.authSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> Authenticate & Continue';
            }, 1000);
            
        } else {
            // Failed authentication
            systemState.authAttempts++;
            systemState.lastAuthAttempt = Date.now();
            
            elements.errorMessage.textContent = result.error || 'Invalid email or password. Please try again.';
            elements.authError.classList.add('show');
            shakeElement(elements.authError);
            
            // Clear password field
            elements.authPassword.value = '';
            elements.authPassword.focus();
            
            // Reset button state
            elements.authSubmit.disabled = false;
            elements.authSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> Authenticate & Continue';
            
            // Show hint after multiple failures
            if (systemState.authAttempts >= 2) {
                setTimeout(() => {
                    showNotification('Hint', `Use ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`, 'info');
                }, 500);
            }
        }
    } catch (error) {
        console.error('Authentication error:', error);
        elements.errorMessage.textContent = 'Authentication failed. Please try again.';
        elements.authError.classList.add('show');
        shakeElement(elements.authError);
        
        elements.authSubmit.disabled = false;
        elements.authSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> Authenticate & Continue';
    }
}

// Cancel authentication
function cancelAuth() {
    hideAuthModal();
    elements.adminToggle.checked = false;
    
    // Reset form
    elements.authForm.reset();
    elements.authSubmit.disabled = false;
    elements.authSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> Authenticate & Continue';
}

// Toggle theme
function toggleTheme() {
    if (systemState.settings.theme === 'light') {
        systemState.settings.theme = 'dark';
        elements.themeIcon.className = 'fas fa-sun';
    } else {
        systemState.settings.theme = 'light';
        elements.themeIcon.className = 'fas fa-moon';
    }
    
    applyTheme();
    saveSettings();
}

// Apply theme
function applyTheme() {
    if (systemState.settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
        elements.themeIcon.className = 'fas fa-sun';
    } else {
        document.body.classList.remove('dark-mode');
        elements.themeIcon.className = 'fas fa-moon';
    }
}

// Update end date based on start date and duration
function updateEndDate() {
    const startDateInput = document.getElementById('leaveStartDate');
    const endDateInput = document.getElementById('leaveEndDate');
    const durationInput = document.getElementById('leaveDuration');
    
    if (startDateInput && startDateInput.value) {
        const startDate = new Date(startDateInput.value);
        const durationWeeks = durationInput ? parseInt(durationInput.value) : LEAVE_DURATION_WEEKS;
        
        // Calculate end date (start date + duration weeks - 1 day)
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + (durationWeeks * DAYS_IN_WEEK) - 1);
        
        // Format to YYYY-MM-DD
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        if (endDateInput) {
            endDateInput.value = formattedEndDate;
        }
    }
}

// Open add staff modal
function openAddStaffModal() {
    if (!systemState.isAuthenticated) {
        showAuthModal();
        return;
    }
    
    const modal = document.getElementById('addStaffModal');
    modal.classList.add('active');
    
    // Set today's date as default start date
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('leaveStartDate');
    if (startDateInput) {
        startDateInput.value = today;
        startDateInput.min = today;
        updateEndDate();
    }
    
    // Clear other fields
    document.getElementById('newStaffName').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('staffDepartment').value = '';
}

// Close add staff modal
function closeAddStaffModal() {
    const modal = document.getElementById('addStaffModal');
    modal.classList.remove('active');
}

// Save new staff to Firebase
async function saveNewStaff() {
    const name = document.getElementById('newStaffName').value.trim();
    const email = document.getElementById('staffEmail').value.trim();
    const department = document.getElementById('staffDepartment').value.trim();
    const startDate = document.getElementById('leaveStartDate').value;
    const endDate = document.getElementById('leaveEndDate').value;
    
    if (!name || !email || !department || !startDate || !endDate) {
        showNotification('Validation Error', 'Please fill in all fields.', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Calculate position (last position + 1)
        const position = systemState.staffData.length > 0 
            ? Math.max(...systemState.staffData.map(s => s.position || 0)) + 1
            : 1;
        
        // Determine status based on start date
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        let status = 'upcoming';
        if (now >= start && now <= end) {
            status = 'current';
        } else if (now < start) {
            // Find if there's already a current or next staff
            const hasCurrent = systemState.staffData.some(s => s.status === 'current');
            const hasNext = systemState.staffData.some(s => s.status === 'next');
            
            if (!hasCurrent && !hasNext) {
                status = 'next';
            }
        }
        
        const staffData = {
            name,
            email,
            department,
            position,
            status,
            leaveStart: formatDate(new Date(startDate), 'short'),
            leaveEnd: formatDate(new Date(endDate), 'short'),
            startDate: startDate,
            endDate: endDate,
            startDateObj: start,
            endDateObj: end,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        await firebaseUtils.addStaff(staffData);
        
        closeAddStaffModal();
        showNotification('Success', 'Staff member added successfully.', 'success');
        
    } catch (error) {
        console.error('Error adding staff:', error);
        showNotification('Error', 'Failed to add staff member.', 'error');
    } finally {
        hideLoading();
    }
}

// Quick add staff (from admin panel)
async function quickAddStaff() {
    const name = document.getElementById('adminStaffName').value.trim();
    
    if (!name) {
        showNotification('Validation Error', 'Please enter staff name.', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Calculate position and dates
        const position = systemState.staffData.length > 0 
            ? Math.max(...systemState.staffData.map(s => s.position || 0)) + 1
            : 1;
        
        // Use admin-provided start date if present, otherwise next Monday
        const adminStart = document.getElementById('adminStartDate')?.value;
        const baseDate = adminStart ? new Date(adminStart) : getNextMonday(new Date());
        const startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() + ((position - 1) * systemState.settings.leaveDuration * DAYS_IN_WEEK));
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + (systemState.settings.leaveDuration * DAYS_IN_WEEK) - 1);
        
        // Determine status
        const now = new Date();
        let status = 'upcoming';
        if (position === 1) {
            if (now >= startDate && now <= endDate) {
                status = 'current';
            } else {
                status = 'next';
            }
        }
        
        const staffData = {
            name,
            position,
            status,
            leaveStart: formatDate(startDate, 'short'),
            leaveEnd: formatDate(endDate, 'short'),
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            startDateObj: startDate,
            endDateObj: endDate,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        await firebaseUtils.addStaff(staffData);
        
        document.getElementById('adminStaffName').value = '';
        showNotification('Success', 'Staff member added successfully.', 'success');
        
    } catch (error) {
        console.error('Error adding staff:', error);
        showNotification('Error', 'Failed to add staff member.', 'error');
    } finally {
        hideLoading();
    }
}

// Open add note modal
function openAddNoteModal() {
    if (!systemState.isAuthenticated) {
        showAuthModal();
        return;
    }
    
    const modal = document.getElementById('addNoteModal');
    modal.classList.add('active');
    
    // Clear fields
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('notePriority').value = 'medium';
}

// Close add note modal
function closeAddNoteModal() {
    const modal = document.getElementById('addNoteModal');
    modal.classList.remove('active');
}

// Save new note to Firebase
async function saveNewNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const priority = document.getElementById('notePriority').value;
    
    if (!title || !content) {
        showNotification('Validation Error', 'Please fill in all fields.', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const noteData = {
            title,
            content,
            priority,
            author: "Admin",
            date: formatDateTime(new Date()),
            createdAt: new Date().toISOString()
        };
        
        await firebaseUtils.addNote(noteData);
        
        closeAddNoteModal();
        showNotification('Success', 'Note added successfully.', 'success');
        
    } catch (error) {
        console.error('Error adding note:', error);
        showNotification('Error', 'Failed to add note.', 'error');
    } finally {
        hideLoading();
    }
}

// Toggle notes section
function toggleNotes() {
    const isHidden = elements.notesSection.style.display === 'none' || !elements.notesSection.style.display;
    elements.notesSection.style.display = isHidden ? 'block' : 'none';
    elements.notesSection.classList.toggle('active', isHidden);
    updateNavButton('navNotes', isHidden);
    
    if (isHidden) {
        elements.notesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Toggle admin from mobile nav
function toggleAdminFromMobile() {
    if (!systemState.isAuthenticated) {
        showAuthModal();
        return;
    }
    
    if (!systemState.adminMode) {
        // Enable admin mode
        systemState.adminMode = true;
        elements.adminToggle.checked = true;
        elements.adminPanel.style.display = 'block';
        elements.adminPanel.classList.add('active');
        updateNavButton('navAdmin', true);
        showNotification('Admin Mode', 'Administrative controls enabled.', 'success');
    } else {
        // Disable admin mode
        systemState.adminMode = false;
        elements.adminToggle.checked = false;
        elements.adminPanel.style.display = 'none';
        elements.adminPanel.classList.remove('active');
        updateNavButton('navAdmin', false);
        showNotification('Staff Mode', 'Switched to staff view.', 'info');
    }
    
    renderDashboard();
}

// Update staff statuses
function updateStaffStatuses() {
    const now = new Date();
    
    systemState.staffData.forEach((staff, index) => {
        if (staff.completed) {
            staff.status = 'completed';
            return;
        }
        
        if (staff.startDateObj && staff.endDateObj) {
            const startDate = staff.startDateObj.toDate 
                ? staff.startDateObj.toDate() 
                : new Date(staff.startDateObj);
            const endDate = staff.endDateObj.toDate 
                ? staff.endDateObj.toDate() 
                : new Date(staff.endDateObj);
            
            if (now >= startDate && now <= endDate) {
                staff.status = 'current';
            } else if (now > endDate) {
                staff.status = 'completed';
                staff.completed = true;
                
                // Update in Firebase if status changed
                if (!staff._updating) {
                    staff._updating = true;
                    firebaseUtils.updateStaff(staff.id, {
                        status: 'completed',
                        completed: true,
                        updatedAt: new Date().toISOString()
                    }).then(() => {
                        staff._updating = false;
                    });
                }
            } else {
                // Check if this should be the next staff
                const hasCurrent = systemState.staffData.some(s => s.status === 'current');
                const hasNext = systemState.staffData.some(s => s.status === 'next');
                
                if (!hasCurrent && !hasNext && index === 0) {
                    staff.status = 'next';
                } else if (staff.status !== 'next') {
                    staff.status = 'upcoming';
                }
            }
        }
    });
    
    // Auto-advance if needed and enabled
    if (systemState.settings.autoAdvance) {
        autoAdvanceCheck();
    }
}

// Render dashboard
function renderDashboard() {
    requestAnimationFrame(() => {
        renderStaffGrid();
        renderTimeline();
        updateProgressBar();
        updateCountdowns();
    });
}

// Render staff grid
function renderStaffGrid() {
    const fragment = document.createDocumentFragment();
    
    if (systemState.staffData.length === 0) {
        elements.noStaffData.style.display = 'block';
        elements.staffGrid.innerHTML = '';
        elements.staffGrid.appendChild(elements.noStaffData);
        return;
    }
    
    elements.noStaffData.style.display = 'none';
    
    systemState.staffData.forEach((staff, index) => {
        const card = document.createElement('div');
        card.className = `staff-card ${staff.status} ${staff.completed ? 'completed' : ''}`;
        card.style.setProperty('--index', index);
        
        const countdown = getCountdownText(staff);
        const isEndingSoon = countdown && countdown.includes('m left');
        
        card.innerHTML = `
            <div class="staff-header">
                <span class="staff-badge">#${staff.position}</span>
                <div class="staff-avatar">${getInitials(staff.name)}</div>
                <div class="staff-info">
                    <div class="staff-name">${staff.name}</div>
                    <div class="staff-status status-${staff.status}">
                        ${getStatusText(staff.status)}
                    </div>
                </div>
            </div>
            
            ${staff.email ? `
                <div style="font-size: 14px; color: var(--ios-text-secondary);">
                    <i class="fas fa-envelope"></i> ${staff.email}
                </div>
            ` : ''}
            
            ${staff.department ? `
                <div style="font-size: 14px; color: var(--ios-text-secondary);">
                    <i class="fas fa-building"></i> ${staff.department}
                </div>
            ` : ''}
            
            ${countdown ? `
                <div class="countdown-container">
                    <div class="countdown-label">
                        <i class="far fa-clock"></i> Leave ends in:
                    </div>
                    <div class="countdown-timer ${isEndingSoon ? 'ending' : ''}">
                        ${countdown}
                    </div>
                </div>
            ` : ''}
            
            <div class="staff-dates">
                <div class="date-item">
                    <span class="date-label">Start:</span>
                    <span class="date-value">${staff.leaveStart || 'Not scheduled'}</span>
                </div>
                <div class="date-item">
                    <span class="date-label">End:</span>
                    <span class="date-value">${staff.leaveEnd || 'Not scheduled'}</span>
                </div>
            </div>
            
            ${systemState.adminMode ? `
                <div style="margin-top: 16px; display: flex; gap: 12px; justify-content: center;">
                    <button class="btn btn-secondary" style="padding: 10px 16px; font-size: 14px;" 
                            onclick="editStaff('${staff.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" style="padding: 10px 16px; font-size: 14px;" 
                            onclick="removeStaff('${staff.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            ` : ''}
        `;
        
        fragment.appendChild(card);
    });
    
    elements.staffGrid.innerHTML = '';
    elements.staffGrid.appendChild(fragment);
}

// Get countdown text for staff
function getCountdownText(staff) {
    if (staff.status !== 'current') return '';
    
    let endDate;
    if (staff.endDateObj && staff.endDateObj.toDate) {
        endDate = staff.endDateObj.toDate();
    } else if (staff.endDateObj) {
        endDate = new Date(staff.endDateObj);
    } else if (staff.endDate) {
        endDate = new Date(staff.endDate);
    } else {
        return '';
    }
    
    const now = new Date();
    const timeLeft = endDate.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
        return 'Leave ended';
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m left`;
    }
}

// Render timeline
function renderTimeline() {
    const fragment = document.createDocumentFragment();
    
    // Filter completed and current leaves
    const timelineStaff = systemState.staffData.filter(staff => 
        staff.leaveStart && (staff.status === 'completed' || staff.status === 'current')
    ).sort((a, b) => {
        const dateA = a.startDateObj?.toDate ? a.startDateObj.toDate() : new Date(a.startDate || 0);
        const dateB = b.startDateObj?.toDate ? b.startDateObj.toDate() : new Date(b.startDate || 0);
        return dateB - dateA;
    });
    
    if (timelineStaff.length === 0) {
        elements.noTimelineData.style.display = 'block';
        elements.timelineContainer.innerHTML = '';
        elements.timelineContainer.appendChild(elements.noTimelineData);
        return;
    }
    
    elements.noTimelineData.style.display = 'none';
    
    timelineStaff.forEach((staff, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.style.setProperty('--index', index);
        
        item.innerHTML = `
            <div class="timeline-date">
                <i class="far fa-calendar"></i> ${staff.leaveStart}
            </div>
            <div class="timeline-content">
                <div class="timeline-avatar">${getInitials(staff.name)}</div>
                <div class="timeline-text">
                    <strong>${staff.name}</strong> started ${systemState.settings.leaveDuration}-week leave
                    <div class="timeline-duration">
                        ${staff.leaveStart} → ${staff.leaveEnd} 
                    </div>
                </div>
            </div>
        `;
        
        fragment.appendChild(item);
    });
    
    elements.timelineContainer.innerHTML = '';
    elements.timelineContainer.appendChild(fragment);
}

// Render notes
function renderNotes() {
    const fragment = document.createDocumentFragment();
    
    if (systemState.notesData.length === 0) {
        elements.noNotesData.style.display = 'block';
        elements.notesGrid.innerHTML = '';
        elements.notesGrid.appendChild(elements.noNotesData);
        return;
    }
    
    elements.noNotesData.style.display = 'none';
    
    systemState.notesData.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        
        // Determine border color based on priority
        let borderColor = 'var(--ios-purple)';
        if (note.priority === 'high') borderColor = 'var(--ios-orange)';
        if (note.priority === 'urgent') borderColor = 'var(--ios-red)';
        if (note.priority === 'low') borderColor = 'var(--ios-green)';
        
        noteCard.style.borderLeftColor = borderColor;
        
        // Format date
        let displayDate = note.date;
        if (note.createdAt) {
            const noteDate = new Date(note.createdAt);
            displayDate = formatDateTime(noteDate);
        }
        
        noteCard.innerHTML = `
            <div class="note-header">
                <div class="note-author">${note.author || 'Admin'}</div>
                <div class="note-date">${displayDate}</div>
            </div>
            <div class="note-content">
                <strong>${note.title}</strong>
                <p style="margin-top: 8px;">${note.content}</p>
            </div>
        `;
        
        fragment.appendChild(noteCard);
    });
    
    elements.notesGrid.innerHTML = '';
    elements.notesGrid.appendChild(fragment);
}

// Initialize real-time updates
function initializeRealTimeUpdates() {
    // Update countdowns every minute
    setInterval(() => {
        updateCountdowns();
    }, 60000);
    
    // Check for auto-advance every 30 seconds
    setInterval(() => {
        if (systemState.settings.autoAdvance) {
            autoAdvanceCheck();
        }
    }, 30000);
    
    // Update last updated every minute
    setInterval(updateLastUpdated, 60000);
}

// Update countdowns
function updateCountdowns() {
    const countdownElements = document.querySelectorAll('.countdown-timer');
    countdownElements.forEach(el => {
        const card = el.closest('.staff-card');
        const staffName = card.querySelector('.staff-name').textContent;
        const staff = systemState.staffData.find(s => s.name === staffName);
        
        if (staff) {
            const countdown = getCountdownText(staff);
            el.textContent = countdown;
            el.className = 'countdown-timer';
            
            if (countdown.includes('m left')) {
                el.classList.add('ending');
            } else if (countdown === 'Leave ended') {
                el.classList.add('ended');
            }
        }
    });
}

// Update stats
function updateStats() {
    const current = systemState.staffData.filter(staff => staff.status === 'current').length;
    const completed = systemState.staffData.filter(staff => staff.status === 'completed').length;
    const remaining = systemState.staffData.filter(staff => staff.status === 'upcoming' || staff.status === 'next').length;
    
    elements.currentLeave.textContent = current;
    elements.completedLeaves.textContent = completed;
    elements.remainingStaff.textContent = remaining;
    
    const nextRotation = completed + current + 1;
    elements.nextStart.textContent = `Week ${nextRotation}`;
}

// Update progress bar
function updateProgressBar() {
    const totalStaff = systemState.staffData.length;
    const completedStaff = systemState.staffData.filter(staff => 
        staff.status === 'completed' || staff.status === 'current'
    ).length;
    const progress = totalStaff > 0 ? (completedStaff / totalStaff) * 100 : 0;
    
    elements.progressBar.style.width = `${progress}%`;
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    elements.lastUpdated.textContent = `Last updated: ${formatDateTime(now)}`;
}

// Scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Update active nav button based on scroll
function updateActiveNavButton() {
    if (window.innerWidth > 768) return;
    
    const sections = ['dashboard', 'staff', 'timeline'];
    const currentScroll = window.scrollY + 100;
    
    let activeSection = 'dashboard';
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            if (currentScroll >= sectionTop && currentScroll < sectionBottom) {
                activeSection = sectionId;
            }
        }
    });
    
    // Update nav buttons
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeButton = document.getElementById(`nav${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Update nav button state
function updateNavButton(buttonId, isActive) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (isActive) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
}

// Show notification
function showNotification(title, message, type = 'success') {
    if (!systemState.settings.notifications) return;
    
    elements.notificationTitle.textContent = title;
    elements.notificationMessage.textContent = message;
    
    const colors = {
        'success': 'var(--ios-green)',
        'error': 'var(--ios-red)',
        'warning': 'var(--ios-orange)',
        'info': 'var(--ios-primary)'
    };
    
    elements.notification.style.borderLeftColor = colors[type] || colors.success;
    elements.notification.classList.add('show');
    
    // Auto-hide after appropriate time
    const hideTime = type === 'error' ? 8000 : 5000;
    setTimeout(hideNotification, hideTime);
}

// Hide notification
function hideNotification() {
    elements.notification.classList.remove('show');
}

// Show loading
function showLoading() {
    elements.loading.classList.add('active');
}

// Hide loading
function hideLoading() {
    elements.loading.classList.remove('active');
}

// Shake element animation
function shakeElement(element) {
    element.style.animation = 'shake 0.5s';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

// Save settings to Firebase
async function saveSettings() {
    try {
        const settings = {
            leaveDuration: parseInt(document.getElementById('leaveDuration').value),
            rotationInterval: document.getElementById('rotationInterval').value,
            autoAdvance: document.getElementById('autoAdvance').value === 'true',
            notifications: document.getElementById('notifications').value === 'true',
            theme: systemState.settings.theme,
            updatedAt: new Date().toISOString()
        };
        
        await firebaseUtils.saveSettings(settings);
        systemState.settings = { ...systemState.settings, ...settings };
        
        showNotification('Settings Saved', 'System settings updated successfully.', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error', 'Failed to save settings.', 'error');
    }
}

// Reset system
async function resetSystem() {
    if (!confirm('⚠️ WARNING: This will reset ALL system data in Firebase. Are you sure?')) {
        return;
    }
    
    try {
        showLoading();
        
        // Remove all staff
        const staffSnapshot = await firebaseUtils.db.collection('staff').get();
        const deleteStaffPromises = staffSnapshot.docs.map(doc => doc.ref.delete());
        
        // Remove all notes
        const notesSnapshot = await firebaseUtils.db.collection('notes').get();
        const deleteNotesPromises = notesSnapshot.docs.map(doc => doc.ref.delete());
        
        await Promise.all([...deleteStaffPromises, ...deleteNotesPromises]);
        
        // Clear local state
        systemState.staffData = [];
        systemState.notesData = [];
        
        // Clear authentication
        systemState.isAuthenticated = false;
        systemState.adminMode = false;
        elements.adminToggle.checked = false;
        elements.adminPanel.style.display = 'none';
        elements.adminPanel.classList.remove('active');
        updateNavButton('navAdmin', false);
        
        sessionStorage.removeItem('nbkAdminAuth');
        sessionStorage.removeItem('nbkAdminSession');
        
        // Render empty state
        renderDashboard();
        renderNotes();
        
        showNotification('System Reset', 'All data has been reset successfully.', 'success');
        
    } catch (error) {
        console.error('Error resetting system:', error);
        showNotification('Error', 'Failed to reset system.', 'error');
    } finally {
        hideLoading();
    }
}

// Refresh staff data
function refreshStaffData() {
    showNotification('Refreshing', 'Staff data is automatically updated in real-time.', 'info');
}

// Refresh notes
function refreshNotes() {
    showNotification('Refreshing', 'Notes are automatically updated in real-time.', 'info');
}

// Export timeline
function exportTimeline() {
    showNotification('Export', 'Timeline export feature coming soon!', 'info');
}

// Export data
function exportData() {
    showNotification('Export', 'Data export feature coming soon!', 'info');
}

// Update staff list
async function updateStaffList() {
    const staffListText = document.getElementById('staffList').value.trim();
    
    if (!staffListText) {
        showNotification('Validation Error', 'Please enter staff names.', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Parse staff names
        const staffNames = staffListText.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);
        
        if (staffNames.length === 0) {
            showNotification('Validation Error', 'No valid staff names found.', 'error');
            hideLoading();
            return;
        }
        
        // Remove all existing staff
        const staffSnapshot = await firebaseUtils.db.collection('staff').get();
        const deletePromises = staffSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
        
        // Add new staff
        const today = new Date();
        // Use admin start date if provided, otherwise next Monday
        const adminStart = document.getElementById('adminStartDate')?.value;
        const nextMonday = adminStart ? new Date(adminStart) : getNextMonday(today);
        
        for (let i = 0; i < staffNames.length; i++) {
            const name = staffNames[i];
            
            const startDate = new Date(nextMonday);
            startDate.setDate(nextMonday.getDate() + (i * systemState.settings.leaveDuration * DAYS_IN_WEEK));
            
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + (systemState.settings.leaveDuration * DAYS_IN_WEEK) - 1);
            
            // Determine status
            const now = new Date();
            let status = 'upcoming';
            if (i === 0) {
                if (now >= startDate && now <= endDate) {
                    status = 'current';
                } else {
                    status = 'next';
                }
            }
            
            const staffData = {
                name,
                position: i + 1,
                status,
                leaveStart: formatDate(startDate, 'short'),
                leaveEnd: formatDate(endDate, 'short'),
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                startDateObj: startDate,
                endDateObj: endDate,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            await firebaseUtils.addStaff(staffData);
        }
        
        showNotification('Success', `Updated staff list with ${staffNames.length} members.`, 'success');
        
    } catch (error) {
        console.error('Error updating staff list:', error);
        showNotification('Error', 'Failed to update staff list.', 'error');
    } finally {
        hideLoading();
    }
}

// Update staff list textarea
function updateStaffListTextarea() {
    const staffListTextarea = document.getElementById('staffList');
    if (staffListTextarea) {
        const staffNames = systemState.staffData
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map(staff => staff.name)
            .join('\n');
        staffListTextarea.value = staffNames;
    }
}

// Edit staff
async function editStaff(staffId) {
    const staff = systemState.staffData.find(s => s.id === staffId);
    if (!staff) return;
    
    // In a real implementation, you would open an edit modal
    showNotification('Edit Staff', `Editing ${staff.name} - Feature coming soon!`, 'info');
}

// Remove staff
async function removeStaff(staffId) {
    const staff = systemState.staffData.find(s => s.id === staffId);
    if (!staff) return;
    
    if (!confirm(`Are you sure you want to remove ${staff.name} from the system?`)) {
        return;
    }
    
    try {
        showLoading();
        await firebaseUtils.deleteStaff(staffId);
        showNotification('Success', `${staff.name} has been removed from the system.`, 'success');
    } catch (error) {
        console.error('Error removing staff:', error);
        showNotification('Error', 'Failed to remove staff member.', 'error');
    } finally {
        hideLoading();
    }
}

// Advance rotation
async function advanceRotation() {
    try {
        showLoading();
        
        // Find current staff
        const currentStaff = systemState.staffData.find(s => s.status === 'current');
        
        if (currentStaff) {
            // Mark current as completed
            await firebaseUtils.updateStaff(currentStaff.id, {
                status: 'completed',
                completed: true,
                updatedAt: new Date().toISOString()
            });
            
            // Find next staff
            const nextStaff = systemState.staffData.find(s => s.status === 'next');
            
            if (nextStaff) {
                // Mark next as current
                await firebaseUtils.updateStaff(nextStaff.id, {
                    status: 'current',
                    updatedAt: new Date().toISOString()
                });
                
                // Find upcoming staff after next
                const upcomingStaff = systemState.staffData
                    .filter(s => s.status === 'upcoming')
                    .sort((a, b) => (a.position || 0) - (b.position || 0))[0];
                
                if (upcomingStaff) {
                    // Mark first upcoming as next
                    await firebaseUtils.updateStaff(upcomingStaff.id, {
                        status: 'next',
                        updatedAt: new Date().toISOString()
                    });
                }
                
                showNotification('Rotation Advanced', 'Leave rotation has been advanced successfully.', 'success');
            } else {
                showNotification('No Next Staff', 'There is no next staff to advance to.', 'warning');
            }
        } else {
            showNotification('No Current Staff', 'There is no staff currently on leave.', 'warning');
        }
        
    } catch (error) {
        console.error('Error advancing rotation:', error);
        showNotification('Error', 'Failed to advance rotation.', 'error');
    } finally {
        hideLoading();
    }
}

// Mark current as completed
async function markCurrentCompleted() {
    try {
        showLoading();
        
        // Find current staff
        const currentStaff = systemState.staffData.find(s => s.status === 'current');
        
        if (currentStaff) {
            // Mark current as completed
            await firebaseUtils.updateStaff(currentStaff.id, {
                status: 'completed',
                completed: true,
                updatedAt: new Date().toISOString()
            });
            
            showNotification('Leave Completed', `${currentStaff.name}'s leave has been marked as completed.`, 'success');
        } else {
            showNotification('No Current Staff', 'There is no staff currently on leave.', 'warning');
        }
        
    } catch (error) {
        console.error('Error marking leave as completed:', error);
        showNotification('Error', 'Failed to mark leave as completed.', 'error');
    } finally {
        hideLoading();
    }
}

// Auto advance check
function autoAdvanceCheck() {
    const now = new Date();
    
    systemState.staffData.forEach(staff => {
        if (staff.status === 'current' && staff.endDateObj) {
            const endDate = staff.endDateObj.toDate 
                ? staff.endDateObj.toDate() 
                : new Date(staff.endDateObj);
            
            // If leave has ended, mark as completed
            if (now > endDate && !staff.completed) {
                firebaseUtils.updateStaff(staff.id, {
                    status: 'completed',
                    completed: true,
                    updatedAt: new Date().toISOString()
                });
            }
        }
    });
}

// Utility functions
function formatDate(date, format = 'short') {
    if (!date) return 'Not scheduled';
    
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
    }
    
    const options = {
        short: { month: 'short', day: 'numeric', year: 'numeric' },
        full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
        'YYYY-MM-DD': {}
    };
    
    if (format === 'YYYY-MM-DD') {
        return dateObj.toISOString().split('T')[0];
    }
    
    return dateObj.toLocaleDateString('en-US', options[format] || options.short);
}

function formatDateTime(date) {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
    }
    
    return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function getStatusText(status) {
    const statusMap = {
        'current': 'On Leave Now',
        'next': 'Next in Line',
        'upcoming': 'Upcoming',
        'completed': 'Completed'
    };
    return statusMap[status] || status;
}

function getNextMonday(date) {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
}

// Check for existing admin session on load
window.addEventListener('load', () => {
    if (sessionStorage.getItem('nbkAdminAuth') === 'true') {
        const sessionTime = parseInt(sessionStorage.getItem('nbkAdminSession') || '0');
        const now = Date.now();
        
        // Session expires after 8 hours
        if (now - sessionTime < 8 * 60 * 60 * 1000) {
            systemState.isAuthenticated = true;
            elements.adminToggle.checked = true;
            systemState.adminMode = true;
            elements.adminPanel.style.display = 'block';
            elements.adminPanel.classList.add('active');
            updateNavButton('navAdmin', true);
        }
    }
});

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Logout admin and switch to staff view
function logoutAdmin() {
    // Clear auth/session
    systemState.isAuthenticated = false;
    systemState.adminMode = false;
    sessionStorage.removeItem('nbkAdminAuth');
    sessionStorage.removeItem('nbkAdminSession');

    // Update UI
    elements.adminToggle.checked = false;
    if (elements.adminPanel) {
        elements.adminPanel.style.display = 'none';
        elements.adminPanel.classList.remove('active');
    }
    updateNavButton('navAdmin', false);
    showNotification('Logged Out', 'Switched to staff view.', 'info');
    renderDashboard();
}

// Expose to global scope
window.logoutAdmin = logoutAdmin;

// Export functions to global scope
window.openAddStaffModal = openAddStaffModal;
window.closeAddStaffModal = closeAddStaffModal;
window.saveNewStaff = saveNewStaff;
window.quickAddStaff = quickAddStaff;
window.openAddNoteModal = openAddNoteModal;
window.closeAddNoteModal = closeAddNoteModal;
window.saveNewNote = saveNewNote;
window.toggleNotes = toggleNotes;
window.toggleAdminFromMobile = toggleAdminFromMobile;
window.scrollToSection = scrollToSection;
window.authenticateAdmin = authenticateAdmin;
window.cancelAuth = cancelAuth;
window.refreshStaffData = refreshStaffData;
window.refreshNotes = refreshNotes;
window.exportTimeline = exportTimeline;
window.exportData = exportData;
window.updateStaffList = updateStaffList;
window.editStaff = editStaff;
window.removeStaff = removeStaff;
window.advanceRotation = advanceRotation;
window.markCurrentCompleted = markCurrentCompleted;
window.saveSettings = saveSettings;
window.resetSystem = resetSystem;
window.updateEndDate = updateEndDate;