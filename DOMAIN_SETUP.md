# Domain Setup Guide for alanamiroslava.mx

This guide covers the manual steps required to configure your domain with AWS for the Event RSVP application.

## Overview

The CDK stack is configured to use `alanamiroslava.mx` as the custom domain. This requires some manual configuration depending on where your domain is registered.

## Prerequisites

- Domain `alanamiroslava.mx` registered with a domain registrar
- AWS account with appropriate permissions
- Access to your domain registrar's DNS settings

## Setup Options

### Option A: Domain Already in Route 53 (Easiest)

If your domain is already registered with Route 53, you're all set! Just deploy the CDK stack:

```bash
cdk deploy
```

The stack will automatically:
- Create a hosted zone for alanamiroslava.mx
- Create an ACM certificate
- Configure DNS records
- Set up CloudFront with the custom domain

### Option B: Domain Registered Elsewhere (Most Common)

If your domain is registered with another provider (GoDaddy, Namecheap, Google Domains, etc.), follow these steps:

#### Step 1: Deploy the CDK Stack

```bash
cdk deploy
```

This will create the Route 53 hosted zone and other resources.

#### Step 2: Get AWS Nameservers

After deployment, get the nameservers from Route 53:

**Via AWS Console:**
1. Go to Route 53 console
2. Click on "Hosted zones"
3. Click on `alanamiroslava.mx`
4. Copy the 4 nameserver values (they look like `ns-123.awsdns-12.com`)

**Via AWS CLI:**
```bash
aws route53 get-hosted-zone --id $(aws route53 list-hosted-zones-by-name --dns-name alanamiroslava.mx --query 'HostedZones[0].Id' --output text) --query 'DelegationSet.NameServers'
```

**Via CDK Output:**
The hosted zone ID is available in the stack outputs. Use it to get nameservers.

#### Step 3: Update Domain Registrar

Go to your domain registrar and update the nameservers to the AWS nameservers you copied. The exact steps vary by registrar:

**GoDaddy:**
1. Log in to GoDaddy
2. Go to "My Products" → "Domains"
3. Click on alanamiroslava.mx
4. Click "Manage DNS"
5. Scroll to "Nameservers" section
6. Click "Change"
7. Select "Custom" and enter the 4 AWS nameservers
8. Save changes

**Namecheap:**
1. Log in to Namecheap
2. Go to "Domain List"
3. Click "Manage" next to alanamiroslava.mx
4. Find "Nameservers" section
5. Select "Custom DNS"
6. Enter the 4 AWS nameservers
7. Save changes

**Google Domains:**
1. Log in to Google Domains
2. Click on alanamiroslava.mx
3. Click "DNS" in the left menu
4. Scroll to "Name servers"
5. Select "Use custom name servers"
6. Enter the 4 AWS nameservers
7. Save

**Other Registrars:**
Look for "DNS Settings", "Nameservers", or "DNS Management" in your registrar's control panel.

#### Step 4: Wait for DNS Propagation

DNS changes can take 24-48 hours to propagate globally, though it's often much faster (1-2 hours).

**Check DNS propagation:**
```bash
# Check if nameservers are updated
dig NS alanamiroslava.mx

# Check if domain resolves to CloudFront
dig alanamiroslava.mx

# Or use online tools
# https://www.whatsmydns.net/#NS/alanamiroslava.mx
```

#### Step 5: Verify SSL Certificate

The ACM certificate should validate automatically via DNS once the nameservers are updated.

**Check certificate status:**
1. Go to AWS Certificate Manager console (in us-east-1 region)
2. Find the certificate for alanamiroslava.mx
3. Status should be "Issued" (if still "Pending validation", wait for DNS propagation)

**Via AWS CLI:**
```bash
aws acm list-certificates --region us-east-1
```

## Verification

Once DNS has propagated and the certificate is validated:

1. **Test the website:**
   ```bash
   curl -I https://alanamiroslava.mx
   ```
   Should return 200 OK (or 403 if no content deployed yet)

2. **Test the API:**
   ```bash
   curl -I https://api.alanamiroslava.mx/v1
   ```
   Should return a response from API Gateway

3. **Check SSL:**
   ```bash
   openssl s_client -connect alanamiroslava.mx:443 -servername alanamiroslava.mx
   ```
   Should show valid certificate

## Troubleshooting

### Certificate Stuck in "Pending Validation"

**Cause:** DNS records not propagated or nameservers not updated

**Solution:**
1. Verify nameservers are correctly set at registrar
2. Wait longer for DNS propagation
3. Check Route 53 has the CNAME validation records (should be automatic)

### Domain Not Resolving

**Cause:** DNS not propagated or incorrect nameserver configuration

**Solution:**
1. Use `dig NS alanamiroslava.mx` to check nameservers
2. Verify you entered all 4 nameservers correctly
3. Wait for propagation (up to 48 hours)

### "This site can't be reached" Error

**Cause:** DNS not propagated or CloudFront not fully deployed

**Solution:**
1. Check CloudFront distribution status in AWS console (should be "Deployed")
2. Verify DNS is resolving correctly
3. CloudFront deployment can take 15-20 minutes

### API Subdomain Not Working

**Cause:** API Gateway custom domain not configured or DNS not propagated

**Solution:**
1. Check API Gateway custom domain in AWS console
2. Verify Route 53 has A record for api.alanamiroslava.mx
3. Wait for DNS propagation

## Alternative: Transfer Domain to Route 53

Instead of delegating DNS, you can transfer your domain to Route 53:

1. Unlock domain at current registrar
2. Get authorization code from current registrar
3. In Route 53 console, go to "Registered domains"
4. Click "Transfer domain"
5. Follow the transfer wizard
6. Transfer typically takes 5-7 days

**Benefits:**
- Everything managed in AWS
- No need to update nameservers
- Automatic DNS configuration

**Considerations:**
- Transfer fee (varies by TLD)
- Takes several days to complete
- Domain must be unlocked and not recently transferred

## Cost Considerations

- **Route 53 Hosted Zone:** $0.50/month
- **Route 53 Queries:** $0.40 per million queries (first 1 billion)
- **ACM Certificate:** Free
- **Domain Registration (if transferred):** Varies by TLD (~$12-15/year for .mx)

## Summary Checklist

- [ ] Deploy CDK stack (`cdk deploy`)
- [ ] Get AWS nameservers from Route 53
- [ ] Update nameservers at domain registrar
- [ ] Wait for DNS propagation (24-48 hours)
- [ ] Verify ACM certificate is validated
- [ ] Test website access (https://alanamiroslava.mx)
- [ ] Test API access (https://api.alanamiroslava.mx/v1)
- [ ] Deploy frontend to S3 bucket

## Next Steps

After domain is configured:
1. Deploy your frontend application to the S3 bucket
2. Configure your frontend to use `https://api.alanamiroslava.mx/v1` as the API endpoint
3. Set up monitoring and alarms in CloudWatch
4. Configure API key for frontend application
