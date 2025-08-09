// Admin Panel JavaScript
let storageService;
let authService;
let apiService;
let darkModeManager;
let currentSettings = {};
let hasUnsavedChanges = false;

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminServices();
    checkAdminAccess();
    loadCurrentSettings();
    setupEventListeners();
    setupNavigation();
});

// Initialize services
function initializeAdminServices() {
    storageService = new StorageService(AppConfig);
    apiService = new MockAPIService(AppConfig);
    authService = new AuthService(AppConfig, storageService);
    
    if (AppConfig.features.darkMode) {
        darkModeManager = new DarkModeManager(storageService);
    }
    
    Logger.setLevel(AppConfig.logging.level);
}

// Check admin access
function checkAdminAccess() {
    if (!authService.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }
    
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'administrator') {
        alert('Access denied. Administrator privileges required.');
        window.location.href = 'index.html';
        return;
    }
    
    // Update admin username
    document.getElementById('adminUserName').textContent = user.username;
}

// Logout function
function logout() {
    authService.logout();
    window.location.href = 'index.html';
}

// Navigation setup
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            showSection(section);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Show specific section
function showSection(sectionName) {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// Load current settings
function loadCurrentSettings() {
    // Load saved config or use defaults
    const savedConfig = storageService.get('adminConfig') || AppConfig;
    currentSettings = JSON.parse(JSON.stringify(savedConfig));
    
    // Populate Metrics settings
    document.getElementById('showServers').checked = currentSettings.features?.showServers !== false;
    document.getElementById('showCPU').checked = currentSettings.features?.showCPU !== false;
    document.getElementById('showMemory').checked = currentSettings.features?.showMemory !== false;
    document.getElementById('showNetwork').checked = currentSettings.features?.showNetwork !== false;
    
    document.getElementById('metricsUpdateInterval').value = currentSettings.monitoring?.updateInterval / 1000 || 5;
    document.getElementById('alertCheckInterval').value = currentSettings.monitoring?.alertCheckInterval / 1000 || 30;
    
    // Populate Charts settings
    document.getElementById('perfDataPoints').value = currentSettings.monitoring?.chartDataPoints || 24;
    document.getElementById('perfRefreshRate').value = currentSettings.monitoring?.updateInterval / 1000 || 5;
    
    // Populate Thresholds
    document.getElementById('cpuWarning').value = currentSettings.thresholds?.cpu?.warning || 70;
    document.getElementById('cpuCritical').value = currentSettings.thresholds?.cpu?.critical || 90;
    document.getElementById('memoryWarning').value = currentSettings.thresholds?.memory?.warning || 75;
    document.getElementById('memoryCritical').value = currentSettings.thresholds?.memory?.critical || 85;
    document.getElementById('diskWarning').value = currentSettings.thresholds?.disk?.warning || 80;
    document.getElementById('diskCritical').value = currentSettings.thresholds?.disk?.critical || 95;
    document.getElementById('latencyWarning').value = currentSettings.thresholds?.network?.latencyWarning || 100;
    document.getElementById('latencyCritical').value = currentSettings.thresholds?.network?.latencyCritical || 500;
    document.getElementById('packetLossWarning').value = currentSettings.thresholds?.network?.packetLossWarning || 0.5;
    document.getElementById('packetLossCritical').value = currentSettings.thresholds?.network?.packetLossCritical || 2;
    
    // Populate API settings
    document.getElementById('apiBaseUrl').value = currentSettings.api?.baseUrl || '';
    document.getElementById('apiTimeout').value = currentSettings.api?.timeout || 30000;
    document.getElementById('apiRetryAttempts').value = currentSettings.api?.retryAttempts || 3;
    document.getElementById('apiRetryDelay').value = currentSettings.api?.retryDelay || 1000;
    document.getElementById('useMockData').checked = currentSettings.api?.useMockData !== false;
    
    // Populate General settings
    document.getElementById('appName').value = currentSettings.app?.name || 'IT Infrastructure Monitor';
    document.getElementById('appVersion').value = currentSettings.app?.version || '2.0.0';
    document.getElementById('appEnvironment').value = currentSettings.app?.environment || 'production';
    document.getElementById('debugMode').checked = currentSettings.app?.debug || false;
    
    // Feature toggles
    document.getElementById('enableAuth').checked = currentSettings.features?.authentication !== false;
    document.getElementById('enableRealTime').checked = currentSettings.features?.realTimeUpdates !== false;
    document.getElementById('enableExport').checked = currentSettings.features?.dataExport !== false;
    document.getElementById('enableDarkMode').checked = currentSettings.features?.darkMode !== false;
    
    // Security settings
    document.getElementById('sessionTimeout').value = (currentSettings.security?.sessionTimeout / 60000) || 30;
    document.getElementById('maxLoginAttempts').value = currentSettings.security?.maxLoginAttempts || 5;
    document.getElementById('lockoutDuration').value = (currentSettings.security?.lockoutDuration / 60000) || 15;
    document.getElementById('requireStrongPassword').checked = currentSettings.security?.requireStrongPassword !== false;
    
    // Load services
    loadServices();
    
    // Load alert rules
    loadAlertRules();
    
    // Update threshold displays
    updateThresholdDisplays();
}

// Load services table
function loadServices() {
    const tbody = document.getElementById('servicesTableBody');
    tbody.innerHTML = '';
    
    const services = currentSettings.services || [];
    services.forEach((service, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" value="${service.name}" onchange="updateService(${index}, 'name', this.value)"></td>
            <td><input type="text" value="${service.type}" onchange="updateService(${index}, 'type', this.value)"></td>
            <td><input type="text" value="${service.version}" onchange="updateService(${index}, 'version', this.value)"></td>
            <td><input type="checkbox" ${service.critical ? 'checked' : ''} onchange="updateService(${index}, 'critical', this.checked)"></td>
            <td><span class="status-badge ${getRandomStatus()}">${getRandomStatus()}</span></td>
            <td>
                <button class="btn-icon" onclick="editService(${index})" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteService(${index})" title="Delete">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get random status for demo
function getRandomStatus() {
    const statuses = ['online', 'offline', 'warning'];
    return statuses[Math.floor(Math.random() * statuses.length)];
}

// Current service being edited
let currentServiceIndex = -1;

// Update service
function updateService(index, field, value) {
    if (!currentSettings.services) currentSettings.services = [];
    if (currentSettings.services[index]) {
        currentSettings.services[index][field] = value;
        markAsChanged();
    }
}

// Edit service
function editService(index) {
    currentServiceIndex = index;
    const service = currentSettings.services[index];
    
    if (!service) return;
    
    // Populate modal fields with service data
    document.getElementById('editServiceName').value = service.name || '';
    document.getElementById('editServiceType').value = service.type || 'custom';
    document.getElementById('editServiceVersion').value = service.version || '';
    document.getElementById('editServiceId').value = service.id || '';
    
    // Connection settings
    document.getElementById('editServiceHost').value = service.host || '';
    document.getElementById('editServicePort').value = service.port || '';
    document.getElementById('editServiceProtocol').value = service.protocol || 'http';
    document.getElementById('editServiceHealthEndpoint').value = service.healthEndpoint || '/health';
    
    // Monitoring configuration
    document.getElementById('editServiceCheckInterval').value = service.checkInterval || 60;
    document.getElementById('editServiceTimeout').value = service.timeout || 10;
    document.getElementById('editServiceRetries').value = service.retries || 3;
    document.getElementById('editServiceExpectedCode').value = service.expectedCode || '200';
    
    // Checkboxes
    document.getElementById('editServiceCritical').checked = service.critical || false;
    document.getElementById('editServiceAutoRestart').checked = service.autoRestart || false;
    document.getElementById('editServiceMonitorPerformance').checked = service.monitorPerformance || false;
    document.getElementById('editServiceLogErrors').checked = service.logErrors || true;
    
    // Alert settings
    document.getElementById('editServiceAlertThreshold').value = service.alertThreshold || 3;
    document.getElementById('editServiceAlertSeverity').value = service.alertSeverity || 'warning';
    document.getElementById('editServiceAlertRecipients').value = service.alertRecipients || '';
    document.getElementById('editServiceAlertMessage').value = service.alertMessage || 'Service {name} is down at {time}';
    
    // Performance thresholds
    document.getElementById('editServiceRespTimeWarn').value = service.thresholds?.responseTimeWarning || 1000;
    document.getElementById('editServiceRespTimeCrit').value = service.thresholds?.responseTimeCritical || 3000;
    document.getElementById('editServiceCpuWarn').value = service.thresholds?.cpuWarning || 70;
    document.getElementById('editServiceCpuCrit').value = service.thresholds?.cpuCritical || 90;
    document.getElementById('editServiceMemWarn').value = service.thresholds?.memoryWarning || 75;
    document.getElementById('editServiceMemCrit').value = service.thresholds?.memoryCritical || 85;
    
    // Custom commands
    document.getElementById('editServiceStartCmd').value = service.commands?.start || '';
    document.getElementById('editServiceStopCmd').value = service.commands?.stop || '';
    document.getElementById('editServiceRestartCmd').value = service.commands?.restart || '';
    document.getElementById('editServiceStatusCmd').value = service.commands?.status || '';
    
    // Notes
    document.getElementById('editServiceNotes').value = service.notes || '';
    
    // Load dependencies
    loadServiceDependencies(service.dependencies || []);
    
    // Update threshold displays
    updateServiceThresholdDisplays();
    
    // Show modal
    document.getElementById('serviceEditModal').classList.add('show');
    
    // Setup threshold sliders
    setupServiceThresholdSliders();
}

// Delete service
function deleteService(index) {
    if (confirm('Are you sure you want to delete this service?')) {
        currentSettings.services.splice(index, 1);
        loadServices();
        markAsChanged();
    }
}

// Close service modal
function closeServiceModal() {
    document.getElementById('serviceEditModal').classList.remove('show');
    currentServiceIndex = -1;
}

// Save service settings
function saveServiceSettings() {
    if (currentServiceIndex === -1) return;
    
    const service = currentSettings.services[currentServiceIndex];
    if (!service) return;
    
    // Collect all form data
    service.name = document.getElementById('editServiceName').value;
    service.type = document.getElementById('editServiceType').value;
    service.version = document.getElementById('editServiceVersion').value;
    service.id = document.getElementById('editServiceId').value;
    
    // Connection settings
    service.host = document.getElementById('editServiceHost').value;
    service.port = document.getElementById('editServicePort').value;
    service.protocol = document.getElementById('editServiceProtocol').value;
    service.healthEndpoint = document.getElementById('editServiceHealthEndpoint').value;
    
    // Monitoring configuration
    service.checkInterval = parseInt(document.getElementById('editServiceCheckInterval').value);
    service.timeout = parseInt(document.getElementById('editServiceTimeout').value);
    service.retries = parseInt(document.getElementById('editServiceRetries').value);
    service.expectedCode = document.getElementById('editServiceExpectedCode').value;
    
    // Checkboxes
    service.critical = document.getElementById('editServiceCritical').checked;
    service.autoRestart = document.getElementById('editServiceAutoRestart').checked;
    service.monitorPerformance = document.getElementById('editServiceMonitorPerformance').checked;
    service.logErrors = document.getElementById('editServiceLogErrors').checked;
    
    // Alert settings
    service.alertThreshold = parseInt(document.getElementById('editServiceAlertThreshold').value);
    service.alertSeverity = document.getElementById('editServiceAlertSeverity').value;
    service.alertRecipients = document.getElementById('editServiceAlertRecipients').value;
    service.alertMessage = document.getElementById('editServiceAlertMessage').value;
    
    // Performance thresholds
    service.thresholds = {
        responseTimeWarning: parseInt(document.getElementById('editServiceRespTimeWarn').value),
        responseTimeCritical: parseInt(document.getElementById('editServiceRespTimeCrit').value),
        cpuWarning: parseInt(document.getElementById('editServiceCpuWarn').value),
        cpuCritical: parseInt(document.getElementById('editServiceCpuCrit').value),
        memoryWarning: parseInt(document.getElementById('editServiceMemWarn').value),
        memoryCritical: parseInt(document.getElementById('editServiceMemCrit').value)
    };
    
    // Custom commands
    service.commands = {
        start: document.getElementById('editServiceStartCmd').value,
        stop: document.getElementById('editServiceStopCmd').value,
        restart: document.getElementById('editServiceRestartCmd').value,
        status: document.getElementById('editServiceStatusCmd').value
    };
    
    // Notes
    service.notes = document.getElementById('editServiceNotes').value;
    
    // Dependencies (collect from dependencies list)
    service.dependencies = collectServiceDependencies();
    
    // Refresh the services table
    loadServices();
    markAsChanged();
    closeServiceModal();
    
    showNotification('Service settings saved successfully', 'success');
    Logger.info('Service settings saved', { serviceId: service.id, serviceName: service.name });
}

// Setup service threshold sliders
function setupServiceThresholdSliders() {
    const thresholdSliders = document.querySelectorAll('#serviceEditModal input[type="range"]');
    thresholdSliders.forEach(slider => {
        slider.addEventListener('input', function() {
            const display = this.parentElement.querySelector('.threshold-display');
            if (display) {
                let value = this.value;
                let unit = this.id.includes('RespTime') ? 'ms' : '%';
                display.textContent = value + unit;
            }
        });
    });
}

// Update service threshold displays
function updateServiceThresholdDisplays() {
    const thresholdSliders = document.querySelectorAll('#serviceEditModal input[type="range"]');
    thresholdSliders.forEach(slider => {
        const display = slider.parentElement.querySelector('.threshold-display');
        if (display) {
            let value = slider.value;
            let unit = slider.id.includes('RespTime') ? 'ms' : '%';
            display.textContent = value + unit;
        }
    });
}

// Load service dependencies
function loadServiceDependencies(dependencies) {
    const container = document.getElementById('serviceDependenciesList');
    container.innerHTML = '';
    
    dependencies.forEach((dep, index) => {
        const depDiv = document.createElement('div');
        depDiv.className = 'dependency-item';
        depDiv.innerHTML = `
            <select class="dependency-service">
                ${generateServiceOptions(dep.serviceId)}
            </select>
            <select class="dependency-type">
                <option value="required" ${dep.type === 'required' ? 'selected' : ''}>Required</option>
                <option value="optional" ${dep.type === 'optional' ? 'selected' : ''}>Optional</option>
                <option value="soft" ${dep.type === 'soft' ? 'selected' : ''}>Soft Dependency</option>
            </select>
            <button class="btn-icon" onclick="removeDependency(${index})">🗑️</button>
        `;
        container.appendChild(depDiv);
    });
}

// Generate service options for dependency dropdown
function generateServiceOptions(selectedId) {
    let options = '<option value="">Select Service</option>';
    const services = currentSettings.services || [];
    
    services.forEach(service => {
        const selected = service.id === selectedId ? 'selected' : '';
        options += `<option value="${service.id}" ${selected}>${service.name}</option>`;
    });
    
    return options;
}

// Add service dependency
function addServiceDependency() {
    const container = document.getElementById('serviceDependenciesList');
    const index = container.children.length;
    
    const depDiv = document.createElement('div');
    depDiv.className = 'dependency-item';
    depDiv.innerHTML = `
        <select class="dependency-service">
            ${generateServiceOptions('')}
        </select>
        <select class="dependency-type">
            <option value="required">Required</option>
            <option value="optional">Optional</option>
            <option value="soft">Soft Dependency</option>
        </select>
        <button class="btn-icon" onclick="this.parentElement.remove()">🗑️</button>
    `;
    container.appendChild(depDiv);
}

// Collect service dependencies
function collectServiceDependencies() {
    const dependencies = [];
    const depItems = document.querySelectorAll('.dependency-item');
    
    depItems.forEach(item => {
        const serviceSelect = item.querySelector('.dependency-service');
        const typeSelect = item.querySelector('.dependency-type');
        
        if (serviceSelect.value) {
            dependencies.push({
                serviceId: serviceSelect.value,
                type: typeSelect.value
            });
        }
    });
    
    return dependencies;
}

// Test service connection
function testServiceConnection() {
    const host = document.getElementById('editServiceHost').value;
    const port = document.getElementById('editServicePort').value;
    const protocol = document.getElementById('editServiceProtocol').value;
    const endpoint = document.getElementById('editServiceHealthEndpoint').value;
    
    if (!host) {
        showNotification('Please enter a host/IP address to test', 'error');
        return;
    }
    
    // Simulate connection test
    showNotification('Testing connection...', 'info');
    
    setTimeout(() => {
        const success = Math.random() > 0.3; // 70% success rate for demo
        
        if (success) {
            showNotification(`✅ Connection successful to ${host}:${port || 'default'}`, 'success');
        } else {
            showNotification(`❌ Connection failed to ${host}:${port || 'default'}`, 'error');
        }
    }, 2000);
}

// Add new service
function addNewService() {
    const service = {
        id: 'service-' + Date.now(),
        name: 'New Service',
        type: 'Custom',
        version: '1.0',
        critical: false
    };
    
    if (!currentSettings.services) currentSettings.services = [];
    currentSettings.services.push(service);
    loadServices();
    markAsChanged();
}

// Load alert rules
function loadAlertRules() {
    const container = document.getElementById('alertRulesList');
    container.innerHTML = '';
    
    const defaultRules = [
        { name: 'High CPU Usage', condition: 'CPU > 90%', action: 'Email + Notification', severity: 'critical' },
        { name: 'Memory Warning', condition: 'Memory > 75%', action: 'Notification', severity: 'warning' },
        { name: 'Service Down', condition: 'Service Status = Offline', action: 'Email + Slack', severity: 'critical' }
    ];
    
    const rules = currentSettings.alertRules || defaultRules;
    rules.forEach((rule, index) => {
        const ruleDiv = document.createElement('div');
        ruleDiv.className = 'alert-rule-item';
        ruleDiv.innerHTML = `
            <div class="rule-info">
                <strong>${rule.name}</strong>
                <span class="rule-condition">Condition: ${rule.condition}</span>
                <span class="rule-action">Action: ${rule.action}</span>
            </div>
            <div class="rule-actions">
                <span class="severity-badge ${rule.severity}">${rule.severity}</span>
                <button class="btn-icon" onclick="editAlertRule(${index})">✏️</button>
                <button class="btn-icon" onclick="deleteAlertRule(${index})">🗑️</button>
            </div>
        `;
        container.appendChild(ruleDiv);
    });
}

// Add alert rule
function addAlertRule() {
    const name = prompt('Enter rule name:');
    if (!name) return;
    
    const rule = {
        name: name,
        condition: 'Define condition',
        action: 'Notification',
        severity: 'warning'
    };
    
    if (!currentSettings.alertRules) currentSettings.alertRules = [];
    currentSettings.alertRules.push(rule);
    loadAlertRules();
    markAsChanged();
}

// Delete alert rule
function deleteAlertRule(index) {
    if (confirm('Are you sure you want to delete this alert rule?')) {
        currentSettings.alertRules.splice(index, 1);
        loadAlertRules();
        markAsChanged();
    }
}

// Add custom metric
function addCustomMetric() {
    const name = prompt('Enter metric name:');
    if (!name) return;
    
    const metricDiv = document.createElement('div');
    metricDiv.className = 'custom-metric-item';
    metricDiv.innerHTML = `
        <input type="text" value="${name}" placeholder="Metric name">
        <input type="text" placeholder="API endpoint">
        <select>
            <option>Percentage</option>
            <option>Count</option>
            <option>Bytes</option>
            <option>Time</option>
        </select>
        <button class="btn-icon" onclick="this.parentElement.remove(); markAsChanged();">🗑️</button>
    `;
    
    document.getElementById('customMetricsList').appendChild(metricDiv);
    markAsChanged();
}

// Setup event listeners
function setupEventListeners() {
    // Add change listeners to all inputs
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('change', markAsChanged);
    });
    
    // Range slider updates
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
        input.addEventListener('input', function() {
            const valueSpan = this.parentElement.querySelector('.threshold-value');
            if (valueSpan) {
                valueSpan.textContent = this.value + '%';
            }
            markAsChanged();
        });
    });
}

