# Event RSVP Infrastructure

AWS CDK infrastructure for the Event RSVP application, built with TypeScript and following AWS Well-Architected Framework principles.

## 🏗️ Architecture Overview

This CDK project creates a complete, production-ready infrastructure for a secure event RSVP application:

```
Internet → CloudFront (alanamiroslava.mx) → S3 (Static Website)
                     ↓
Users → API Gateway (api.alanamiroslava.mx) → Lambda Functions → DynamoDB
       ↓
   API Key Authentication
```

**Domain Configuration:**
- Website: `https://alanamiroslava.mx`
- API: `https://api.alanamiroslava.mx/v1`

## 📦 AWS Resources Created

### Authentication & Authorization
- **API Gateway API Key**: Simple API key-based authentication
- **Usage Plan**: Rate limiting and quota management

### API & Compute
- **API Gateway REST API**: Secure API endpoints with CORS support
- **Lambda Functions**:
  - Guest authentication handler
  - RSVP submission handler
  - Guest data retrieval handler

### Data Storage
- **DynamoDB Table**: Guest and RSVP data storage with encryption at rest
  - Partition Key: `guestId`
  - Global Secondary Index: `inviteCode`
  - Pay-per-request billing
  - Point-in-time recovery enabled

### Frontend Hosting
- **S3 Bucket**: Static website hosting with public access blocked
- **CloudFront Distribution**: Global CDN with custom domain (alanamiroslava.mx) and security headers
- **Route 53**: DNS management for custom domain
- **ACM Certificate**: SSL/TLS certificate for HTTPS
- **Origin Access Identity**: Secure S3 access from CloudFront

### Security Features
- **Response Headers Policy**: OWASP-compliant security headers
- **S3 Bucket Policy**: Restrictive access controls
- **IAM Roles**: Least privilege access for all services

## 🔐 Security Implementation

### OWASP Compliance
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **HSTS**: Enforces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME type confusion
- **X-XSS-Protection**: Browser XSS filtering enabled

### Data Protection
- **Encryption at Rest**: DynamoDB encryption enabled
- **Encryption in Transit**: All API calls use HTTPS
- **Input Validation**: Lambda functions sanitize all inputs
- **Authentication**: Multi-factor authentication required

### Access Control
- **API Authorization**: API key required for all API calls
- **Lambda Permissions**: Minimal IAM permissions
- **S3 Access**: Blocked public access, CloudFront-only access

## 🚀 Deployment

### Prerequisites
```bash
npm install -g aws-cdk
aws configure  # Ensure AWS credentials are set
```

### Domain Setup (Required Before First Deployment)

**Important:** Before deploying, you must configure your domain with AWS:

1. **Transfer or Configure Domain in Route 53:**
   - If domain is registered elsewhere, you have two options:
     - **Option A (Recommended):** Transfer domain to Route 53
     - **Option B:** Keep domain with current registrar and delegate DNS to Route 53

2. **For Option B (Delegate DNS to Route 53):**
   - The CDK will create a Route 53 hosted zone for `alanamiroslava.mx`
   - After first deployment, get the nameservers from Route 53 console
   - Update your domain registrar's nameserver settings to point to AWS nameservers
   - Wait for DNS propagation (can take 24-48 hours)

3. **SSL Certificate:**
   - CDK will automatically create an ACM certificate for `alanamiroslava.mx`
   - Certificate validation happens via DNS (automatic if using Route 53)
   - Wait for certificate validation to complete before accessing the site

### Deploy Infrastructure
```bash
npm install
npm test        # Run infrastructure tests
npm run build   # Compile TypeScript
cdk bootstrap   # Only needed once per account/region
cdk deploy      # Deploy infrastructure
```

**Note:** First deployment may take 15-20 minutes due to CloudFront distribution creation and SSL certificate validation.

### Environment Variables
The following environment variables are available to Lambda functions:
- `TABLE_NAME`: DynamoDB table name

## 🧪 Testing

### Infrastructure Tests
```bash
npm test
```

Tests verify:
- ✅ DynamoDB table configuration
- ✅ API Gateway setup with API key authentication
- ✅ API Gateway CORS configuration
- ✅ Lambda function creation
- ✅ S3 bucket security settings
- ✅ CloudFront distribution setup
- ✅ Security headers configuration
- ✅ Stack outputs generation

### Manual Testing
```bash
cdk synth       # Generate CloudFormation template
cdk diff        # Show changes before deployment
cdk destroy     # Clean up resources (development only)
```

## 📊 Monitoring & Observability

### Built-in Monitoring
- **CloudWatch Logs**: All Lambda functions log to CloudWatch
- **CloudWatch Metrics**: API Gateway and Lambda metrics
- **DynamoDB Metrics**: Read/write capacity and throttling
- **CloudFront Metrics**: Cache hit ratio and error rates

