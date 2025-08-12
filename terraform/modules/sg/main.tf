# --- ECS Node SG ---

resource "aws_security_group" "graphbuilder_sg" {
  name_prefix = "${var.project_name}-ec2-sg-${var.env}"
  vpc_id      = var.vpc_id
  description = "${var.project_name}-ec2-sg"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = -1 # -1 means all ICMP types
    to_port     = -1 # -1 means all ICMP types
    protocol    = "icmp"
    cidr_blocks = ["0.0.0.0/0"] # Allow ICMP from anywhere (you can restrict this if needed)
  }

  # need this bc the application in docker listens on 8000 and we are binding to same host port
  ingress {
    from_port   = 8000 # -1 means all ICMP types
    to_port     = 8000 # -1 means all ICMP types
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Allow ICMP from anywhere (you can restrict this if needed)
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Adjust based on your needs
  }  

  # Allow Neo4j Bolt protocol for ECS
  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    description = "Allow Bolt protocol from ECS"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # (Optional) Allow Neo4j HTTP API if needed
  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    description = "Allow HTTP API from ECS"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # (Optional) Allow Neo4j HTTPS API if needed
  ingress {
    from_port   = 7473
    to_port     = 7473
    protocol    = "tcp"
    description = "Allow HTTPS API from ECS"
    cidr_blocks = ["0.0.0.0/0"]
  }


  # send internet traffic anywhwrere
  egress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1" # All traffic
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    name = "graphbuilder-sg-${var.env}"
  }
}



output "sg" {
  value = aws_security_group.graphbuilder_sg
}
