# Production Deployment Guide

## Overview

This guide covers the complete production deployment process for AadhaarChain, including infrastructure setup, security hardening, monitoring configuration, and operational procedures.

## Infrastructure Architecture

### Multi-Region Deployment Strategy
```
Production Infrastructure:

Primary Region (Mumbai, India):
├── Web Servers: 6 instances (3 AZs × 2)
├── API Servers: 9 instances (3 AZs × 3)
├── Database: PostgreSQL HA cluster
├── Cache: Redis Cluster (6 nodes)
├── Load Balancers: Application Load Balancer
└── CDN: CloudFront with India edge locations

Secondary Region (Singapore):
├── Web Servers: 4 instances (2 AZs × 2)
├── API Servers: 6 instances (2 AZs × 3)
├── Database: Read replicas
├── Cache: Redis read replicas
└── Load Balancers: Application Load Balancer

Disaster Recovery (US-East):
├── Cold standby infrastructure
├── Database backups
├── Application images
└── Configuration backups
```

### Container Orchestration
```yaml
# kubernetes/production/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aadhaarchain-prod
  labels:
    environment: production
    security-tier: high
---
# kubernetes/production/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aadhaarchain-api
  namespace: aadhaarchain-prod
spec:
  replicas: 9
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: aadhaarchain-api
  template:
    metadata:
      labels:
        app: aadhaarchain-api
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      containers:
      - name: api
        image: aadhaarchain/api:{{ .Values.image.tag }}
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: token
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
```

### Database Configuration
```yaml
# postgresql-ha.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
  namespace: aadhaarchain-prod
spec:
  instances: 3

  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
      maintenance_work_mem: "64MB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      default_statistics_target: "100"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      work_mem: "4MB"
      min_wal_size: "1GB"
      max_wal_size: "4GB"
      max_worker_processes: "8"
      max_parallel_workers_per_gather: "4"
      max_parallel_workers: "8"
      max_parallel_maintenance_workers: "4"

  bootstrap:
    initdb:
      database: aadhaarchain_prod
      owner: aadhaarchain
      secret:
        name: postgres-credentials

  storage:
    size: 1Ti
    storageClass: fast-ssd

  monitoring:
    enabled: true

  backup:
    retentionPolicy: "30d"
    barmanObjectStore:
      destinationPath: "s3://aadhaarchain-backups/postgres"
      s3Credentials:
        accessKeyId:
          name: s3-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: s3-credentials
          key: SECRET_ACCESS_KEY
      wal:
        compression: gzip
        encryption: AES256
```

## Security Hardening

### Network Security
```yaml
# security/network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: aadhaarchain-network-policy
  namespace: aadhaarchain-prod
spec:
  podSelector:
    matchLabels:
      app: aadhaarchain-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  - from:
    - podSelector:
        matchLabels:
          app: aadhaarchain-web
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres-cluster
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis-cluster
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS outbound
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
```

### Pod Security Standards
```yaml
# security/pod-security-policy.yaml
apiVersion: v1
kind: SecurityContext
metadata:
  name: aadhaarchain-security-context
spec:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 3000
  fsGroup: 2000
  seccompProfile:
    type: RuntimeDefault
  seLinuxOptions:
    level: "s0:c123,c456"
  capabilities:
    drop:
    - ALL
    add:
    - NET_BIND_SERVICE
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
```

### Secrets Management
```yaml
# security/vault-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-config
  namespace: aadhaarchain-prod
data:
  vault.hcl: |
    storage "postgresql" {
      connection_url = "postgres://vault:vault@postgres-cluster:5432/vault"
    }

    listener "tcp" {
      address = "0.0.0.0:8200"
      tls_cert_file = "/vault/tls/tls.crt"
      tls_key_file = "/vault/tls/tls.key"
    }

    seal "awskms" {
      region = "ap-south-1"
      kms_key_id = "arn:aws:kms:ap-south-1:ACCOUNT:key/KEY-ID"
    }

    ui = true

    default_lease_ttl = "768h"
    max_lease_ttl = "768h"
---
# External Secrets Operator configuration
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: aadhaarchain-prod
spec:
  provider:
    vault:
      server: "https://vault.aadhaarchain.internal:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "aadhaarchain-role"
```

## Application Deployment

