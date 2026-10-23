# tuiee
# IAM role for EC2 instance enabling AWS Systems Manager (SSM) Session Manager
resource "aws_iam_role" "ec2" {
  name = "realtime-devops-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name        = "realtime-devops-ec2-role"
    Environment = var.environment
  }
}

# Attach AWS managed policy for Systems Manager Session Manager access
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance profile attached to the EC2 server
resource "aws_iam_instance_profile" "ec2" {
  name = "realtime-devops-ec2-profile"
  role = aws_iam_role.ec2.name
}
