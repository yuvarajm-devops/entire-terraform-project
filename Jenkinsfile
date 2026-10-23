// Production CI/CD Pipeline for PulseOps Server Monitoring Platform
// Architecture: GitHub -> Jenkins -> Docker Hub (yuvarajm1810) -> Docker Compose (EC2) -> ALB
pipeline {
    agent any

    environment {
        DOCKER_HUB_USER         = 'yuvarajm1810'
        FRONTEND_IMAGE          = 'yuvarajm1810/pulseops-frontend'
        BACKEND_IMAGE           = 'yuvarajm1810/pulseops-backend'
        DOCKER_HUB_CREDENTIALS  = 'docker-hub-credentials'
        APP_PORT                = '8081'
        IMAGE_TAG               = "${env.BUILD_NUMBER}-${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'manual'}"
    }

    stages {
        // Stage 1: Checkout source code from configured Git branch
        stage('Checkout') {
            steps {
                echo "=========================================================="
                echo "Checking out PulseOps source code (Build #${env.BUILD_NUMBER})..."
                echo "Commit: ${env.GIT_COMMIT ?: 'HEAD'} | Branch: ${env.BRANCH_NAME ?: 'master'}"
                echo "Target Image Tag: ${env.IMAGE_TAG}"
                echo "=========================================================="
                checkout scm
            }
        }

        // Stage 2: Validate environment, Docker Compose, and Terraform syntax
        stage('Validate Configuration') {
            steps {
                echo "Validating Docker Compose configuration and Terraform templates..."
                sh '''
                    # Verify Docker and Docker Compose
                    docker --version
                    docker compose version

                    # Validate Docker Compose file syntax without starting services
                    docker compose config -q
                    echo "Docker Compose configuration is valid."

                    # Validate Terraform configuration
                    dir="infrastructure/terraform"
                    if [ -d "$dir" ]; then
                        terraform -chdir="$dir" init -backend=false
                        terraform -chdir="$dir" fmt -check
                        terraform -chdir="$dir" validate
                        echo "Terraform infrastructure configuration is valid."
                    fi
                '''
            }
        }

        // Stage 3: Install frontend dependencies and build React production bundle
        stage('Frontend Build') {
            steps {
                echo "Building React + Vite frontend application..."
                dir('app/frontend') {
                    sh '''
                        npm ci
                        npm run build
                    '''
                }
            }
        }

        // Stage 4: Run backend unit and integration test suite
        stage('Backend Test') {
            steps {
                echo "Running backend unit and integration tests (Jest)..."
                dir('app/backend') {
                    sh '''
                        npm ci
                        npm test
                    '''
                }
            }
        }

        // Stage 5: Build container images with unique immutable tag & latest
        stage('Build Docker Images') {
            steps {
                echo "Building frontend and backend container images..."
                sh """
                    docker build -t ${env.FRONTEND_IMAGE}:${env.IMAGE_TAG} -t ${env.FRONTEND_IMAGE}:latest ./app/frontend
                    docker build -t ${env.BACKEND_IMAGE}:${env.IMAGE_TAG} -t ${env.BACKEND_IMAGE}:latest ./app/backend
                """
            }
        }

        // Stage 6: Authenticate with Docker Hub and push versioned images
        stage('Push to Docker Hub') {
            steps {
                echo "Authenticating to Docker Hub and publishing images under ${env.DOCKER_HUB_USER}..."
                withCredentials([usernamePassword(
                    credentialsId: env.DOCKER_HUB_CREDENTIALS,
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        set +x
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        set -x

                        # Push immutable versioned tags
                        docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                        docker push ${BACKEND_IMAGE}:${IMAGE_TAG}

                        # Push latest floating tags
                        docker push ${FRONTEND_IMAGE}:latest
                        docker push ${BACKEND_IMAGE}:latest

                        docker logout
                        echo "Images pushed successfully to Docker Hub."
                    '''
                }
            }
        }

        // Stage 7: Deploy new image version to EC2 using Docker Compose
        stage('Deploy to EC2') {
            steps {
                echo "Deploying version ${env.IMAGE_TAG} to host using Docker Compose on port ${env.APP_PORT}..."
                sh '''
                    # Save currently deployed tag for rollback tracking
                    if [ -f .current_deployment ]; then
                        cp .current_deployment .previous_deployment
                    fi
                    echo "${IMAGE_TAG}" > .current_deployment

                    # Pull and deploy exact versioned images preserving PostgreSQL data volume
                    IMAGE_TAG=${IMAGE_TAG} FRONTEND_PORT=${APP_PORT} docker compose pull || true
                    IMAGE_TAG=${IMAGE_TAG} FRONTEND_PORT=${APP_PORT} docker compose up -d --remove-orphans

                    echo "Docker Compose deployment initiated for tag ${IMAGE_TAG}."
                '''
            }
        }

        // Stage 8: Verify application and endpoint health
        stage('Verify Health') {
            steps {
                echo "Verifying application service health on port ${env.APP_PORT}..."
                sh '''
                    # Wait for services to complete startup and health checks
                    HEALTHY=false
                    for i in $(seq 1 15); do
                        echo "Health check attempt $i of 15..."
                        STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${APP_PORT}/health || echo "000")
                        if [ "$STATUS_CODE" = "200" ]; then
                            echo "Service health check passed (HTTP 200 OK)!"
                            HEALTHY=true
                            break
                        fi
                        sleep 4
                    done

                    if [ "$HEALTHY" != "true" ]; then
                        echo "ERROR: Health check timed out after 60 seconds."
                        docker compose logs --tail=50
                        exit 1
                    fi

                    # Verify API authentication proxy functionality
                    echo "Validating REST API authentication endpoint..."
                    LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
                        -X POST http://localhost:${APP_PORT}/api/auth/login \
                        -H "Content-Type: application/json" \
                        -d '{"email":"admin@monitoring.local","password":"AdminPassword123!"}' || echo "000")

                    if [ "$LOGIN_STATUS" = "200" ]; then
                        echo "API Authentication proxy verified successfully (HTTP 200 OK)."
                    else
                        echo "WARNING: Login check returned HTTP $LOGIN_STATUS."
                    fi
                '''
            }
        }
    }

    post {
        always {
            echo "Pipeline run #${env.BUILD_NUMBER} completed for tag ${env.IMAGE_TAG}."
        }
        success {
            echo "=========================================================="
            echo "SUCCESS: PulseOps Application v${env.IMAGE_TAG} is LIVE!"
            echo "Docker Hub Images: ${env.FRONTEND_IMAGE}:${env.IMAGE_TAG}"
            echo "                   ${env.BACKEND_IMAGE}:${env.IMAGE_TAG}"
            echo "Application Port:  http://localhost:${env.APP_PORT}"
            echo "=========================================================="
        }
        failure {
            echo "=========================================================="
            echo "PIPELINE FAILED for tag ${env.IMAGE_TAG}."
            echo "To rollback to previous deployment, run on EC2 host:"
            echo "  PREV_TAG=\$(cat .previous_deployment 2>/dev/null || echo 'latest')"
            echo "  IMAGE_TAG=\$PREV_TAG FRONTEND_PORT=${env.APP_PORT} docker compose up -d"
            echo "=========================================================="
        }
    }
}
