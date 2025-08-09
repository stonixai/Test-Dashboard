// Dark Mode Manager
class DarkModeManager {
    constructor(storageService) {
        this.storageService = storageService;
        this.isDarkMode = this.loadPreference();
        this.init();
    }

    init() {
        // Apply saved preference
        this.applyTheme();
        
        // Create toggle button
        this.createToggle();
        
        // Listen for system preference changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!this.storageService.get('darkModePreference')) {
                    this.isDarkMode = e.matches;
                    this.applyTheme();
                    this.updateToggle();
                }
            });
        }
    }

    loadPreference() {
        // Check stored preference first
        const stored = this.storageService.get('darkModePreference');
        if (stored !== null) {
            return stored;
        }
        
        // Fall back to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return true;
        }
        
        // Default to dark mode (current theme)
        return true;
    }

    createToggle() {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'dark-mode-toggle';
        toggleContainer.innerHTML = `
            <button class="theme-toggle-btn" title="Toggle dark mode" aria-label="Toggle dark mode">
                <svg class="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <svg class="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            </button>
        `;
        
        // Add to header
        const headerInfo = document.querySelector('.header-info');
        if (headerInfo) {
            headerInfo.insertBefore(toggleContainer, headerInfo.firstChild);
        }
        
        // Add click handler
        const btn = toggleContainer.querySelector('.theme-toggle-btn');
        btn.addEventListener('click', () => this.toggle());
        
        this.toggleButton = btn;
        this.updateToggle();
    }

    toggle() {
        this.isDarkMode = !this.isDarkMode;
        this.storageService.set('darkModePreference', this.isDarkMode);
        this.applyTheme();
        this.updateToggle();
        
        Logger.info('Dark mode toggled', { isDarkMode: this.isDarkMode });
    }

    applyTheme() {
        if (this.isDarkMode) {
            document.documentElement.classList.add('dark-mode');
            document.documentElement.classList.remove('light-mode');
        } else {
            document.documentElement.classList.add('light-mode');
            document.documentElement.classList.remove('dark-mode');
        }
    }

    updateToggle() {
        if (!this.toggleButton) return;
        
        const sunIcon = this.toggleButton.querySelector('.sun-icon');
        const moonIcon = this.toggleButton.querySelector('.moon-icon');
        
        if (this.isDarkMode) {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }
}

// Light mode CSS variables
const lightModeStyles = `
:root.light-mode {
    --primary-color: #2563eb;
    --success-color: #059669;
    --warning-color: #d97706;
    --danger-color: #dc2626;
    --dark-bg: #ffffff;
    --card-bg: #f8fafc;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --border-color: #e2e8f0;
}

.light-mode body {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.light-mode .header {
    background: #ffffff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.light-mode .metric-card,
.light-mode .chart-container,
.light-mode .service-card,
.light-mode .alert,
.light-mode .login-modal-content {
    background: #ffffff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.light-mode .metric-card:hover {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.light-mode .form-group input {
    background: #f1f5f9;
    border-color: #cbd5e1;
}

.light-mode .form-group input:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.light-mode .login-modal-backdrop {
    background: rgba(0, 0, 0, 0.3);
}

.light-mode .offline-notification,
.light-mode .error-notification {
    background: #ffffff;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.light-mode .performanceChart,
.light-mode .resourceChart {
    background: #ffffff;
}
`;

// Add light mode styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = lightModeStyles;
document.head.appendChild(styleSheet);

// Dark mode toggle button styles
const toggleStyles = `
.dark-mode-toggle {
    display: flex;
    align-items: center;
}

.theme-toggle-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.5rem;
    cursor: pointer;
    color: var(--text-primary);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.theme-toggle-btn:hover {
    background: var(--border-color);
    transform: rotate(180deg);
}

.sun-icon, .moon-icon {
    display: none;
}
`;

const toggleStyleSheet = document.createElement('style');
toggleStyleSheet.textContent = toggleStyles;
document.head.appendChild(toggleStyleSheet);