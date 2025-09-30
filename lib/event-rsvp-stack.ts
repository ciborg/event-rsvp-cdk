import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class EventRsvpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table for Guest data
    const guestTable = new dynamodb.Table(this, 'GuestTable', {
      tableName: 'event-guests',
      partitionKey: {
        name: 'guestId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev/demo purposes
    });

    // Global Secondary Index for invite code lookups
    guestTable.addGlobalSecondaryIndex({
      indexName: 'InviteCodeIndex',
      partitionKey: {
        name: 'inviteCode',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // API Key for simple authentication
    const apiKey = new apigateway.ApiKey(this, 'EventRSVPApiKey', {
      apiKeyName: 'event-rsvp-api-key',
      description: 'API key for Event RSVP application',
    });

    // Lambda Functions
    const guestAuthFunction = new lambda.Function(this, 'GuestAuthFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'guest-auth.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: guestTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const rsvpFunction = new lambda.Function(this, 'RSVPFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'rsvp.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: guestTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const getGuestFunction = new lambda.Function(this, 'GetGuestFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'get-guest.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: guestTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant DynamoDB permissions to Lambda functions
    guestTable.grantReadWriteData(guestAuthFunction);
    guestTable.grantReadWriteData(rsvpFunction);
    guestTable.grantReadData(getGuestFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'EventRSVPAPI', {
      restApiName: 'Event RSVP API',
      description: 'API for Event RSVP application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // Usage Plan for API Key
    const usagePlan = new apigateway.UsagePlan(this, 'EventRSVPUsagePlan', {
      name: 'Event RSVP Usage Plan',
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.MONTH,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // API Resources
    const authResource = api.root.addResource('auth');
    authResource.addMethod('POST', new apigateway.LambdaIntegration(guestAuthFunction), {
      apiKeyRequired: true,
    });

    const guestResource = api.root.addResource('guest');
    guestResource.addMethod('GET', new apigateway.LambdaIntegration(getGuestFunction), {
      apiKeyRequired: true,
    });

    const rsvpResource = api.root.addResource('rsvp');
    rsvpResource.addMethod('POST', new apigateway.LambdaIntegration(rsvpFunction), {
      apiKeyRequired: true,
    });

    // S3 Bucket for hosting the frontend
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `event-rsvp-website-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
          securityHeadersBehavior: {
            contentTypeOptions: { override: true },
            frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
            referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
            strictTransportSecurity: {
              accessControlMaxAge: cdk.Duration.seconds(31536000),
              includeSubdomains: true,
              override: true
            },
            xssProtection: { protection: true, modeBlock: true, override: true },
          },
        }),
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Deploy website to S3 (will be done manually for now)
    // new s3deploy.BucketDeployment(this, 'DeployWebsite', {
    //   sources: [s3deploy.Source.asset('../event-rsvp-app/dist')],
    //   destinationBucket: websiteBucket,
    //   distribution,
    //   distributionPaths: ['/*'],
    // });

    // Outputs
    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'API Gateway Key ID',
    });

    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 bucket for website hosting',
    });
  }
}