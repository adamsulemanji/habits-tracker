#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HabitsTrackerStack } from '../lib/habits-tracker-stack';
import { HabitsTrackerPipeline } from '../lib/pipeline';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const habitsStack = new HabitsTrackerStack(app, 'HabitsTrackerStack', { env });

new HabitsTrackerPipeline(app, 'HabitsTrackerPipeline', {
  env,
  frontendConstruct: habitsStack.frontendConstruct,
});
