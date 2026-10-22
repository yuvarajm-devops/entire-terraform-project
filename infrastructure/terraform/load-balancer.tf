# Creates a public Application Load Balancer across multi-AZ public subnets
resource "aws_lb" "main" {
  name               = "realtime-devops-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public.id, aws_subnet.public_2.id]

  tags = {
    Name        = "realtime-devops-alb"
    Environment = var.environment
  }
}

# Defines where the ALB sends application requests and how it checks health
resource "aws_lb_target_group" "app" {
  name        = "realtime-devops-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  # Validates service health via the application's /health endpoint
  health_check {
    path                = "/health"
    protocol            = "HTTP"
    port                = "traffic-port"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name        = "realtime-devops-tg"
    Environment = var.environment
  }
}

# Registers the EC2 instance with the target group on var.app_port
resource "aws_lb_target_group_attachment" "app" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.app.id
  port             = var.app_port
}

# Listens for HTTP requests on port 80 and forwards to the application target group
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
