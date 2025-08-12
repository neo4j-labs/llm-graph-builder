resource "aws_ecs_service" "frontend_service" {
  name            = "${var.project_name}-ecs-service-${var.environment}"
  cluster         = aws_ecs_cluster.graphbuilder_ecs_cluster.id
  task_definition = aws_ecs_task_definition.graphbuilder_task.arn
  desired_count   = 1
  launch_type     = "EC2"

  # Health check grace period for automatic restart
  health_check_grace_period_seconds = 180

  # Force new deployment when task definition changes
  force_new_deployment = true

  depends_on = [aws_ecs_task_definition.graphbuilder_task]

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Service     = "graphbuilder"
  }
}