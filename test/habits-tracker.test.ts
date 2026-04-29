import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HabitsTrackerStack } from '../lib/habits-tracker-stack';

test('DynamoDB Tables created', () => {
  const app = new cdk.App();
  const stack = new HabitsTrackerStack(app, 'TestStack');
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::DynamoDB::Table', 2);
});

test('Lambda function created', () => {
  const app = new cdk.App();
  const stack = new HabitsTrackerStack(app, 'TestStack');
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 1);
});