// Update threshold displays
function updateThresholdDisplays() {
    const thresholds = document.querySelectorAll('input[type="range"]');
    thresholds.forEach(input => {
        const valueSpan = input.parentElement.querySelector('.threshold-value');
        if (valueSpan) {
            valueSpan.textContent = input.value + '%';
        }
    });
}

// Mark as changed
function markAsChanged() {
    hasUnsavedChanges = true;
    document.getElementById('saveBar').classList.add('active');
}

// Save settings
function saveSettings() {
    // Collect all settings
    const newSettings = {
        app: {
            name: document.getElementById('appName').value,
            version: document.getElementById('appVersion').value,
            environment: document.getElementById('appEnvironment').value,
            debug: document.getElementById('debugMode').checked
        },
        api: {
            baseUrl: document.getElementById('apiBaseUrl').value,
            timeout: parseInt(document.getElementById('apiTimeout').value),
            retryAttempts: parseInt(document.getElementById('apiRetryAttempts').value),
            retryDelay: parseInt(document.getElementById('apiRetryDelay').value),
            useMockData: document.getElementById('useMockData').checked
        },
        monitoring: {
            updateInterval: parseInt(document.getElementById('metricsUpdateInterval').value) * 1000,
            alertCheckInterval: parseInt(document.getElementById('alertCheckInterval').value) * 1000,
            chartDataPoints: parseInt(document.getElementById('perfDataPoints').value),
            maxAlertsDisplay: parseInt(document.getElementById('maxAlertsDisplay')?.value || 10)
        },
        thresholds: {
            cpu: {
                warning: parseInt(document.getElementById('cpuWarning').value),
                critical: parseInt(document.getElementById('cpuCritical').value)
            },
            memory: {
                warning: parseInt(document.getElementById('memoryWarning').value),
                critical: parseInt(document.getElementById('memoryCritical').value)
            },
            disk: {
                warning: parseInt(document.getElementById('diskWarning').value),
                critical: parseInt(document.getElementById('diskCritical').value)
            },
            network: {
                latencyWarning: parseInt(document.getElementById('latencyWarning').value),
                latencyCritical: parseInt(document.getElementById('latencyCritical').value),
                packetLossWarning: parseFloat(document.getElementById('packetLossWarning').value),
                packetLossCritical: parseFloat(document.getElementById('packetLossCritical').value)
            }
        },
        features: {
            authentication: document.getElementById('enableAuth').checked,
            realTimeUpdates: document.getElementById('enableRealTime').checked,
            dataExport: document.getElementById('enableExport').checked,
            darkMode: document.getElementById('enableDarkMode').checked,
            showServers: document.getElementById('showServers').checked,
            showCPU: document.getElementById('showCPU').checked,
            showMemory: document.getElementById('showMemory').checked,
            showNetwork: document.getElementById('showNetwork').checked
        },
        security: {
            sessionTimeout: parseInt(document.getElementById('sessionTimeout').value) * 60000,
            maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts').value),
            lockoutDuration: parseInt(document.getElementById('lockoutDuration').value) * 60000,
            requireStrongPassword: document.getElementById('requireStrongPassword').checked
        },
        services: currentSettings.services,
        alertRules: currentSettings.alertRules
    };
    
    // Save to storage
    storageService.set('adminConfig', newSettings);
    currentSettings = newSettings;
    
    // Update global config
    Object.assign(AppConfig, newSettings);
    
    hasUnsavedChanges = false;
    document.getElementById('saveBar').classList.remove('active');
    
    // Show success message
    showNotification('Settings saved successfully!', 'success');
    Logger.info('Admin settings saved', newSettings);
}

