resource "aws_ecs_task_definition" "graphbuilder_task" {
  family                   = "${var.project_name}-${var.environment}"
  network_mode             = "bridge"                                 # Use "awsvpc" if running in Fargate
  # network_mode             = "awsvpc"                                 # Use "awsvpc" if running in Fargate
  requires_compatibilities = ["EC2"]                                  # Change to "FARGATE" if needed
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn # IAM Role for ECS tasks
  container_definitions = jsonencode([
    {
      name  = "${var.project_name}-${var.environment}-backend"
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
          name  = "IAN_TEST_ENV_VAR"
          value = "example-ian-test-value"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          # this awslogs-group path needs to match up with the task cloudwatch log group in cloudwatch.tf
          awslogs-group         = aws_cloudwatch_log_group.task_log_group.name
          awslogs-region        = var.aws_region # Change to your AWS region
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

  # Allow Neo4j Bolt protocol for ECS
  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    description = "Allow Bolt protocol from ECS"
  }

  # (Optional) Allow Neo4j HTTP API if needed
  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    description = "Allow HTTP API from ECS"
  }

  # (Optional) Allow Neo4j HTTPS API if needed
  ingress {
    from_port   = 7473
    to_port     = 7473
    protocol    = "tcp"
    description = "Allow HTTPS API from ECS"
  }

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1" # -1 means all protocols
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}