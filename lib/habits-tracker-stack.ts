import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamoDBConstruct } from './ddb';
import { LambdaConstruct } from './lambda';
import { ApiGatewayConstruct } from './apigateway';
import { FrontendConstruct } from './cloudfront';

export class HabitsTrackerStack extends cdk.Stack {
  public readonly frontendConstruct: FrontendConstruct;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ********** DynamoDB **********
    const ddb = new DynamoDBConstruct(this, 'DynamoDBConstruct');

    // ********** Lambda **********
    const lambdaConstruct = new LambdaConstruct(this, 'LambdaConstruct', [
      ddb.habitsTable,
      ddb.logsTable,
    ]);

    // ********** API Gateway **********
    const apiConstruct = new ApiGatewayConstruct(
      this,
      'ApiGatewayConstruct',
      lambdaConstruct.habitsFunction
    );

    // ********** Frontend **********
    this.frontendConstruct = new FrontendConstruct(
      this,
      'FrontendConstruct',
      apiConstruct.api
    );

    // ********** Permissions **********
    ddb.habitsTable.grantReadWriteData(lambdaConstruct.habitsFunction);
    ddb.logsTable.grantReadWriteData(lambdaConstruct.habitsFunction);
  }
}
