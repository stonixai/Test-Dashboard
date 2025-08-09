class APIService {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
        this.activeRequests = new Map();
    }

    async request(endpoint, options = {}) {
        const url = `${this.config.api.baseUrl}${endpoint}`;
        const requestKey = `${options.method || 'GET'}-${url}`;
        
        if (this.activeRequests.has(requestKey)) {
            return this.activeRequests.get(requestKey);
        }

        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                ...this.config.api.headers,
                ...options.headers
            },
            signal: AbortSignal.timeout(this.config.api.timeout),
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            requestOptions.body = JSON.stringify(options.body);
        }

        const requestPromise = this.executeRequest(url, requestOptions, requestKey);
        this.activeRequests.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.activeRequests.delete(requestKey);
        }
    }

    async executeRequest(url, options, cacheKey) {
        let lastError;
        
        for (let attempt = 0; attempt < this.config.api.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, options);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (options.method === 'GET') {
                    this.cache.set(cacheKey, {
                        data,
                        timestamp: Date.now()
                    });
                }
                
                return data;
            } catch (error) {
                lastError = error;
                Logger.error(`API request failed (attempt ${attempt + 1}):`, error);
                
                if (attempt < this.config.api.retryAttempts - 1) {
                    await this.delay(this.config.api.retryDelay * Math.pow(2, attempt));
                }
            }
        }
        
        throw lastError;
    }

    getCached(endpoint, maxAge = 60000) {
        const cacheKey = `GET-${this.config.api.baseUrl}${endpoint}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < maxAge) {
            return cached.data;
        }
        
        return null;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    clearCache() {
        this.cache.clear();
    }
}

class MockAPIService extends APIService {
    constructor(config) {
        super(config);
        this.mockData = new MockDataGenerator();
    }

    async request(endpoint, options = {}) {
        await this.delay(Math.random() * 500 + 200);
        
        if (endpoint.includes('/metrics')) {
            return this.mockData.generateMetrics();
        } else if (endpoint.includes('/services')) {
            return this.mockData.generateServices();
        } else if (endpoint.includes('/alerts')) {
            return this.mockData.generateAlerts();
        } else if (endpoint.includes('/performance')) {
            return this.mockData.generatePerformanceData();
        }
        
        return { success: true, data: null };
    }
}

class MockDataGenerator {
    generateMetrics() {
        return {
            servers: {
                total: 24 + Math.floor(Math.random() * 5),
                online: 22 + Math.floor(Math.random() * 3),
                offline: Math.floor(Math.random() * 2),
                maintenance: Math.floor(Math.random() * 2)
            },
            cpu: {
                usage: 45 + Math.floor(Math.random() * 35),
                cores: 128,
                frequency: 2.4
            },
            memory: {
                total: 64,
                used: 25 + Math.random() * 30,
                free: 39 - Math.random() * 30,
                cache: 5 + Math.random() * 10
            },
            network: {
                inbound: Math.random() * 2 + 0.5,
                outbound: Math.random() * 1.5 + 0.3,
                latency: 5 + Math.random() * 20,
                packetLoss: Math.random() * 0.5
            },
            disk: {
                total: 1000,
                used: 450 + Math.random() * 200,
                free: 550 - Math.random() * 200
            }
        };
    }

    generateServices() {
        return AppConfig.services.map(service => ({
            ...service,
            status: Math.random() > 0.1 ? 'online' : Math.random() > 0.5 ? 'warning' : 'offline',
            uptime: Math.random() > 0.5 ? (98 + Math.random() * 1.99).toFixed(2) : '--',
            responseTime: Math.floor(Math.random() * 100) + 10,
            lastCheck: new Date().toISOString(),
            metrics: {
                cpu: Math.random() * 100,
                memory: Math.random() * 100,
                connections: Math.floor(Math.random() * 1000)
            }
        }));
    }

    generateAlerts() {
        const severities = ['info', 'warning', 'critical', 'success'];
        const messages = [
            { title: 'High CPU Usage', message: 'Server {server} CPU at {value}%', severity: 'warning' },
            { title: 'Service Recovered', message: '{service} is back online', severity: 'success' },
            { title: 'Memory Warning', message: 'Memory usage exceeds {value}%', severity: 'warning' },
            { title: 'Network Latency', message: 'High latency detected: {value}ms', severity: 'critical' },
            { title: 'Backup Complete', message: 'Daily backup completed successfully', severity: 'info' },
            { title: 'Security Update', message: 'Security patches available', severity: 'info' }
        ];

        return Array.from({ length: 5 }, () => {
            const template = messages[Math.floor(Math.random() * messages.length)];
            return {
                id: Math.random().toString(36).substr(2, 9),
                ...template,
                message: template.message
                    .replace('{server}', `SRV-${Math.floor(Math.random() * 10) + 1}`)
                    .replace('{service}', AppConfig.services[Math.floor(Math.random() * AppConfig.services.length)].name)
                    .replace('{value}', Math.floor(Math.random() * 30) + 70),
                timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
                acknowledged: false
            };
        });
    }

    generatePerformanceData() {
        const points = 24;
        const now = Date.now();
        
        return {
            cpu: Array.from({ length: points }, (_, i) => ({
                timestamp: new Date(now - (points - i) * 3600000).toISOString(),
                value: 40 + Math.random() * 40 + Math.sin(i / 3) * 10
            })),
            memory: Array.from({ length: points }, (_, i) => ({
                timestamp: new Date(now - (points - i) * 3600000).toISOString(),
                value: 30 + Math.random() * 30 + Math.cos(i / 4) * 10
            })),
            network: Array.from({ length: points }, (_, i) => ({
                timestamp: new Date(now - (points - i) * 3600000).toISOString(),
                inbound: Math.random() * 2,
                outbound: Math.random() * 1.5
            }))
        };
    }
}