// Discard changes
function discardChanges() {
    if (confirm('Are you sure you want to discard all changes?')) {
        loadCurrentSettings();
        hasUnsavedChanges = false;
        document.getElementById('saveBar').classList.remove('active');
        showNotification('Changes discarded', 'info');
    }
}

// Test API connection
function testAPIConnection() {
    const resultDiv = document.getElementById('apiTestResult');
    resultDiv.innerHTML = '<span class="loading">Testing connection...</span>';
    
    setTimeout(() => {
        const useMock = document.getElementById('useMockData').checked;
        if (useMock) {
            resultDiv.innerHTML = '<span class="success">✅ Mock API connected successfully</span>';
        } else {
            // In real implementation, make actual API call
            resultDiv.innerHTML = '<span class="error">❌ Connection failed: Invalid API endpoint</span>';
        }
    }, 1500);
}

// Export configuration
function exportConfiguration() {
    const config = storageService.get('adminConfig') || currentSettings;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-config-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Configuration exported successfully', 'success');
}

// Import configuration
function importConfiguration() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const config = JSON.parse(event.target.result);
                storageService.set('adminConfig', config);
                currentSettings = config;
                loadCurrentSettings();
                showNotification('Configuration imported successfully', 'success');
                markAsChanged();
            } catch (error) {
                showNotification('Failed to import configuration: Invalid file', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Clear cache
function clearCache() {
    if (confirm('Are you sure you want to clear all cached data?')) {
        storageService.clear(true);
        showNotification('Cache cleared successfully', 'success');
    }
}

// Reset to defaults
function resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        storageService.remove('adminConfig');
        window.location.reload();
    }
}

// Import/Export services
function importServices() {
    importConfiguration();
}

function exportServices() {
    const services = currentSettings.services || [];
    const blob = new Blob([JSON.stringify(services, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `services-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', function(e) {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});