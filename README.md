# Event RSVP Infrastructure

AWS CDK infrastructure for the Event RSVP application, built with TypeScript and following AWS Well-Architected Framework principles.

## 🏗️ Architecture Overview

This CDK project creates a complete, production-ready infrastructure for a secure event RSVP application:

```
Internet → CloudFront → S3 (Static Website)
                     ↓
Users → API Gateway → Lambda Functions → DynamoDB
       ↓
   API Key Authentication
```

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
- **CloudFront Distribution**: Global CDN with custom security headers
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

### Deploy Infrastructure
```bash
npm install
npm test        # Run infrastructure tests
npm run build   # Compile TypeScript
cdk bootstrap   # Only needed once per account/region
cdk deploy      # Deploy infrastructure
```

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
- **APIEndpoint**: Base URL for API calls
- **WebsiteURL**: CloudFront distribution URL
- **WebsiteBucketName**: S3 bucket for deploying frontend

## 🛠️ Customization

### Environment-Specific Deployments
```bash
cdk deploy --context environment=prod
cdk deploy --context environment=staging
```

### Custom Domain Names
To add custom domain names:
1. Add ACM certificate for your domain
2. Configure Route 53 hosted zone
3. Update CloudFront distribution with custom domain

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
This stack is designed for `us-east-1` region. To deploy in other regions:
1. Update region in `bin/event-rsvp-cdk.ts`
2. Update asset bucket names if needed

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