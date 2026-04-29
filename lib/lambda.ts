import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { execSync } from 'child_process';

export class LambdaConstruct extends Construct {
  public readonly habitsFunction: lambda.Function;

  constructor(scope: Construct, id: string, tables: dynamodb.Table[]) {
    super(scope, id);

    const [habitsTable, logsTable] = tables;
    const apiDir = path.join(__dirname, '../api');

    this.habitsFunction = new lambda.Function(this, 'HabitsFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'main.handler',
      code: lambda.Code.fromAsset(apiDir, {
        bundling: {
          // Docker image used if local bundling fails
          image: lambda.Runtime.PYTHON_3_9.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output',
          ],
          // Local bundler runs pip on the host — avoids Docker requirement
          local: {
            tryBundle(outputDir: string): boolean {
              try {
                execSync(
                  `pip3 install -r ${apiDir}/requirements.txt -t ${outputDir} --quiet`,
                  { stdio: 'inherit' }
                );
                execSync(`cp -r ${apiDir}/. ${outputDir}/`, { stdio: 'inherit' });
                return true;
              } catch {
                return false;
              }
            },
          },
        },
      }),
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
