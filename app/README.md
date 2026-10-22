# Monitoring Application

<!-- Explains the purpose of the application used in the DevOps pipeline -->
This folder contains the complete server monitoring platform consisting of:
- `app/frontend/`: React + Vite + Tailwind CSS monitoring dashboard.
- `app/backend/`: Node.js + Express REST API server.
- `app/database/`: PostgreSQL schema and initialization scripts.

<!-- Describes the container build process -->
Build the application images using Docker:
```bash
docker build -t yuvarajm1810/pulseops-backend:latest ./app/backend
docker build -t yuvarajm1810/pulseops-frontend:latest ./app/frontend
```

<!-- Explains the image registry destination -->
Push the tagged images to Docker Hub (`yuvarajm1810/pulseops-*`).

<!-- Explains how the deployment pipeline updates EC2 -->
Deploy the updated containers through Jenkins and Docker Compose on EC2.

<!-- Documents the endpoint used by the load balancer health check -->
The application validates service health at `/health`:
```bash
curl -f http://localhost:8081/health
```
