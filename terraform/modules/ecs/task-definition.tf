
locals {
  backend_task_name = "${var.project_name}-${var.environment}-backend"
}

# 1. Look up the latest image tag in ECR (we’ll use "latest")
data "aws_ecr_image" "latest" {
  repository_name = var.frontend_repository_name # your ECR repo name
  image_tag       = "latest"
}

resource "aws_ecs_task_definition" "graphbuilder_task" {
  family       = "${var.project_name}-${var.environment}"
  network_mode = "bridge" # Use "awsvpc" if running in Fargate
  # network_mode             = "awsvpc"                                 # Use "awsvpc" if running in Fargate
  requires_compatibilities = ["EC2"]                                  # Change to "FARGATE" if needed
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn # IAM Role for ECS tasks
  container_definitions = jsonencode([
    {
      name  = local.backend_task_name
      image = "${var.backend_ecr_url}:latest"

      # currently we are on t4g.medium which has 4GB memory, 2vCPU (each vCPU is 1024)
      memory            = 2048 # 2048MB
      cpu               = 1024 # = 1vCPU, half of our t4g.medium
      memoryReservation = 1024 # Soft limit prevent memory contention
      essential         = true
      portMappings = [
        # {
        #   containerPort = 80
        #   hostPort      = 80
        # }
        # our backend service listens on container port 8000
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]
      # here we can pass environment variables that will be made avialable
      # inside the container
      environment = [
        {
          name  = "TEST_ENV_VAR"
          value = "example-ft-test-value"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          # this awslogs-group path needs to match up with the task cloudwatch log group in cloudwatch.tf
          awslogs-group         = aws_cloudwatch_log_group.backend_task_log_group.name
          awslogs-region        = var.aws_region # Change to your AWS region
          awslogs-stream-prefix = "ecs"
        }
      }
    },
    {
      name              = "${var.project_name}-${var.environment}-frontend"
      # image             = "${var.frontend_ecr_url}:latest"
      image             = "${var.frontend_ecr_url}@${data.aws_ecr_image.latest.image_digest}"
      memory            = 512 # Reduced from 4096MB
      cpu               = 512  # Reduced from 1024 CPU units
      memoryReservation = 512  # Soft limit to prevent memory contention
      # essential         = true
      # dependsOn = [
      #   {
      #     containerName = local.backend_task_name
      #     condition     = "START"
      #   }
      # ]
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "VITE_BACKEND_API_URL"
          # value = "http://${aws_instance.ecs_instance.public_ip}:8000"
          value = "http://localhost:8000"
        },
        {
          name  = "VITE_ENV"
          value = "DEV"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend_task_log_group.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-${var.environment}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Adjust based on your needs
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
    cidr_blocks = ["0.0.0.0/0"] # Adjust based on your needs
  }

  # (Optional) Allow Neo4j HTTP API if needed
  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    description = "Allow HTTP API from ECS"
    cidr_blocks = ["0.0.0.0/0"] # Adjust based on your needs
  }

  # (Optional) Allow Neo4j HTTPS API if needed
  ingress {
    from_port   = 7473
    to_port     = 7473
    protocol    = "tcp"
    description = "Allow HTTPS API from ECS"
    cidr_blocks = ["0.0.0.0/0"] # Adjust based on your needss
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    description = "Allow SSH from anywhere"
    cidr_blocks = ["0.0.0.0/0"] # Adjust based on your needss
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
