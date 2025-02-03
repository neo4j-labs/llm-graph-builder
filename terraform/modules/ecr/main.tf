resource "aws_ecr_repository" "graphbuilder_backend_docker_repo" {
  name                 = "${var.project_name}-docker-repo-${var.environment}/backend" # Change this to your desired repository name
  image_tag_mutability = "MUTABLE"

  tags = {
    "Environment" = var.environment
    "Project"     = var.project_name
    "Service"     = "backend"
  }
}

resource "aws_ecr_repository" "graphbuilder_frontend_docker_repo" {
  name                 = "${var.project_name}-docker-repo-${var.environment}/frontend" # Change this to your desired repository name
  image_tag_mutability = "MUTABLE"

  tags = {
    "Environment" = var.environment
    "Project"     = var.project_name
    "Service"     = "frontend"

  }
}