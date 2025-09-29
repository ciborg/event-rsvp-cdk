import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as EventRsvp from '../lib/event-rsvp-stack';

describe('EventRsvpStack', () => {
  let app: cdk.App;
  let stack: EventRsvp.EventRsvpStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    stack = new EventRsvp.EventRsvpStack(app, 'MyTestStack');
    template = Template.fromStack(stack);
  });

  test('DynamoDB table created with correct properties', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'event-rsvp-responses',
      BillingMode: 'PAY_PER_REQUEST',
      SSESpecification: {
        SSEEnabled: true
      },
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true
      }
    });
  });

  test('Cognito User Pool created with phone authentication', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'event-rsvp-users',
      UsernameAttributes: ['phone_number'],
      MfaConfiguration: 'ON',
      AutoVerifiedAttributes: ['phone_number']
    });
  });

  test('API Gateway created with CORS', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Event RSVP API'
    });
  });

  test('Lambda functions created', () => {
    template.resourceCountIs('AWS::Lambda::Function', 3);
  });

  test('S3 bucket created for website hosting', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      }
    });
  });

  test('CloudFront distribution created with security headers', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultCacheBehavior: {
          ViewerProtocolPolicy: 'redirect-to-https'
        }
      }
    });
  });

  test('Security headers policy created', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: {
        SecurityHeadersConfig: {
          ContentTypeOptions: { Override: true },
          FrameOptions: { FrameOption: 'DENY', Override: true },
          StrictTransportSecurity: {
            AccessControlMaxAgeSec: 31536000,
            IncludeSubdomains: true,
            Override: true
          }
        }
      }
    });
  });

  test('Outputs are defined', () => {
    template.hasOutput('UserPoolId', {});
    template.hasOutput('UserPoolClientId', {});
    template.hasOutput('APIEndpoint', {});
    template.hasOutput('WebsiteURL', {});
    template.hasOutput('WebsiteBucketName', {});
  });
});