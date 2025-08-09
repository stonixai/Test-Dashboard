const AppConfig = {
    app: {
        name: 'IT Infrastructure Monitor',
        version: '2.0.0',
        environment: 'production',
        debug: false,
        locale: 'en-US',
        timezone: 'UTC'
    },
    
    api: {
        baseUrl: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : 'https://api.monitoring.example.com',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        headers: {
            'Content-Type': 'application/json',
            'X-API-Version': 'v1'
        }
    },
    
    monitoring: {
        updateInterval: 5000,
        alertCheckInterval: 30000,
        maxAlertsDisplay: 10,
        chartDataPoints: 24,
        historicalDataDays: 30
    },
    
    thresholds: {
        cpu: {
            warning: 70,
            critical: 90
        },
        memory: {
            warning: 75,
            critical: 85
        },
        disk: {
            warning: 80,
            critical: 95
        },
        network: {
            latencyWarning: 100,
            latencyCritical: 500,
            packetLossWarning: 0.5,
            packetLossCritical: 2
        }
    },
    
    services: [
        { id: 'web-server', name: 'Web Server', type: 'nginx', version: '1.21.0', critical: true },
        { id: 'database', name: 'Database', type: 'PostgreSQL', version: '14', critical: true },
        { id: 'cache', name: 'Cache Server', type: 'Redis', version: '6.2', critical: false },
        { id: 'load-balancer', name: 'Load Balancer', type: 'HAProxy', version: '2.4', critical: true },
        { id: 'api-gateway', name: 'API Gateway', type: 'Kong', version: '2.8', critical: true },
        { id: 'backup', name: 'Backup Service', type: 'Custom', version: '1.0', critical: false },
        { id: 'message-queue', name: 'Message Queue', type: 'RabbitMQ', version: '3.9', critical: true },
        { id: 'monitoring', name: 'Monitoring', type: 'Prometheus', version: '2.35', critical: true }
    ],
    
    features: {
        authentication: true,
        realTimeUpdates: true,
        dataExport: true,
        alertNotifications: true,
        darkMode: true,
        multiLanguage: false,
        advancedAnalytics: true
    },
    
    security: {
        sessionTimeout: 1800000,
        maxLoginAttempts: 5,
        lockoutDuration: 900000,
        requireStrongPassword: true,
        enableCSRF: true,
        enableRateLimiting: true
    },
    
    storage: {
        type: 'localStorage',
        prefix: 'itm_',
        encryption: false,
        maxSize: 5242880
    },
    
    logging: {
        enabled: true,
        level: 'info',
        console: true,
        remote: false,
        remoteUrl: null
    }
};

Object.freeze(AppConfig);