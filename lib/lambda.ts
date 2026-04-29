import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class LambdaConstruct extends Construct {
  public readonly habitsFunction: lambda.Function;

  constructor(scope: Construct, id: string, tables: dynamodb.Table[]) {
    super(scope, id);

    const [habitsTable, logsTable] = tables;

    this.habitsFunction = new lambda.DockerImageFunction(this, 'HabitsFunction', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../api'),
        {
          buildArgs: {
            '--platform': 'linux/amd64',
          },
        }
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        HABITS_TABLE_NAME: habitsTable.tableName,
        LOGS_TABLE_NAME: logsTable.tableName,
      },
      architecture: lambda.Architecture.X86_64,
      tracing: lambda.Tracing.ACTIVE,
    });
  }
}
