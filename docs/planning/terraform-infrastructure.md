# Terraform Infrastructure as Code

## Overview

This document outlines the Terraform infrastructure setup for managing the chess game application's infrastructure as code.

## Infrastructure Components Managed by Terraform

### Current Setup (Private VPS)

Since we're using a private VPS (Hostinger), Terraform will manage:

- **Route 53 DNS Records**: Domain DNS configuration
- **AWS Resources** (if applicable): S3 buckets for backups, IAM roles
- **Future Cloud Migration**: If moving to AWS/DigitalOcean/etc., Terraform can manage everything

### Future Cloud Provider Setup

If migrating to a cloud provider, Terraform can manage:

- Compute instances (EC2, DigitalOcean Droplets, etc.)
- Networking (VPC, subnets, security groups)
- Load balancers
- Database instances
- DNS records
- SSL certificates
- Backup storage

## Terraform Structure

### Recommended Directory Structure

```text
infrastructure/
├── terraform/
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   ├── outputs.tf
│   │   │   └── terraform.tfvars
│   │   └── prod/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       ├── outputs.tf
│   │       └── terraform.tfvars
│   ├── modules/
│   │   ├── route53/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── s3-backup/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── cloud-provider/  # Future: if migrating to cloud
│   │       └── ...
│   └── shared/
│       ├── providers.tf
│       └── backend.tf
└── README.md
```

## Route 53 DNS Management

### DNS Records Managed

```hcl
# Route 53 Zone
resource "aws_route53_zone" "main" {
  name = var.domain_name
}

# A Record - Main Domain
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [var.vps_ip_address]  # VPS IP from Hostinger
}

# CNAME Record - API Subdomain (optional)
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]  # Points to main domain
}
```

### Benefits

- Version-controlled DNS configuration
- Easy to update when VPS IP changes
- Consistent across environments
- Rollback capability

## AWS Resources (Optional)

### S3 Bucket for Backups

```hcl
# S3 bucket for database backups
resource "aws_s3_bucket" "backups" {
  bucket = "${var.project_name}-backups-${var.environment}"

  lifecycle {
    prevent_destroy = true
  }
}

# Versioning for backup retention
resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle policy for old backups
resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "delete_old_backups"
    status = "Enabled"

    expiration {
      days = 90  # Keep backups for 90 days
    }
  }
}
```

## Provider Configuration

### AWS Provider (for Route 53)

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration (S3 for state storage)
  backend "s3" {
    bucket         = "chess-game-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"  # For state locking
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

## Variables

### Common Variables

```hcl
# variables.tf
variable "domain_name" {
  description = "Main domain name"
  type        = string
}

variable "vps_ip_address" {
  description = "VPS IP address (from Hostinger)"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "chess-game"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
```

### Environment-Specific Variables

```hcl
# environments/prod/terraform.tfvars
domain_name     = "yourdomain.com"
vps_ip_address  = "123.456.789.0"  # Your VPS IP
environment     = "prod"
project_name    = "chess-game"
aws_region      = "us-east-1"
```

## Outputs

### Useful Outputs

```hcl
# outputs.tf
output "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "name_servers" {
  description = "Route 53 name servers"
  value       = aws_route53_zone.main.name_servers
}

output "backup_bucket_name" {
  description = "S3 backup bucket name"
  value       = aws_s3_bucket.backups.id
}
```

## Workflow

### Initial Setup

1. **Configure AWS Credentials**

   ```bash
   aws configure
   # Or use environment variables:
   export AWS_ACCESS_KEY_ID=...
   export AWS_SECRET_ACCESS_KEY=...
   ```

2. **Initialize Terraform**

   ```bash
   cd infrastructure/terraform/environments/prod
   terraform init
   ```

3. **Plan Changes**

   ```bash
   terraform plan -var-file="terraform.tfvars"
   ```

4. **Apply Infrastructure**

   ```bash
   terraform apply -var-file="terraform.tfvars"
   ```

### Updating DNS

When VPS IP changes:

1. Update `vps_ip_address` in `terraform.tfvars`
2. Run `terraform plan` to preview changes
3. Run `terraform apply` to update Route 53 records

### State Management

- **Remote State**: Stored in S3 (configured in `backend.tf`)
- **State Locking**: DynamoDB table prevents concurrent modifications
- **State Backups**: S3 versioning provides backup of state files

## Integration with Deployment

### CI/CD Integration

Terraform can be integrated into deployment pipeline:

```yaml
# Example GitHub Actions workflow
name: Terraform Apply
on:
  push:
    branches: [main]
    paths:
      - "infrastructure/**"

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hashicorp/setup-terraform@v2
      - name: Terraform Init
        run: terraform init
      - name: Terraform Plan
        run: terraform plan
      - name: Terraform Apply
        run: terraform apply -auto-approve
```

### Dokploy Integration

- Terraform manages DNS (Route 53)
- Dokploy manages application deployment (Docker containers)
- Both work together: Terraform sets up infrastructure, Dokploy deploys apps

## Future: Cloud Provider Migration

If migrating to a cloud provider (AWS, DigitalOcean, etc.), Terraform modules can manage:

### Example: AWS EC2 Setup

```hcl
# modules/cloud-provider/ec2/main.tf
resource "aws_instance" "vps" {
  ami           = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_pair_name

  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name = "${var.project_name}-${var.environment}"
  }
}

resource "aws_security_group" "web" {
  name = "${var.project_name}-web-sg"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Best Practices

### State Management

- Always use remote state (S3)
- Enable state locking (DynamoDB)
- Never commit `.tfstate` files
- Use `.tfstate.backup` for local development only

### Security

- Store secrets in Doppler (application secrets) - separate from infrastructure
- Terraform variables stored in `.tfvars` files (not committed) or Terraform Cloud
- Use IAM roles with least privilege
- Enable S3 bucket encryption
- Use separate AWS accounts for dev/prod
- Doppler manages application secrets (DB passwords, API keys, etc.)

### Version Control

- Commit all `.tf` files
- Use `.tfvars` files for environment-specific values
- Document variable changes in commit messages
- Tag Terraform versions

### Testing

- Use `terraform plan` before every apply
- Test in dev environment first
- Use `terraform validate` to check syntax
- Consider using `terraform fmt` for consistent formatting

## Troubleshooting

### Common Issues

**DNS not updating**

- Check Route 53 name servers are configured at domain registrar
- Verify VPS IP is correct
- Check TTL values (may take time to propagate)

**State lock errors**

- Check if another Terraform process is running
- Manually release lock in DynamoDB if needed (careful!)

**Provider authentication**

- Verify AWS credentials are configured
- Check IAM permissions for Route 53, S3, DynamoDB

## Resources

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [Route 53 Terraform Examples](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record)
