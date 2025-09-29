import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class EventRsvpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table for RSVP data
    const rsvpTable = new dynamodb.Table(this, 'RSVPTable', {
      tableName: 'event-rsvp-responses',
      partitionKey: {
        name: 'phoneNumber',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev/demo purposes
    });

    // Cognito User Pool for phone number authentication
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'event-rsvp-users',
      signInAliases: {
        phone: true,
      },
      selfSignUpEnabled: true,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        sms: true,
        otp: false,
      },
      smsRole: new iam.Role(this, 'SMSRole', {
        assumedBy: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSNSRole')
        ]
      }),
      autoVerify: {
        phone: true,
      },
      accountRecovery: cognito.AccountRecovery.PHONE_ONLY_WITHOUT_MFA,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: 'event-rsvp-client',
      generateSecret: false,
      authFlows: {
        userSrp: true,
        adminUserPassword: false,
        custom: false,
        userPassword: false,
      },
    });

    // Lambda Functions
    const rsvpFunction = new lambda.Function(this, 'RSVPFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'rsvp.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: rsvpTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const getFunction = new lambda.Function(this, 'GetRSVPFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'get-rsvp.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: rsvpTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant DynamoDB permissions to Lambda functions
    rsvpTable.grantReadWriteData(rsvpFunction);
    rsvpTable.grantReadData(getFunction);

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

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // API Resources
    const rsvpResource = api.root.addResource('rsvp');
    rsvpResource.addMethod('POST', new apigateway.LambdaIntegration(rsvpFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    rsvpResource.addMethod('GET', new apigateway.LambdaIntegration(getFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
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
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
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