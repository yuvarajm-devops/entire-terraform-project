# Real-Time DevOps Server Monitoring Platform (PulseOps)

A production-grade, full-stack server monitoring and DevOps telemetry platform built with React, Node.js, PostgreSQL, AWS Infrastructure (Terraform), Docker Hub, and an automated Jenkins CI/CD pipeline on AWS EC2.

---

## Architecture Overview

```
                      +-----------------------------+
                      |    Internet Users / Hosts   |
                      +--------------+--------------+
                                     |
               Public HTTP Port 80   |  Port 8080 (Trusted IP only)
                                     v               v
                      +--------------------+  +----------------------+
                      |  Application Load  |  |  Jenkins CI/CD       |
                      |  Balancer (ALB)    |  |  (EC2 Host Port 8080)|
                      +----------+---------+  +----------------------+
                                 | (Port 8081)
                                 v
        +======================================================+
        |                 AWS EC2 Instance                     |
        |                                                      |
        |   +----------------------------------------------+   |
        |   | React Frontend (Nginx SPA Reverse Proxy)     |   |
        |   | Host Port 8081 -> Container Port 80          |   |
        |   +----------------------+-----------------------+   |
        |                          |                           |
        |             Docker Network (internal_net)            |
        |                          |                           |
        |   +----------------------v-----------------------+   |
        |   | Express REST API Backend (:8080 internal)    |   |
        |   | Service: backend                             |   |
        |   +----------------------+-----------------------+   |
        |                          |                           |
        |   +----------------------v-----------------------+   |
        |   | PostgreSQL 16 Alpine Database (:5432)        |   |
        |   | Volume: postgres_data (Persistent)           |   |
        |   +----------------------------------------------+   |
        +======================================================+
```

---

## Technology Stack

- **Cloud Platform:** AWS (EC2 `t3.medium`, Multi-AZ VPC, Application Load Balancer, Security Groups)
- **Infrastructure as Code:** Terraform
- **Containerization:** Docker Engine & Docker Compose
- **Image Registry:** Docker Hub (`yuvarajm1810/pulseops-frontend`, `yuvarajm1810/pulseops-backend`)
- **CI/CD Automation:** Jenkins (Declarative Pipeline on EC2)
- **Source Control:** GitHub with Webhook triggers
- **Application Stack:** React (Vite, Tailwind CSS), Node.js (Express), PostgreSQL 16 Alpine
- **Monitoring Agent:** Python Linux system telemetry daemon

---

## Directory Structure

```
├── app/
│   ├── backend/               # Node.js Express REST API server
│   │   ├── src/               # Routes, services, database connection, auth
│   │   ├── tests/             # Automated test suite (Jest + Supertest)
│   │   └── Dockerfile         # Multi-stage production container build
│   ├── database/              # Relational schema and initial seed data
│   │   ├── init.sql           # PostgreSQL tables, indexes, and initial admin
│   │   └── schema.sql         # Schema definition file
│   └── frontend/              # React + Vite + Tailwind CSS dashboard
│       ├── src/               # UI components, pages, API clients, context
│       ├── nginx.conf         # Production Nginx reverse proxy configuration
│       └── Dockerfile         # Multi-stage production container build
├── infrastructure/
│   └── terraform/             # AWS Infrastructure as Code
│       ├── compute.tf         # Ubuntu 24.04 EC2 instance, user_data bootstrap
│       ├── iam.tf             # SSM managed instance profile for EC2
│       ├── load-balancer.tf   # Public multi-AZ ALB, target group (8081), listener
│       ├── networking.tf      # Multi-AZ VPC, public subnets, IGW, route tables
│       ├── security-groups.tf # ALB (port 80) and EC2 SG (8081 ALB, 8080/22 trusted)
│       ├── variables.tf       # Parameter declarations (region, CIDR, trusted IP)
│       ├── outputs.tf         # VPC, ALB URL, EC2 IP, Jenkins URL
│       └── terraform.tfvars.example # Example configuration file
├── jenkins/
│   └── Jenkinsfile            # 8-stage declarative CI/CD pipeline
├── monitoring/
│   ├── agent/                 # Linux monitoring agent
│   │   ├── agent.py           # Real telemetry collection daemon
│   │   ├── install_agent.sh   # Systemd service installer script
│   │   └── monitoring-agent.service # Systemd unit template
│   └── README.md              # Monitoring and agent documentation
└── docker-compose.yml         # Unified container composition (frontend, backend, db)
```

