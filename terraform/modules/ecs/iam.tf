data "aws_caller_identity" "current" {}


# Define an IAM policy for CloudWatch logging with restricted permissions
resource "aws_iam_policy" "cloudwatch_logging_policy" {
  name        = "CloudWatchLoggingPolicy-${var.environment}"
  description = "Allows Render EC2 instances to write logs to app's ec2 CloudWatch log group"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = [
          # Allow for only specific log group ARNs
          "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:*" # allow write to any log in this account
        ]
      }
    ]
  })
}

# ECS Instance role allows the ec2 to log ecs agent stuff to ecs log group
# and also to poll ecs agent for metrics
resource "aws_iam_role" "ecs_instance_role" {
  name = "${var.project_name}-${var.environment}-ecsInstanceRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# this attaches the policy to the instance role
resource "aws_iam_role_policy_attachment" "ecs_instance_policy_attach" {
  role       = aws_iam_role.ecs_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

# this attaches the policy to the instance role
resource "aws_iam_role_policy_attachment" "ecs_instance_logging_policy_attach" {
  role       = aws_iam_role.ecs_instance_role.name
  policy_arn = aws_iam_policy.cloudwatch_logging_policy.arn
}


resource "aws_iam_instance_profile" "ecs_instance_profile" {
  name = "${var.project_name}-${var.environment}-ecsInstanceProfile"
  role = aws_iam_role.ecs_instance_role.name
}

# ECS Task Execution Role allows container in task to do stuff
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "ecs_task_execution_policy" {
  name        = "${var.project_name}-${var.environment}-ecsTaskExecutionPolicy"
  description = "ECS task execution policy with CloudWatch and specific ECR repository access"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      # Permissions for specific ECR repository
      {
        Effect = "Allow",
        Action = [
          "ecr:GetAuthorizationToken"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ],
        Resource = [
          var.backend_ecr_arn,
          var.frontend_ecr_arn
        ]
      },
      # Permissions for CloudWatch Logs
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy_attach" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.ecs_task_execution_policy.arn
}