### CI/CD Pipeline
```yaml
# .github/workflows/production-deploy.yml
name: Production Deployment

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Run security scan
      uses: securecodewarrior/github-action-add-sarif@v1
      with:
        sarif-file: 'security-scan-results.sarif'

    - name: Dependency vulnerability scan
      run: |
        npm audit --audit-level=moderate
        docker run --rm -v $(pwd):/app -w /app aquasec/trivy fs .

  build-and-test:
    needs: security-scan
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: |
        npm run test:unit
        npm run test:integration
        npm run test:e2e

    - name: Build application
      run: npm run build

    - name: Build Docker images
      run: |
        docker build -t aadhaarchain/api:${{ github.ref_name }} -f Dockerfile.api .
        docker build -t aadhaarchain/web:${{ github.ref_name }} -f Dockerfile.web .
        docker build -t aadhaarchain/mobile:${{ github.ref_name }} -f Dockerfile.mobile .

  deploy-production:
    needs: build-and-test
    runs-on: ubuntu-latest
    environment: production
    steps:
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ap-south-1

    - name: Login to ECR
      run: |
        aws ecr get-login-password --region ap-south-1 | \
        docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}

    - name: Push images to ECR
      run: |
        docker tag aadhaarchain/api:${{ github.ref_name }} ${{ secrets.ECR_REGISTRY }}/aadhaarchain/api:${{ github.ref_name }}
        docker tag aadhaarchain/web:${{ github.ref_name }} ${{ secrets.ECR_REGISTRY }}/aadhaarchain/web:${{ github.ref_name }}
        docker push ${{ secrets.ECR_REGISTRY }}/aadhaarchain/api:${{ github.ref_name }}
        docker push ${{ secrets.ECR_REGISTRY }}/aadhaarchain/web:${{ github.ref_name }}

    - name: Deploy to Kubernetes
      run: |
        aws eks update-kubeconfig --region ap-south-1 --name aadhaarchain-prod
        helm upgrade --install aadhaarchain ./helm/aadhaarchain \
          --namespace aadhaarchain-prod \
          --set image.tag=${{ github.ref_name }} \
          --set environment=production \
          --wait --timeout=600s

    - name: Run smoke tests
      run: |
        kubectl run smoke-test --image=aadhaarchain/smoke-tests:${{ github.ref_name }} \
          --restart=Never --rm -i --wait=true \
          -- /scripts/smoke-test.sh https://api.aadhaarchain.com

    - name: Notify deployment
      if: always()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Helm Configuration
```yaml
# helm/aadhaarchain/values.yaml
global:
  imageRegistry: "123456789012.dkr.ecr.ap-south-1.amazonaws.com"
  imagePullSecrets:
    - name: ecr-registry-secret

api:
  replicaCount: 9
  image:
    repository: aadhaarchain/api
    tag: "latest"
    pullPolicy: IfNotPresent

  service:
    type: ClusterIP
    port: 3000

  ingress:
    enabled: true
    className: "nginx"
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
      nginx.ingress.kubernetes.io/rate-limit: "100"
      nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    hosts:
      - host: api.aadhaarchain.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: api-tls
        hosts:
          - api.aadhaarchain.com

  resources:
    limits:
      cpu: 500m
      memory: 1Gi
    requests:
      cpu: 250m
      memory: 512Mi

  autoscaling:
    enabled: true
    minReplicas: 9
    maxReplicas: 50
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80

  podSecurityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000

  securityContext:
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities:
      drop:
      - ALL

web:
  replicaCount: 6
  image:
    repository: aadhaarchain/web
    tag: "latest"

  service:
    type: ClusterIP
    port: 3000

  ingress:
    enabled: true
    className: "nginx"
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
      nginx.ingress.kubernetes.io/rate-limit: "200"
    hosts:
      - host: aadhaarchain.com
        paths:
          - path: /
            pathType: Prefix
      - host: www.aadhaarchain.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: web-tls
        hosts:
          - aadhaarchain.com
          - www.aadhaarchain.com

postgresql:
  enabled: false  # Using external PostgreSQL cluster

redis:
  enabled: true
  architecture: replication
  auth:
    enabled: true
    existingSecret: redis-secret
  master:
    persistence:
      enabled: true
      size: 100Gi
  replica:
    replicaCount: 3
    persistence:
      enabled: true
      size: 100Gi

monitoring:
  prometheus:
    enabled: true
  grafana:
    enabled: true
  alertmanager:
    enabled: true
```

## Environment Configuration

### Production Environment Variables
```bash
# Production .env configuration
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@postgres-cluster:5432/aadhaarchain_prod
DATABASE_POOL_SIZE=20
DATABASE_POOL_TIMEOUT=60000

# Redis
REDIS_URL=redis://redis-cluster:6379
REDIS_CLUSTER_MODE=true

# Solana
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com

# API Configuration
API_BASE_URL=https://api.aadhaarchain.com
API_RATE_LIMIT=1000
API_TIMEOUT=30000

