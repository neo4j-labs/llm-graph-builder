variable "environment" {
  type        = string
  description = "the environment you are deploying to, used for naming resources"
}

variable "region" {
  type        = string
  description = "the AWS region you are deploying to"
}

variable "project_name" {
  type        = string
  description = "the name of the project"
}

variable "vpc_cidr_block" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidr_block" {
  type    = string
  default = "10.0.1.0/24"
}

variable "public_subnet_cidr_block_2" {
  type    = string
  default = "10.0.2.0/24"
}