---

## Step-by-Step Deployment Guide

### 1. Provision Infrastructure with Terraform

1. Navigate to the terraform directory:
   ```bash
   cd infrastructure/terraform
   ```

2. Initialize Terraform:
   ```bash
   terraform init
   ```

3. Configure variables:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
   Edit `terraform.tfvars` and set your trusted IP CIDR:
   ```hcl
   trusted_ip = "YOUR_PUBLIC_IP/32"
   ```

4. Preview and apply infrastructure:
   ```bash
   terraform plan
   terraform apply -auto-approve
   ```

5. Note down the outputs:
   - `load_balancer_url`: Public access URL for the application dashboard.
   - `jenkins_url`: Direct access URL for the Jenkins console on port 8080.
   - `instance_public_ip`: Public IP of the EC2 instance.

---

### 2. Configure Jenkins on EC2

1. Open the Jenkins management console:
   ```
   http://<instance_public_ip>:8080
   ```

2. Retrieve the initial administrator password via SSH / SSM:
   ```bash
   sudo cat /var/lib/jenkins/secrets/initialAdminPassword
   ```

3. Install suggested plugins and create your admin account.

4. Add Docker Hub Credentials in Jenkins:
   - Go to **Manage Jenkins** → **Credentials** → **System** → **Global credentials (unrestricted)**.
   - Click **Add Credentials**.
   - Kind: **Username with password**
   - Scope: **Global**
   - Username: `yuvarajm1810`
   - Password: `<your-docker-hub-access-token-or-password>`
   - ID: `docker-hub-credentials`
   - Description: `Docker Hub credentials for image pushing`
   - Click **Create**.

---

### 3. Setup GitHub Webhook

1. Open your repository on GitHub.
2. Go to **Settings** → **Webhooks** → **Add webhook**.
3. **Payload URL:** `http://<instance_public_ip>:8080/github-webhook/`
4. **Content type:** `application/json`
5. **Which events to trigger:** Select **Just the push event**.
6. Click **Add webhook**.

---

### 4. Create and Run Jenkins Pipeline

1. In Jenkins, click **New Item** → Name: `pulseops-pipeline` → Select **Pipeline** → Click **OK**.
2. Under **Build Triggers**, check **GitHub hook trigger for GITScm polling**.
3. Under **Pipeline**:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/yuvarajm1810/realtime-devops-terraform.git` (or your repository URL)
   - Branch Specifier: `*/master` or `*/main`
   - Script Path: `jenkins/Jenkinsfile`
4. Click **Save** and click **Build Now**.

---

### 5. Access the Application

- **Public Dashboard via ALB:**
  ```
  http://<ALB_DNS_NAME>
  ```
- **Default Administrator Credentials:**
  - **Email:** `admin@monitoring.local`
  - **Password:** `AdminPassword123!`

---

## Local Verification Commands

Run all local validation commands before pushing changes:

```bash
# 1. Backend Automated Tests (Jest)
cd app/backend && npm test

# 2. Frontend Production Build
cd app/frontend && npm run build

# 3. Terraform Validation
cd infrastructure/terraform
terraform fmt -check -recursive
terraform validate

# 4. Docker Compose Config Validation
docker compose config -q
```

---

## Rollback & Backup Procedures

### Safe Rollback
If a newly deployed image tag has issues, rollback immediately to the previous tag on the EC2 host:

```bash
PREV_TAG=$(cat .previous_deployment 2>/dev/null || echo "latest")
IMAGE_TAG=$PREV_TAG FRONTEND_PORT=8081 docker compose up -d
```

### PostgreSQL Backup
The database uses a persistent named volume `postgres_data`. To take an ad-hoc SQL dump:

```bash
docker exec pulseops-postgres pg_dump -U postgres monitoring_db > backup_$(date +%Y%m%d_%H%M%S).sql
```