# External Services
API_SETU_BASE_URL=https://api.co.in
API_SETU_CLIENT_ID=${VAULT:secret/api-setu:client-id}
API_SETU_CLIENT_SECRET=${VAULT:secret/api-setu:client-secret}

# Security
JWT_SECRET=${VAULT:secret/jwt:secret-key}
ENCRYPTION_KEY=${VAULT:secret/encryption:master-key}
SESSION_SECRET=${VAULT:secret/session:secret-key}

# Monitoring
SENTRY_DSN=${VAULT:secret/sentry:dsn}
DATADOG_API_KEY=${VAULT:secret/datadog:api-key}

# Feature Flags
ENABLE_BIOMETRIC_AUTH=true
ENABLE_ZK_PROOFS=true
ENABLE_CROSS_BORDER=true
ENABLE_ANALYTICS=true

# Performance
CACHE_TTL=3600
API_CACHE_SIZE=1000
WORKER_THREADS=4
```

### Kubernetes Secrets
```yaml
# secrets/production-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: aadhaarchain-prod
type: Opaque
data:
  database-url: <base64-encoded-database-url>
  jwt-secret: <base64-encoded-jwt-secret>
  encryption-key: <base64-encoded-encryption-key>
  api-setu-client-id: <base64-encoded-client-id>
  api-setu-client-secret: <base64-encoded-client-secret>
---
apiVersion: v1
kind: Secret
metadata:
  name: tls-certificates
  namespace: aadhaarchain-prod
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-certificate>
  tls.key: <base64-encoded-private-key>
```

## Monitoring and Observability

### Prometheus Configuration
```yaml
# monitoring/prometheus-config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "aadhaarchain-rules.yml"

scrape_configs:
  - job_name: 'aadhaarchain-api'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - aadhaarchain-prod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: aadhaarchain-api
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboards
```json
{
  "dashboard": {
    "title": "AadhaarChain Production Dashboard",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Verification Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(verification_success_total[5m])) / sum(rate(verification_attempts_total[5m]))",
            "legendFormat": "Success Rate"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Active Connections"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules
```yaml
# monitoring/alert-rules.yaml
groups:
  - name: aadhaarchain-alerts
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value }} for the last 5 minutes"

    - alert: DatabaseConnectionsHigh
      expr: pg_stat_database_numbackends > 150
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High database connections"
        description: "Database has {{ $value }} active connections"

    - alert: VerificationServiceDown
      expr: up{job="aadhaarchain-api"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Verification service is down"
        description: "The verification service has been down for more than 1 minute"

    - alert: LowVerificationSuccessRate
      expr: sum(rate(verification_success_total[5m])) / sum(rate(verification_attempts_total[5m])) < 0.95
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Low verification success rate"
        description: "Verification success rate is {{ $value }} for the last 10 minutes"
```

## Security Compliance

### Security Scanning
```yaml
# security/security-scan.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: security-scan
  namespace: aadhaarchain-prod
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: trivy-scanner
            image: aquasec/trivy:latest
            command:
            - trivy
            - image
            - --format
            - json
            - --output
            - /reports/scan-results.json
            - aadhaarchain/api:latest
            volumeMounts:
            - name: reports
              mountPath: /reports
          - name: upload-results
            image: amazon/aws-cli:latest
            command:
            - aws
            - s3
            - cp
            - /reports/scan-results.json
            - s3://aadhaarchain-security-reports/$(date +%Y-%m-%d)/
            volumeMounts:
            - name: reports
              mountPath: /reports
          volumes:
          - name: reports
            emptyDir: {}
          restartPolicy: OnFailure
```

### Backup and Disaster Recovery
```yaml
# backup/backup-job.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: aadhaarchain-prod
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: pg-dump
            image: postgres:15
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            command:
            - sh
            - -c
            - |
              pg_dump -h postgres-cluster -U aadhaarchain -d aadhaarchain_prod | \
              gzip | \
              aws s3 cp - s3://aadhaarchain-backups/database/backup-$(date +%Y-%m-%d-%H%M%S).sql.gz
            volumeMounts:
            - name: aws-credentials
              mountPath: /root/.aws
              readOnly: true
          volumes:
          - name: aws-credentials
            secret:
              secretName: aws-credentials
          restartPolicy: OnFailure
```

## Performance Optimization

### Auto-Scaling Configuration
```yaml
# autoscaling/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aadhaarchain-api-hpa
  namespace: aadhaarchain-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aadhaarchain-api
  minReplicas: 9
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: nginx_ingress_controller_requests_rate
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 5
        periodSeconds: 60
      selectPolicy: Max
```

### CDN Configuration
```javascript
// cloudfront-config.js
const cloudfrontConfig = {
  distributions: [
    {
      id: 'web-distribution',
      origins: [
        {
          domainName: 'aadhaarchain.com',
          originPath: '',
          customOriginConfig: {
            HTTPPort: 443,
            HTTPSPort: 443,
            originProtocolPolicy: 'https-only'
          }
        }
      ],
      defaultCacheBehavior: {
        targetOriginId: 'web-origin',
        viewerProtocolPolicy: 'redirect-to-https',
        cachePolicyId: 'optimized-caching',
        compress: true,
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD']
      },
      priceClass: 'PriceClass_All',
      geoRestriction: {
        restrictionType: 'none'
      },
      viewerCertificate: {
        acmCertificateArn: 'arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID',
        sslSupportMethod: 'sni-only',
        minimumProtocolVersion: 'TLSv1.2_2021'
      }
    }
  ]
};
```

## Operational Procedures

### Health Checks
```typescript
// health-checks.ts
import { Express } from 'express';
import { Pool } from 'pg';
import { Redis } from 'ioredis';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
}

