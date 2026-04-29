import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class ApiGatewayConstruct extends Construct {
  public readonly api: apigateway.LambdaRestApi;

  constructor(scope: Construct, id: string, fn: lambda.Function) {
    super(scope, id);

    this.api = new apigateway.LambdaRestApi(this, 'HabitsAPI', {
      handler: fn,
      proxy: true,
      description: 'API Gateway for Habits Tracker',
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
    });
  }
}
