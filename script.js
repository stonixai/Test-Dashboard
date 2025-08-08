// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    updateMetrics();
    startRealTimeUpdates();
    initializeAlerts();
});

// Chart configurations
let performanceChart;
let resourceChart;

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
                tension: 0.4
            }, {
                label: 'Memory Usage',
                data: generateRandomData(24, 30, 70),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4
            }, {
                label: 'Network I/O',
                data: generateRandomData(24, 20, 60),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f5f9'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
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

// Update metrics with random values
function updateMetrics() {
    // Update CPU Usage
    const cpuUsage = Math.floor(Math.random() * 30) + 50;
    document.getElementById('cpuUsage').textContent = cpuUsage + '%';
    
    // Update Memory Usage
    const memoryUsage = (Math.random() * 6 + 6).toFixed(1);
    document.getElementById('memoryUsage').textContent = memoryUsage + ' GB';
    
    // Update Network Speed
    const networkSpeed = (Math.random() * 0.8 + 0.8).toFixed(1);
    document.getElementById('networkSpeed').textContent = networkSpeed + ' Gbps';
    
    // Update Server Count
    const serverCount = Math.floor(Math.random() * 5) + 22;
    document.getElementById('serverCount').textContent = serverCount;
    
    // Update last update time
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
}

// Start real-time updates
function startRealTimeUpdates() {
    // Update metrics every 5 seconds
    setInterval(() => {
        updateMetrics();
        updateCharts();
    }, 5000);
    
    // Add new alert every 30 seconds
    setInterval(() => {
        addRandomAlert();
    }, 30000);
}

// Update charts with new data
function updateCharts() {
    // Update performance chart
    if (performanceChart) {
        performanceChart.data.datasets.forEach(dataset => {
            dataset.data.shift();
            dataset.data.push(Math.floor(Math.random() * 40) + 40);
        });
        performanceChart.update('none');
    }
    
    // Update resource chart
    if (resourceChart) {
        const total = 100;
        const values = [
            Math.floor(Math.random() * 10) + 25,
            Math.floor(Math.random() * 10) + 20,
            Math.floor(Math.random() * 10) + 10,
            Math.floor(Math.random() * 10) + 15
        ];
        const sum = values.reduce((a, b) => a + b, 0);
        values.push(total - sum);
        resourceChart.data.datasets[0].data = values;
        resourceChart.update('none');
    }
}

// Alert management
const alertTypes = [
    { type: 'warning', icon: '⚠️', title: 'High CPU Usage', message: 'Server WEB-03 CPU usage at 89%' },
    { type: 'info', icon: 'ℹ️', title: 'Backup Complete', message: 'Daily backup completed successfully' },
    { type: 'success', icon: '✅', title: 'Service Recovered', message: 'Database connection restored' },
    { type: 'danger', icon: '🚨', title: 'Service Down', message: 'API Gateway is not responding' },
    { type: 'warning', icon: '⚠️', title: 'Disk Space Low', message: 'Storage server at 85% capacity' },
    { type: 'info', icon: 'ℹ️', title: 'Update Available', message: 'Security patches ready to install' }
];

function initializeAlerts() {
    // Initialize with some alerts
    const container = document.getElementById('alertsContainer');
    container.innerHTML = '';
    
    // Add initial alerts
    addAlert('warning', '⚠️', 'High Memory Usage', 'Server DB-02 memory usage at 85%', '5 mins ago');
    addAlert('info', 'ℹ️', 'Scheduled Maintenance', 'Backup service will be offline for updates', '1 hour ago');
    addAlert('success', '✅', 'Service Restored', 'API Gateway back online after brief outage', '3 hours ago');
}

function addAlert(type, icon, title, message, time) {
    const container = document.getElementById('alertsContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <div class="alert-icon">${icon}</div>
        <div class="alert-content">
            <strong>${title}</strong>
            <p>${message}</p>
        </div>
        <div class="alert-time">${time}</div>
    `;
    
    // Add to beginning of container
    container.insertBefore(alertDiv, container.firstChild);
    
    // Keep only last 5 alerts
    while (container.children.length > 5) {
        container.removeChild(container.lastChild);
    }
}

function addRandomAlert() {
    const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    addAlert(alert.type, alert.icon, alert.title, alert.message, 'Just now');
}

// Service status simulation
function updateServiceStatus() {
    const services = document.querySelectorAll('.service-card');
    services.forEach(service => {
        // Random chance to change status
        if (Math.random() < 0.1) {
            const statuses = ['online', 'warning', 'offline'];
            const currentStatus = service.className.replace('service-card ', '');
            const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            if (currentStatus !== newStatus) {
                service.className = `service-card ${newStatus}`;
                
                // Update uptime if going offline
                if (newStatus === 'offline') {
                    service.querySelector('.service-uptime').textContent = '--';
                } else {
                    const uptime = (95 + Math.random() * 4.99).toFixed(2);
                    service.querySelector('.service-uptime').textContent = uptime + '%';
                }
            }
        }
    });
}

// Update service status every 10 seconds
setInterval(updateServiceStatus, 10000);