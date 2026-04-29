import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DynamoDBConstruct extends Construct {
  public readonly habitsTable: dynamodb.Table;
  public readonly logsTable: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.habitsTable = new dynamodb.Table(this, 'HabitsTable', {
      partitionKey: { name: 'habitID', type: dynamodb.AttributeType.STRING },
      tableName: 'HabitsTable',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    this.logsTable = new dynamodb.Table(this, 'HabitLogsTable', {
      partitionKey: { name: 'logID', type: dynamodb.AttributeType.STRING },
      tableName: 'HabitLogsTable',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // GSI to query logs by habitID + date
    this.logsTable.addGlobalSecondaryIndex({
      indexName: 'habitID-date-index',
      partitionKey: { name: 'habitID', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
