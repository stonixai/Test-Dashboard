// Global instances
let apiService;
let authService;
let storageService;
let loginModal;
let darkModeManager;
let performanceChart;
let resourceChart;
let updateInterval;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeServices();
    checkAuthentication();
});

// Initialize all services
function initializeServices() {
    // Initialize storage service
    storageService = new StorageService(AppConfig);
    
    // Initialize dark mode manager
    if (AppConfig.features.darkMode) {
        darkModeManager = new DarkModeManager(storageService);
    }
    
    // Initialize API service (use mock for demo)
    apiService = new MockAPIService(AppConfig);
    
    // Initialize auth service
    authService = new AuthService(AppConfig, storageService);
    
    // Initialize login modal
    loginModal = new LoginModal(authService);
    
    // Setup logger
    Logger.setLevel(AppConfig.logging.level);
    
    // Listen for auth events
    document.addEventListener('auth:login', (e) => {
        Logger.info('User logged in', e.detail);
        loginModal.hide();
        initializeDashboard();
    });
    
    document.addEventListener('auth:logout', () => {
        Logger.info('User logged out');
        location.reload();
    });
}

// Check if user is authenticated
function checkAuthentication() {
    if (AppConfig.features.authentication) {
        if (authService.isAuthenticated()) {
            initializeDashboard();
            showUserInfo();
        } else {
            loginModal.show();
        }
    } else {
        initializeDashboard();
    }
}

// Initialize dashboard after authentication
function initializeDashboard() {
    initializeCharts();
    loadDashboardData();
    startRealTimeUpdates();
    initializeAlerts();
    setupEventHandlers();
    
    Logger.info('Dashboard initialized');
}

// Show user information in header
function showUserInfo() {
    const user = authService.getCurrentUser();
    if (user) {
        const headerInfo = document.querySelector('.header-info');
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        
        let adminButton = '';
        if (user.role === 'administrator') {
            adminButton = '<button class="admin-btn" onclick="goToAdmin()">Admin Panel</button>';
        }
        
        userInfo.innerHTML = `
            <span class="user-name">${user.username}</span>
            <span class="user-role">(${user.role})</span>
            ${adminButton}
            <button class="logout-btn" onclick="logout()">Logout</button>
        `;
        headerInfo.appendChild(userInfo);
    }
}

// Navigate to admin panel
function goToAdmin() {
    window.location.href = 'admin.html';
}

// Logout function
function logout() {
    authService.logout();
}

// Load dashboard data from API
async function loadDashboardData() {
    try {
        // Load metrics
        const metrics = await apiService.request('/metrics');
        updateMetricsDisplay(metrics);
        
        // Load services
        const services = await apiService.request('/services');
        updateServicesDisplay(services);
        
        // Load alerts
        const alerts = await apiService.request('/alerts');
        updateAlertsDisplay(alerts);
        
        // Load performance data
        const perfData = await apiService.request('/performance');
        updateChartsWithData(perfData);
        
        // Store data for offline access
        storageService.set('lastMetrics', metrics);
        storageService.set('lastServices', services);
        
    } catch (error) {
        Logger.error('Failed to load dashboard data', error);
        // Try to load from cache
        loadFromCache();
    }
}

// Load data from cache when API fails
function loadFromCache() {
    const cachedMetrics = storageService.get('lastMetrics');
    const cachedServices = storageService.get('lastServices');
    
    if (cachedMetrics) {
        updateMetricsDisplay(cachedMetrics);
    }
    if (cachedServices) {
        updateServicesDisplay(cachedServices);
    }
    
    showOfflineNotification();
}

