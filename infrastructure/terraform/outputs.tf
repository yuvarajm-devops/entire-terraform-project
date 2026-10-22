# ID of the project VPC
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID of the project VPC"
}

# Public URL of the Application Load Balancer
output "load_balancer_url" {
  value       = "http://${aws_lb.main.dns_name}"
  description = "Public URL of the Application Load Balancer to access the PulseOps dashboard"
}

output "load_balancer_dns" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the Application Load Balancer"
}

# ID of the application EC2 instance
output "instance_id" {
  value       = aws_instance.app.id
  description = "ID of the EC2 instance running Jenkins and application containers"
}

# Public IP address of the EC2 instance
output "instance_public_ip" {
  value       = aws_instance.app.public_ip
  description = "Public IPv4 address of the EC2 instance"
}

# Jenkins Management Console URL
output "jenkins_url" {
  value       = "http://${aws_instance.app.public_ip}:8080"
  description = "Direct access URL for the Jenkins CI/CD automation console"
}

# Direct host application port (bypassing ALB for testing)
output "application_direct_url" {
  value       = "http://${aws_instance.app.public_ip}:${var.app_port}"
  description = "Direct URL to application container port on the EC2 host"
}

# ARN of the ALB target group
output "target_group_arn" {
  value       = aws_lb_target_group.app.arn
  description = "ARN of the Application Load Balancer target group"
}
