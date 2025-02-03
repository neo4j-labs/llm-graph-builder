variable "aws_region" {
  type        = string
  description = "aws region for the deployment"
}

variable "environment" {
  type        = string
  description = "environment for the ecr docker image repo"
}

variable "project_name" {
  type        = string
  description = "project name for the repo"
}

variable "instance_type" {
  type    = string
  default = "t2.small"
}

variable "subnet_id" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "vpc_security_group_ids" {
  type = list(string)
}

variable "ami_id" {
  type        = string
  description = "ami for the ec2 instance"
}

variable "ec2_keypair_name" {
  type = string
}

variable "user_data_path" {
  type        = string
  description = "filepath to user_data file to run on aws_instance startup"
}

variable "backend_ecr_url" {
  type        = string
  description = "the ecr url of the backend service"
}

variable "backend_ecr_arn" {
  type        = string
  description = "the ecr arn of the backend service"
}

# variable "frontend_ecr_url" {
#   type = string
#   description = "the ecr url of the frontend service"
# }