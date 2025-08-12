variable "environment" {
  type        = string
  description = "environment for the ecr docker image repo"
}

variable "project_name" {
  type        = string
  description = "project name for the repo"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the ALB will be created"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs where the ALB will be deployed"
}

variable "ec2_instance_id" {
  type        = string
  description = "EC2 instance ID to register with the target group"
}

variable "certificate_arn" {
  type        = string
  description = "ARN of the SSL certificate for HTTPS listener"
  default     = null
}

variable "acm_certificate_domain" {
  type        = string
  description = "Domain name for the ACM certificate (e.g., example.com). This isused to find certificate ARN"
  default     = null
}

variable "health_check_path" {
  type        = string
  description = "Health check path for the target group"
  default     = "/"
}

variable "health_check_port" {
  type        = number
  description = "Health check port for the target group"
  default     = 80
}

variable "target_group_port" {
  type        = number
  description = "Port for the target group"
  default     = 443
}