// Show offline notification
function showOfflineNotification() {
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.textContent = 'Running in offline mode. Displaying cached data.';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Update metrics display with real data
function updateMetricsDisplay(metrics) {
    if (!metrics) return;
    
    // Update server count
    if (metrics.servers) {
        document.getElementById('serverCount').textContent = metrics.servers.online || 0;
        const serverCard = document.querySelector('.metric-card:nth-child(1) .status-text');
        if (serverCard) {
            if (metrics.servers.offline > 0) {
                serverCard.className = 'status-text warning';
                serverCard.textContent = `${metrics.servers.offline} Offline`;
            } else {
                serverCard.className = 'status-text success';
                serverCard.textContent = 'All Online';
            }
        }
    }
    
    // Update CPU usage
    if (metrics.cpu) {
        const cpuUsage = Math.round(metrics.cpu.usage);
        document.getElementById('cpuUsage').textContent = cpuUsage + '%';
        const cpuCard = document.querySelector('.metric-card:nth-child(2) .status-text');
        if (cpuCard) {
            if (cpuUsage >= AppConfig.thresholds.cpu.critical) {
                cpuCard.className = 'status-text danger';
                cpuCard.textContent = 'Critical Load';
            } else if (cpuUsage >= AppConfig.thresholds.cpu.warning) {
                cpuCard.className = 'status-text warning';
                cpuCard.textContent = 'High Load';
            } else {
                cpuCard.className = 'status-text success';
                cpuCard.textContent = 'Normal Load';
            }
        }
    }
    
    // Update memory usage
    if (metrics.memory) {
        const memUsed = metrics.memory.used;
        const memTotal = metrics.memory.total;
        const memPercent = Math.round((memUsed / memTotal) * 100);
        
        document.getElementById('memoryUsage').textContent = memUsed.toFixed(1) + ' GB';
        const memCard = document.querySelector('.metric-card:nth-child(3) .status-text');
        if (memCard) {
            memCard.textContent = memPercent + '% Used';
            if (memPercent >= AppConfig.thresholds.memory.critical) {
                memCard.className = 'status-text danger';
            } else if (memPercent >= AppConfig.thresholds.memory.warning) {
                memCard.className = 'status-text warning';
            } else {
                memCard.className = 'status-text success';
            }
        }
    }
    
    // Update network speed
    if (metrics.network) {
        const speed = metrics.network.inbound + metrics.network.outbound;
        document.getElementById('networkSpeed').textContent = speed.toFixed(1) + ' Gbps';
        const netCard = document.querySelector('.metric-card:nth-child(4) .status-text');
        if (netCard) {
            if (metrics.network.packetLoss > AppConfig.thresholds.network.packetLossCritical) {
                netCard.className = 'status-text danger';
                netCard.textContent = 'Packet Loss';
            } else if (metrics.network.latency > AppConfig.thresholds.network.latencyWarning) {
                netCard.className = 'status-text warning';
                netCard.textContent = 'High Latency';
            } else {
                netCard.className = 'status-text success';
                netCard.textContent = 'Stable';
            }
        }
    }
    
    // Update last update time
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}

// Update services display
function updateServicesDisplay(services) {
    if (!services || !Array.isArray(services)) return;
    
    const servicesGrid = document.querySelector('.services-grid');
    servicesGrid.innerHTML = '';
    
    services.forEach(service => {
        const serviceCard = document.createElement('div');
        serviceCard.className = `service-card ${service.status}`;
        serviceCard.innerHTML = `
            <div class="service-status"></div>
            <div class="service-info">
                <h4>${service.name}</h4>
                <span>${service.type}/${service.version}</span>
            </div>
            <div class="service-uptime">${service.uptime || '--'}%</div>
        `;
        servicesGrid.appendChild(serviceCard);
    });
}

// Update alerts display
function updateAlertsDisplay(alerts) {
    if (!alerts || !Array.isArray(alerts)) return;
    
    const container = document.getElementById('alertsContainer');
    container.innerHTML = '';
    
    alerts.slice(0, AppConfig.monitoring.maxAlertsDisplay).forEach(alert => {
        const alertTime = new Date(alert.timestamp);
        const timeAgo = getTimeAgo(alertTime);
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${alert.severity}`;
        alertDiv.innerHTML = `
            <div class="alert-icon">${getAlertIcon(alert.severity)}</div>
            <div class="alert-content">
                <strong>${alert.title}</strong>
                <p>${alert.message}</p>
            </div>
            <div class="alert-time">${timeAgo}</div>
        `;
        container.appendChild(alertDiv);
    });
}

// Get alert icon based on severity
function getAlertIcon(severity) {
    const icons = {
        info: 'ℹ️',
        warning: '⚠️',
        critical: '🚨',
        success: '✅'
    };
    return icons[severity] || 'ℹ️';
}

// Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' mins ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

// Initialize charts
function initializeCharts() {
    // Performance Chart
    const perfCtx = document.getElementById('performanceChart').getContext('2d');
    performanceChart = new Chart(perfCtx, {
        type: 'line',
        data: {
            labels: generateTimeLabels(24),
            datasets: [{
                label: 'CPU Usage',
                data: generateRandomData(24, 40, 80),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Memory Usage',
                data: generateRandomData(24, 30, 70),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Network I/O',
                data: generateRandomData(24, 20, 60),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f5f9',
                        usePointStyle: true,
                        padding: 10
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#334155',
                        display: true
                    },
                    ticks: {
                        color: '#94a3b8',
                        maxRotation: 0,
                        maxTicksLimit: 12
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });

    // Resource Allocation Chart
    const resCtx = document.getElementById('resourceChart').getContext('2d');
    resourceChart = new Chart(resCtx, {
        type: 'doughnut',
        data: {
            labels: ['Web Servers', 'Databases', 'Cache', 'Storage', 'Other'],
            datasets: [{
                data: [30, 25, 15, 20, 10],
                backgroundColor: [
                    '#3b82f6',
                    '#8b5cf6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#f1f5f9',
                        padding: 15
                    }
                }
            }
        }
    });
}

// Generate time labels for charts
function generateTimeLabels(hours) {
    const labels = [];
    const now = new Date();
    for (let i = hours - 1; i >= 0; i--) {
        const time = new Date(now - i * 60 * 60 * 1000);
        labels.push(time.getHours() + ':00');
    }
    return labels;
}

// Generate random data for charts
function generateRandomData(count, min, max) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return data;
}

// Update charts with real data
function updateChartsWithData(perfData) {
    if (!perfData || !performanceChart) return;
    
    // Update performance chart
    if (perfData.cpu && perfData.memory) {
        const labels = perfData.cpu.map(point => {
            const date = new Date(point.timestamp);
            return date.getHours() + ':00';
        });
        
        performanceChart.data.labels = labels;
        performanceChart.data.datasets[0].data = perfData.cpu.map(p => p.value);
        performanceChart.data.datasets[1].data = perfData.memory.map(p => p.value);
        
        if (perfData.network) {
            const networkData = perfData.network.map(p => 
                ((p.inbound + p.outbound) / 2) * 50
            );
            performanceChart.data.datasets[2].data = networkData;
        }
        
        performanceChart.update('none');
    }
}

// Start real-time updates
function startRealTimeUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    updateInterval = setInterval(async () => {
        if (!authService.isAuthenticated()) {
            clearInterval(updateInterval);
            return;
        }
        
        try {
            await loadDashboardData();
        } catch (error) {
            Logger.error('Failed to update dashboard', error);
        }
    }, AppConfig.monitoring.updateInterval);
}

// Initialize alerts
function initializeAlerts() {
    // Check for new alerts periodically
    setInterval(async () => {
        if (!authService.isAuthenticated()) return;
        
        try {
            const alerts = await apiService.request('/alerts');
            updateAlertsDisplay(alerts);
            
            // Check for critical alerts
            const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged);
            if (criticalAlerts.length > 0) {
                showCriticalAlertNotification(criticalAlerts[0]);
            }
        } catch (error) {
            Logger.error('Failed to fetch alerts', error);
        }
    }, AppConfig.monitoring.alertCheckInterval);
}

// Show critical alert notification
function showCriticalAlertNotification(alert) {
    if (Notification.permission === 'granted') {
        new Notification(alert.title, {
            body: alert.message,
            icon: '/favicon.ico',
            tag: alert.id
        });
    }
}

// Setup event handlers
function setupEventHandlers() {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Pause updates when page is hidden
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        } else {
            // Resume updates when page is visible
            if (authService.isAuthenticated()) {
                loadDashboardData();
                startRealTimeUpdates();
            }
        }
    });
    
    // Handle online/offline events
    window.addEventListener('online', () => {
        Logger.info('Connection restored');
        loadDashboardData();
        startRealTimeUpdates();
    });
    
    window.addEventListener('offline', () => {
        Logger.warn('Connection lost');
        showOfflineNotification();
    });
}

// Export data function
function exportDashboardData() {
    if (!authService.hasPermission('read')) {
        alert('You do not have permission to export data');
        return;
    }
    
    storageService.exportData();
    Logger.info('Dashboard data exported');
}