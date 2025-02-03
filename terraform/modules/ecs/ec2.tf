
resource "aws_instance" "ecs_instance" {

  # right now this ami is arm64
  ami                         = var.ami_id        # Replace with a valid ECS-optimized AMI
  instance_type               = var.instance_type # must choose arm64 capable hardware
  subnet_id                   = var.subnet_id     # Replace with your subnet ID
  vpc_security_group_ids      = var.vpc_security_group_ids
  key_name                    = var.ec2_keypair_name # Replace with your EC2 key pair name
  iam_instance_profile        = aws_iam_instance_profile.ecs_instance_profile.name
  associate_public_ip_address = true

  # Add root volume configuration
  root_block_device {
    volume_size           = 30
    volume_type           = "gp3" # General Purpose SSD
    delete_on_termination = true
    encrypted             = true # recommended for security
  }

  user_data = <<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.graphbuilder_ecs_cluster.name} >> /etc/ecs/ecs.config
    yum update -y
  EOF

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}