### Recommended Alarms
Consider setting up CloudWatch alarms for:
- Lambda function errors
- API Gateway 4xx/5xx errors
- DynamoDB throttling
- CloudFront error rates

## 🔧 Configuration

### Cost Optimization
- **DynamoDB**: Pay-per-request billing for unpredictable traffic
- **Lambda**: Pay-per-execution with appropriate timeout settings
- **CloudFront**: Optimized caching policies
- **S3**: Minimal storage costs for static assets

### Scaling
- **API Gateway**: Automatically scales to handle traffic
- **Lambda**: Concurrent execution limit can be adjusted
- **DynamoDB**: On-demand scaling included
- **CloudFront**: Global edge locations for low latency

## 📋 Stack Outputs

After deployment, the following outputs are available:

- **ApiKeyId**: API Gateway key ID for authentication
- **APIEndpoint**: `https://api.alanamiroslava.mx/v1`
- **WebsiteURL**: `https://alanamiroslava.mx`
- **WebsiteBucketName**: S3 bucket for deploying frontend
- **DomainName**: Custom domain name (alanamiroslava.mx)
- **HostedZoneId**: Route 53 hosted zone ID
- **CertificateArn**: ACM certificate ARN

## 🛠️ Customization

### Environment-Specific Deployments
```bash
cdk deploy --context environment=prod
cdk deploy --context environment=staging
```

### Using a Different Domain
To use a different domain instead of alanamiroslava.mx:
1. Update `domainName` in `bin/event-rsvp-cdk.ts`
2. Follow the domain setup steps in the Deployment section
3. Run `cdk deploy` to apply changes

### Additional Security
For enhanced security:
- Enable AWS WAF on API Gateway
- Add AWS Shield Advanced for DDoS protection
- Implement AWS Config for compliance monitoring

## 🚨 Important Notes

### Production Considerations
- **Backup Strategy**: DynamoDB point-in-time recovery is enabled
- **Disaster Recovery**: Consider multi-region deployment for critical applications
- **Secrets Management**: Use AWS Secrets Manager for sensitive configuration
- **Monitoring**: Set up comprehensive CloudWatch alarms

### Cost Management
- **DynamoDB**: Monitor read/write capacity units
- **Lambda**: Optimize function memory and timeout settings
- **CloudFront**: Review cache behaviors for cost optimization
- **S3**: Enable lifecycle policies for old objects

### Regional Deployment
This stack is designed for `us-east-1` region. 

**Important:** CloudFront requires ACM certificates to be in `us-east-1` region. If you need to deploy Lambda/API Gateway in other regions:
1. Keep the stack in `us-east-1` for CloudFront and ACM
2. Or create a separate certificate in `us-east-1` for CloudFront
3. Update region in `bin/event-rsvp-cdk.ts` carefully

## 🔄 Updates & Maintenance

### Regular Maintenance Tasks
- Review CloudWatch logs for errors
- Monitor DynamoDB metrics for performance
- Update Lambda runtime versions
- Review security group configurations

### Version Updates
- Keep CDK dependencies updated
- Test infrastructure changes in staging first
- Use `cdk diff` to review changes before deployment

## 🆘 Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**
   ```bash
   cdk bootstrap aws://ACCOUNT-NUMBER/REGION
   ```

2. **Insufficient Permissions**
   - Ensure AWS credentials have admin access for initial deployment
   - Review IAM policies for specific service permissions

3. **Resource Conflicts**
   - Check for existing resources with same names
   - Use unique stack names for multiple environments

4. **API Key Issues**
   - Ensure API key is properly configured in usage plan
   - Check API key permissions and rate limits
   - Verify API key is included in request headers

5. **Domain/DNS Issues**
   - Verify nameservers are correctly configured at your domain registrar
   - Check Route 53 hosted zone has correct records
   - Wait for DNS propagation (use `dig alanamiroslava.mx` to check)
   - Ensure ACM certificate is validated (check ACM console)

6. **SSL Certificate Issues**
   - Certificate must be in `us-east-1` region for CloudFront
   - DNS validation records must be present in Route 53
   - Wait for validation to complete (can take 30 minutes)

### Debug Commands
```bash
cdk ls              # List all stacks
cdk synth           # Generate CloudFormation template
cdk doctor          # Check CDK setup
aws logs tail       # View Lambda logs
```

## 📞 Support

For infrastructure issues:
1. Check CloudWatch logs for detailed error messages
2. Review CDK documentation for resource configuration
3. Use AWS Support for service-specific issues
4. Monitor AWS Service Health Dashboard for outages