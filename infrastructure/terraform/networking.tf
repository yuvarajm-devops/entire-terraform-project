# Creates an isolated virtual network for the project
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "realtime-devops-vpc"
    Environment = var.environment
  }
}

# Creates public subnet 1 in AZ 'a' for ALB and internet-facing connectivity
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 1)
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name        = "realtime-devops-public-subnet-1"
    Environment = var.environment
  }
}

# Creates public subnet 2 in AZ 'b' required for high-availability ALB multi-AZ deployment
resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 3)
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name        = "realtime-devops-public-subnet-2"
    Environment = var.environment
  }
}

# Creates private subnet 1 in AZ 'b' for application tasks
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 2)
  availability_zone = "${var.aws_region}b"

  tags = {
    Name        = "realtime-devops-private-subnet-1"
    Environment = var.environment
  }
}

# Creates private subnet 2 in AZ 'a' for multi-AZ ECS task distribution
resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 4)
  availability_zone = "${var.aws_region}a"

  tags = {
    Name        = "realtime-devops-private-subnet-2"
    Environment = var.environment
  }
}

# Creates an Internet Gateway for internet connectivity through public routing
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "realtime-devops-igw"
    Environment = var.environment
  }
}

# Creates a public route table that sends internet-bound traffic to the Internet Gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "realtime-devops-public-rt"
    Environment = var.environment
  }
}

# Connects the public subnets to the public route table
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}
