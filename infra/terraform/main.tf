terraform {
  required_version = ">= 1.7.0"
}

variable "environment" {
  type    = string
  default = "dev"
}

output "deployment_note" {
  value = "Terraform scaffold ready for VPC, managed Postgres, Redis, object storage and Kubernetes modules."
}
