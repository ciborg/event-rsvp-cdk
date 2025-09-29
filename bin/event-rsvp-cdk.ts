#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EventRsvpStack } from '../lib/event-rsvp-stack';

const app = new cdk.App();
new EventRsvpStack(app, 'EventRsvpStack', {
  env: {
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});