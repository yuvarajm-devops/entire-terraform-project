# Security group for the public Application Load Balancer
resource "aws_security_group" "alb" {
  name        = "realtime-devops-alb-sg"
  description = "Controls inbound public traffic to the Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  # Allows public HTTP traffic from the internet
  ingress {
    description = "Public HTTP traffic"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allows all outbound traffic from the ALB
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "realtime-devops-alb-sg"
    Environment = var.environment
  }
}

# Security group for the EC2 instance hosting Jenkins and application containers
resource "aws_security_group" "app" {
  name        = "realtime-devops-app-sg"
  description = "Controls inbound traffic to Jenkins and application containers"
  vpc_id      = aws_vpc.main.id

  # Accepts application frontend traffic ONLY from the ALB on var.app_port (8081)
  ingress {
    description     = "Application traffic from ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Jenkins web dashboard on port 8080 - restricted to trusted IP
  ingress {
    description = "Jenkins management console from trusted IP"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.trusted_ip]
  }

  # SSH access on port 22 - restricted to trusted IP
  ingress {
    description = "SSH access from trusted IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.trusted_ip]
  }

  # Allows all outbound traffic (package downloads, Docker Hub, updates)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "realtime-devops-app-sg"
    Environment = var.environment
  }
}
