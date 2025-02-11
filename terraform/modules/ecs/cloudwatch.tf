resource "aws_cloudwatch_log_group" "ec2_log_group" {
  name              = "/aws/ec2/${var.project_name}/${var.environment}" # Replace with your desired log group name
  retention_in_days = 14                                                # Replace with your desired retention period in days
}

resource "aws_cloudwatch_log_stream" "ec2_log_stream" {
  name           = "${var.project_name}-${var.environment}-ec2-log-stream"
  log_group_name = aws_cloudwatch_log_group.ec2_log_group.name
}

resource "aws_cloudwatch_log_group" "backend_task_log_group" {
  name              = "/ecs/${var.project_name}/${var.environment}/backend" # Replace with your desired log group name
  retention_in_days = 14                                            # Replace with your desired retention period in days
}

resource "aws_cloudwatch_log_group" "frontend_task_log_group" {
  name              = "/ecs/${var.project_name}/${var.environment}/frontend" # Replace with your desired log group name
  retention_in_days = 14                                            # Replace with your desired retention period in days
}

output "ec2_log_group" {
  value = aws_cloudwatch_log_group.ec2_log_group.name
}

output "ec2_log_stream" {
  value = aws_cloudwatch_log_stream.ec2_log_stream.name
}
