variable "aws_region" {
  description = "AWS region for the project"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR range for the project VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "instance_type" {
  description = "EC2 instance size for running Jenkins and the PulseOps application stack"
  type        = string
  default     = "t3.medium"
}

variable "trusted_ip" {
  description = "Trusted IP CIDR allowed to access Jenkins (port 8080) and SSH (port 22). Example: '203.0.113.10/32'"
  type        = string
  default     = "0.0.0.0/0"
}

variable "ssh_key_name" {
  description = "Name of an existing AWS EC2 key pair for SSH access (optional)"
  type        = string
  default     = ""
}

variable "app_port" {
  description = "Host port on EC2 mapped to the frontend container (target for ALB traffic)"
  type        = number
  default     = 8081
}
