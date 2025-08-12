# output "alb_dns_name" {
#   description = "DNS name of the Application Load Balancer"
#   value       = aws_lb.main.dns_name
# }

# output "alb_arn" {
#   description = "ARN of the Application Load Balancer"
#   value       = aws_lb.main.arn
# }

# output "target_group_arn" {
#   description = "ARN of the target group"
#   value       = aws_lb_target_group.main.arn
# }

# output "alb_zone_id" {
#   description = "Zone ID of the Application Load Balancer"
#   value       = aws_lb.main.zone_id
# }

# output "https_listener_arn" {
#   description = "ARN of the HTTPS listener (if created)"
#   value       = length(aws_lb_listener.https) > 0 ? aws_lb_listener.https[0].arn : null
# }

# output "certificate_arn" {
#   description = "ARN of the certificate being used"
#   value       = var.certificate_arn != null ? var.certificate_arn : (var.acm_certificate_domain != null ? data.aws_acm_certificate.main[0].arn : null)
# }

output "certificate_arn" {
  value = data.aws_acm_certificate.main[0].arn
}