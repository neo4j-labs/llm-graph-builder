variable "environment" {
  type        = string
  description = "environment name to deploy to (dev, prod, developer_name etc)"
}

variable "aws_region" {
  type        = string
  description = "aws region to deploy to"
}