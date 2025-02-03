resource "aws_ecs_cluster" "graphbuilder_ecs_cluster" {
  name = "${var.project_name}-${var.environment}-ecs-cluster"
}