export class HealthCheckService {
  constructor(
    private app: Express,
    private database: Pool,
    private redis: Redis
  ) {}

  async performHealthChecks(): Promise<HealthCheck[]> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalAPIs(),
      this.checkSolanaRPC()
    ]);

    return checks.map((check, index) => {
      const services = ['database', 'redis', 'external-apis', 'solana-rpc'];

      if (check.status === 'fulfilled') {
        return check.value;
      } else {
        return {
          service: services[index],
          status: 'unhealthy' as const,
          responseTime: 0,
          details: { error: check.reason.message }
        };
      }
    });
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.database.query('SELECT 1');
      return {
        service: 'database',
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: { error: error.message }
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.redis.ping();
      return {
        service: 'redis',
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: { error: error.message }
      };
    }
  }
}

// Setup health check endpoints
app.get('/health', async (req, res) => {
  const healthChecks = await healthCheckService.performHealthChecks();
  const overallStatus = healthChecks.every(check => check.status === 'healthy')
    ? 'healthy'
    : 'unhealthy';

  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: healthChecks
  });
});

app.get('/ready', async (req, res) => {
  // Readiness check - can the service handle requests?
  const criticalChecks = await Promise.allSettled([
    healthCheckService.checkDatabase(),
    healthCheckService.checkRedis()
  ]);

  const ready = criticalChecks.every(check =>
    check.status === 'fulfilled' && check.value.status === 'healthy'
  );

  res.status(ready ? 200 : 503).json({
    ready,
    timestamp: new Date().toISOString()
  });
});
```

### Deployment Verification
```bash
#!/bin/bash
# scripts/verify-deployment.sh

set -e

echo "🚀 Verifying production deployment..."

# Check API health
echo "Checking API health..."
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.aadhaarchain.com/health)
if [ "$API_HEALTH" != "200" ]; then
  echo "❌ API health check failed (HTTP $API_HEALTH)"
  exit 1
fi
echo "✅ API health check passed"

# Check web application
echo "Checking web application..."
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://aadhaarchain.com)
if [ "$WEB_STATUS" != "200" ]; then
  echo "❌ Web application check failed (HTTP $WEB_STATUS)"
  exit 1
fi
echo "✅ Web application check passed"

# Check database connectivity
echo "Checking database connectivity..."
kubectl exec -n aadhaarchain-prod deployment/aadhaarchain-api -- \
  node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT 1').then(() => {
      console.log('Database connection successful');
      process.exit(0);
    }).catch(err => {
      console.error('Database connection failed:', err.message);
      process.exit(1);
    });
  "
echo "✅ Database connectivity check passed"

# Check Redis connectivity
echo "Checking Redis connectivity..."
kubectl exec -n aadhaarchain-prod deployment/aadhaarchain-api -- \
  node -e "
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL);
    redis.ping().then(() => {
      console.log('Redis connection successful');
      process.exit(0);
    }).catch(err => {
      console.error('Redis connection failed:', err.message);
      process.exit(1);
    });
  "
echo "✅ Redis connectivity check passed"

# Run smoke tests
echo "Running smoke tests..."
kubectl run smoke-test-$(date +%s) \
  --image=aadhaarchain/smoke-tests:latest \
  --restart=Never \
  --rm -i \
  --timeout=300s \
  -- /scripts/smoke-test.sh https://api.aadhaarchain.com

echo "✅ All deployment verification checks passed!"
echo "🎉 Production deployment is healthy and ready!"
```

This comprehensive production deployment guide ensures a secure, scalable, and monitored AadhaarChain deployment that can handle millions of users while maintaining high availability and security standards.