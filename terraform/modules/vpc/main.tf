resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr_block

  tags = {
    Name        = "${var.project_name}-${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr_block
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true # need this for ec2 to have outgoing internet access

  tags = {
    Name        = "${var.project_name}-${var.environment} VPC Public Subnet"
    Environment = var.environment
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr_block_2
  availability_zone       = "${var.region}b"
  map_public_ip_on_launch = true # need this for ec2 to have outgoing internet access

  tags = {
    Name        = "${var.project_name}-${var.environment} VPC Public Subnet 2"
    Environment = var.environment
  }
}

# --- Internet Gateway ---

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name        = "${var.project_name}-${var.environment}-igw"
    Environment = var.environment
  }
}

# this was copied from nexrender server may not be needed copied out for now $5/month
# resource "aws_eip" "main" {
#   depends_on = [aws_internet_gateway.main]
#   tags       = { 
#     Name = "${var.project_name}-${var.environment}-eip" 
#     Environment = var.environment
#   }
# }

# --- Public Route Table ---

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project_name}-${var.environment}-rt-public" }

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet" {
  value = aws_subnet.public
}

output "public_subnet_2" {
  value = aws_subnet.public_2
}