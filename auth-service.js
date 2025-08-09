class AuthService {
    constructor(config, storage) {
        this.config = config;
        this.storage = storage;
        this.currentUser = null;
        this.sessionTimer = null;
        this.loginAttempts = new Map();
        
        this.init();
    }

    init() {
        this.loadSession();
        this.setupSessionTimeout();
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated()) {
                this.refreshSession();
            }
        });
    }

    async login(credentials) {
        const { username, password, rememberMe = false } = credentials;
        
        if (this.isLockedOut(username)) {
            throw new Error(`Account locked. Try again in ${this.getLockoutTimeRemaining(username)} minutes.`);
        }

        try {
            Logger.info('Login attempt', { username });
            
            const response = await this.authenticateUser(username, password);
            
            if (response.success) {
                this.currentUser = {
                    id: response.user.id,
                    username: response.user.username,
                    email: response.user.email,
                    role: response.user.role,
                    permissions: response.user.permissions,
                    loginTime: new Date().toISOString(),
                    lastActivity: new Date().toISOString()
                };

                const sessionData = {
                    user: this.currentUser,
                    token: response.token,
                    refreshToken: response.refreshToken,
                    expiresAt: Date.now() + this.config.security.sessionTimeout
                };

                this.storage.set('session', sessionData, false);
                
                if (rememberMe) {
                    this.storage.set('remember_token', response.refreshToken, false);
                }

                this.clearLoginAttempts(username);
                this.setupSessionTimeout();
                
                Logger.info('User logged in successfully', { username, role: this.currentUser.role });
                this.dispatchEvent('login', this.currentUser);
                
                return { success: true, user: this.currentUser };
            } else {
                this.recordFailedAttempt(username);
                throw new Error(response.message || 'Invalid credentials');
            }
        } catch (error) {
            this.recordFailedAttempt(username);
            Logger.warn('Login failed', { username, error: error.message });
            throw error;
        }
    }

    async authenticateUser(username, password) {
        await this.delay(500 + Math.random() * 500);

        const users = [
            {
                id: 1,
                username: 'admin',
                email: 'admin@company.com',
                password: 'admin123',
                role: 'administrator',
                permissions: ['read', 'write', 'delete', 'manage_users', 'system_config']
            },
            {
                id: 2,
                username: 'operator',
                email: 'operator@company.com',
                password: 'operator123',
                role: 'operator',
                permissions: ['read', 'write', 'acknowledge_alerts']
            },
            {
                id: 3,
                username: 'viewer',
                email: 'viewer@company.com',
                password: 'viewer123',
                role: 'viewer',
                permissions: ['read']
            }
        ];

        const user = users.find(u => u.username === username);
        
        if (user && user.password === password) {
            const { password: _, ...userWithoutPassword } = user;
            return {
                success: true,
                user: userWithoutPassword,
                token: this.generateToken(),
                refreshToken: this.generateToken(true)
            };
        }

        return { success: false, message: 'Invalid username or password' };
    }

    logout() {
        if (this.currentUser) {
            Logger.info('User logged out', { username: this.currentUser.username });
        }
        
        this.currentUser = null;
        this.storage.remove('session');
        this.clearSessionTimeout();
        this.dispatchEvent('logout');
        
        window.location.reload();
    }

    isAuthenticated() {
        if (!this.currentUser) return false;
        
        const session = this.storage.get('session');
        if (!session) return false;
        
        if (Date.now() > session.expiresAt) {
            this.logout();
            return false;
        }
        
        return true;
    }

    hasPermission(permission) {
        return this.currentUser?.permissions?.includes(permission) || false;
    }

    hasRole(role) {
        return this.currentUser?.role === role;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    loadSession() {
        const session = this.storage.get('session');
        
        if (session && Date.now() < session.expiresAt) {
            this.currentUser = session.user;
            this.setupSessionTimeout();
            Logger.info('Session restored', { username: this.currentUser.username });
        } else if (session) {
            this.storage.remove('session');
        }
    }

    async refreshSession() {
        if (!this.isAuthenticated()) return false;
        
        try {
            const session = this.storage.get('session');
            
            session.expiresAt = Date.now() + this.config.security.sessionTimeout;
            session.user.lastActivity = new Date().toISOString();
            
            this.storage.set('session', session);
            this.setupSessionTimeout();
            
            return true;
        } catch (error) {
            Logger.error('Session refresh failed', error);
            this.logout();
            return false;
        }
    }

    setupSessionTimeout() {
        this.clearSessionTimeout();
        
        if (!this.isAuthenticated()) return;
        
        this.sessionTimer = setTimeout(() => {
            Logger.warn('Session expired');
            this.logout();
        }, this.config.security.sessionTimeout);
    }

    clearSessionTimeout() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    recordFailedAttempt(username) {
        const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: 0 };
        attempts.count++;
        attempts.lastAttempt = Date.now();
        
        this.loginAttempts.set(username, attempts);
        
        if (attempts.count >= this.config.security.maxLoginAttempts) {
            Logger.warn('Account locked due to failed attempts', { username, attempts: attempts.count });
        }
    }

    clearLoginAttempts(username) {
        this.loginAttempts.delete(username);
    }

    isLockedOut(username) {
        const attempts = this.loginAttempts.get(username);
        
        if (!attempts || attempts.count < this.config.security.maxLoginAttempts) {
            return false;
        }
        
        const lockoutExpiry = attempts.lastAttempt + this.config.security.lockoutDuration;
        
        if (Date.now() > lockoutExpiry) {
            this.clearLoginAttempts(username);
            return false;
        }
        
        return true;
    }

    getLockoutTimeRemaining(username) {
        const attempts = this.loginAttempts.get(username);
        if (!attempts) return 0;
        
        const lockoutExpiry = attempts.lastAttempt + this.config.security.lockoutDuration;
        const remaining = Math.max(0, lockoutExpiry - Date.now());
        
        return Math.ceil(remaining / 60000);
    }

    generateToken(isRefresh = false) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        return isRefresh ? `refresh_${token}` : `access_${token}`;
    }

    dispatchEvent(eventName, data = null) {
        const event = new CustomEvent(`auth:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class LoginModal {
    constructor(authService) {
        this.authService = authService;
        this.modal = null;
        this.isShowing = false;
    }

    show() {
        if (this.isShowing) return;
        
        this.isShowing = true;
        this.createModal();
        document.body.appendChild(this.modal);
        
        setTimeout(() => {
            this.modal.classList.add('show');
            this.modal.querySelector('#username').focus();
        }, 10);
    }

    hide() {
        if (!this.isShowing) return;
        
        this.isShowing = false;
        this.modal.classList.remove('show');
        
        setTimeout(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            this.modal = null;
        }, 300);
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'login-modal';
        this.modal.innerHTML = `
            <div class="login-modal-backdrop"></div>
            <div class="login-modal-content">
                <div class="login-header">
                    <h2>Sign In</h2>
                    <p>Enter your credentials to access the monitoring dashboard</p>
                </div>
                
                <form id="loginForm" class="login-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" required 
                               autocomplete="username" placeholder="Enter username">
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required 
                               autocomplete="current-password" placeholder="Enter password">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="rememberMe" name="rememberMe">
                            <span class="checkbox-custom"></span>
                            Remember me for 30 days
                        </label>
                    </div>
                    
                    <div class="login-error" id="loginError"></div>
                    
                    <button type="submit" class="login-button" id="loginButton">
                        <span class="button-text">Sign In</span>
                        <span class="button-loader"></span>
                    </button>
                </form>
                
                <div class="login-footer">
                    <p>Demo accounts:</p>
                    <small>admin/admin123 | operator/operator123 | viewer/viewer123</small>
                </div>
            </div>
        `;

        this.attachEvents();
    }

    attachEvents() {
        const form = this.modal.querySelector('#loginForm');
        const errorDiv = this.modal.querySelector('#loginError');
        const button = this.modal.querySelector('#loginButton');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const credentials = {
                username: formData.get('username'),
                password: formData.get('password'),
                rememberMe: formData.get('rememberMe') === 'on'
            };

            this.setLoading(true);
            errorDiv.textContent = '';

            try {
                await this.authService.login(credentials);
                this.hide();
            } catch (error) {
                errorDiv.textContent = error.message;
                this.setLoading(false);
            }
        });

        this.modal.querySelector('.login-modal-backdrop').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.preventDefault();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isShowing) {
                e.preventDefault();
            }
        });
    }

    setLoading(loading) {
        const button = this.modal.querySelector('#loginButton');
        const text = button.querySelector('.button-text');
        const loader = button.querySelector('.button-loader');

        if (loading) {
            button.disabled = true;
            text.style.opacity = '0';
            loader.style.display = 'inline-block';
        } else {
            button.disabled = false;
            text.style.opacity = '1';
            loader.style.display = 'none';
        }
    }
}