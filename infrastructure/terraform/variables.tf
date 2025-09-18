variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "pro-variety-472211-b9"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
