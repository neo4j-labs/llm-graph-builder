terraform {
  required_version = "1.10.5"

  backend "s3" {
    # eschewed this for supplying via --backend-config=backend.conf 
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.84.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

locals {
  project_name = "graphbuilder"
}

module "my_ecr_repo" {
  source       = "../../modules/ecr" # Path to the module
  project_name = local.project_name
  environment  = var.environment
}

module "vpc" {
  source         = "../../modules/vpc"
  project_name   = local.project_name
  vpc_cidr_block = "10.0.0.0/16"
  environment    = var.environment
  region         = var.aws_region
}


module "sg" {
  source       = "../../modules/sg"
  project_name = local.project_name
  vpc_id       = module.vpc.vpc_id
  env          = var.environment
}

module "ecs" {
  source                 = "../../modules/ecs"
  project_name           = local.project_name
  environment            = var.environment
  aws_region             = var.aws_region
  instance_type          = "t4g.large"
  vpc_security_group_ids = [module.sg.sg.id]
  vpc_id                 = module.vpc.vpc_id
  subnet_id              = module.vpc.public_subnet.id
  ami_id                 = "ami-0bdaeb9a41fea7b10"
  ec2_keypair_name       = "graphbuilder-dev-ec2-keypair"
  user_data_path         = "./ec2-user-data.ps1"
  backend_ecr_url        = module.my_ecr_repo.backend_ecr_repository_url
  backend_ecr_arn        = module.my_ecr_repo.backend_repository_arn
  frontend_ecr_url = module.my_ecr_repo.frontend_ecr_repository_url
  frontend_ecr_arn = module.my_ecr_repo.frontend_repository_arn
}