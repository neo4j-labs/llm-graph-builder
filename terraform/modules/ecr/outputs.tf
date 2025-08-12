output "backend_ecr_repository_url" {
  value       = aws_ecr_repository.graphbuilder_backend_docker_repo.repository_url
  description = "The URI of the backend ECR repository"
}

output "backend_repository_arn" {
  value       = aws_ecr_repository.graphbuilder_backend_docker_repo.arn
  description = "The ARN of the backend ECR repository"
}

output "frontend_ecr_repository_url" {
  value       = aws_ecr_repository.graphbuilder_frontend_docker_repo.repository_url
  description = "The URI of the frontend ECR repository"
}

output "frontend_repository_arn" {
  value       = aws_ecr_repository.graphbuilder_frontend_docker_repo.arn
  description = "The ARN of the frontend ECR repository"
}

output "backend_repository_name" {
  value       = aws_ecr_repository.graphbuilder_backend_docker_repo.name
  description = "The name of the backend ECR repository"
}

output "frontend_repository_name" {
  value       = aws_ecr_repository.graphbuilder_frontend_docker_repo.name
  description = "The name of the frontend ECR repository"
}