
# --------------------------------------------------
# 1. Find the latest Ubuntu 24.04 LTS AMI
# --------------------------------------------------

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# --------------------------------------------------
# 2. Create an AWS EC2 key pair
# --------------------------------------------------

resource "aws_key_pair" "deployer" {
  key_name   = "realtime-devops-key"
  public_key = file("${path.module}/keys/realtime-devops-key.pub")

  tags = {
    Name        = "realtime-devops-key"
    Environment = var.environment
  }
}

# --------------------------------------------------
# 3. Create EC2 instance for Jenkins and the app
# --------------------------------------------------

resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "c7i-flex.large"
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.app.id]
  associate_public_ip_address = true

  # Attach the AWS key pair for SSH access
  key_name = aws_key_pair.deployer.key_name

  # Install Docker, Git, Java and Docker Compose plugin
  user_data = <<-EOF
    #!/bin/bash
    set -eux

    apt-get update

    apt-get install -y \
      docker.io \
      docker-compose-v2 \
      git \
      curl \
      fontconfig \
      openjdk-21-jre

    systemctl enable --now docker
  EOF

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name        = "realtime-devops-server"
    Environment = var.environment
  }
}
