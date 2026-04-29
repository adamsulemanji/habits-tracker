import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import { FrontendConstruct } from './cloudfront';

export interface HabitsTrackerPipelineProps extends cdk.StackProps {
  frontendConstruct: FrontendConstruct;
}

export class HabitsTrackerPipeline extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HabitsTrackerPipelineProps) {
    super(scope, id, props);

    // ********** ARTIFACTS **********
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const synthOutput = new codepipeline.Artifact('SynthOutput');
    const frontendBuildOutput = new codepipeline.Artifact('FrontendBuildOutput');

    // ********** GITHUB SOURCE **********
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: 'adamsulemanji',
      repo: 'habits-tracker',
      oauthToken: cdk.SecretValue.secretsManager('github_token2'),
      output: sourceOutput,
      branch: 'main',
      trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
    });

    // ********** CDK SYNTH + ASSET PUBLISH **********
    const synthProject = new codebuild.PipelineProject(this, 'SynthProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER, codebuild.LocalCacheMode.CUSTOM),
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: '0.2',
        phases: {
          install: {
            runtimeVersions: { nodejs: '20' },
            commands: [
              'npm install -g aws-cdk',
              'npm install --legacy-peer-deps',
            ],
          },
          pre_build: {
            commands: ['node --version', 'npm --version', 'cdk --version'],
          },
          build: {
            commands: [
              'cdk synth -o dist',
              'npx cdk-assets publish --path dist/HabitsTrackerStack.assets.json',
            ],
          },
        },
        artifacts: {
          'base-directory': 'dist',
          files: ['**/*'],
        },
        cache: {
          paths: ['node_modules/**/*'],
        },
      }),
    });

    // Allow synth to assume CDK roles (file + image publishing)
    synthProject.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: ['arn:aws:iam::*:role/cdk-*'],
    }));
    synthProject.addToRolePolicy(new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: ['arn:aws:iam::*:role/cdk-*'],
    }));
    synthProject.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        's3:GetObject', 's3:PutObject', 's3:ListBucket',
        's3:GetBucketLocation', 's3:AbortMultipartUpload',
      ],
      resources: ['arn:aws:s3:::cdk-*'],
    }));
    synthProject.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ecr:*'],
      resources: ['*'],
    }));
    synthProject.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cloudformation:DescribeStacks',
        'cloudformation:CreateChangeSet',
        'cloudformation:ExecuteChangeSet',
        'cloudformation:DeleteChangeSet',
        'cloudformation:DescribeChangeSet',
        'cloudformation:GetTemplate',
      ],
      resources: [
        'arn:aws:cloudformation:*:*:stack/CDKToolkit/*',
        'arn:aws:cloudformation:*:*:stack/HabitsTrackerStack/*',
        'arn:aws:cloudformation:*:*:stack/HabitsTrackerPipeline/*',
      ],
    }));

    const synthAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CDK_Synth',
      project: synthProject,
      input: sourceOutput,
      outputs: [synthOutput],
    });

    // ********** FRONTEND BUILD **********
    const frontendBuildProject = new codebuild.PipelineProject(this, 'FrontendBuildProject', {
      environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.CUSTOM),
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: '0.2',
        phases: {
          install: {
            runtimeVersions: { nodejs: '20' },
            commands: [
              'cd frontend',
              'npm install --legacy-peer-deps',
            ],
          },
          build: {
            commands: [
              'cd frontend',
              'export NEXT_PUBLIC_API_URL=https://api.habits.adamsulemanji.com',
              'npm run build',
            ],
          },
        },
        artifacts: {
          'base-directory': 'frontend/build',
          files: ['**/*'],
        },
        cache: {
          paths: ['frontend/node_modules/**/*'],
        },
      }),
    });

    const buildFrontendAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build_Frontend',
      project: frontendBuildProject,
      input: sourceOutput,
      outputs: [frontendBuildOutput],
    });

    // ********** CFN DEPLOY ROLE **********
    const cfnDeployRole = new iam.Role(this, 'CFNDeployRole', {
      assumedBy: new iam.ServicePrincipal('cloudformation.amazonaws.com'),
      inlinePolicies: {
        HabitsTrackerDeployPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: 'StaticHosting',
              actions: ['s3:*', 'cloudfront:*', 'acm:*', 'route53:*'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              sid: 'LambdaDynamoDB',
              actions: ['lambda:*', 'dynamodb:*', 'apigateway:*', 'xray:*'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              sid: 'Pipeline',
              actions: ['codebuild:*', 'codepipeline:*'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              sid: 'ECR',
              actions: ['ecr:*'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              sid: 'Logs',
              actions: ['logs:*'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              sid: 'ServiceRoles',
              actions: [
                'iam:CreateRole', 'iam:DeleteRole',
                'iam:AttachRolePolicy', 'iam:DetachRolePolicy',
                'iam:PutRolePolicy', 'iam:DeleteRolePolicy',
                'iam:GetRole', 'iam:GetRolePolicy',
                'iam:PassRole', 'iam:TagRole', 'iam:UntagRole',
                'iam:CreatePolicy', 'iam:DeletePolicy',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              sid: 'CDKBootstrapSSM',
              actions: ['ssm:GetParameter', 'ssm:GetParameters'],
              resources: ['arn:aws:ssm:*:*:parameter/cdk-bootstrap/*'],
            }),
          ],
        }),
      },
    });

    // ********** DEPLOY INFRA **********
    const deployInfraAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
      actionName: 'CFN_Deploy',
      stackName: 'HabitsTrackerStack',
      templatePath: synthOutput.atPath('HabitsTrackerStack.template.json'),
      adminPermissions: false,
      deploymentRole: cfnDeployRole,
      cfnCapabilities: [cdk.CfnCapabilities.NAMED_IAM],
    });

    // ********** DEPLOY FRONTEND **********
    const deployFrontendAction = new codepipeline_actions.S3DeployAction({
      actionName: 'Deploy_Frontend_To_S3',
      bucket: props.frontendConstruct.siteBucket,
      input: frontendBuildOutput,
    });

    const invalidateCacheProject = new codebuild.PipelineProject(this, 'InvalidateCacheProject', {
      environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: '0.2',
        phases: {
          build: {
            commands: [
              `aws cloudfront create-invalidation --distribution-id ${props.frontendConstruct.distribution.distributionId} --paths "/*"`,
            ],
          },
        },
      }),
    });

    props.frontendConstruct.distribution.grantCreateInvalidation(invalidateCacheProject);

    const invalidateCacheAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Invalidate_CloudFront_Cache',
      input: sourceOutput,
      project: invalidateCacheProject,
      runOrder: 2,
    });

    // ********** PIPELINE **********
    new codepipeline.Pipeline(this, 'HabitsTrackerPipeline', {
      pipelineName: 'HabitsTrackerPipeline',
      stages: [
        { stageName: 'Source', actions: [sourceAction] },
        { stageName: 'SynthAndBuild', actions: [synthAction, buildFrontendAction] },
        { stageName: 'DeployInfra', actions: [deployInfraAction] },
        { stageName: 'DeployFrontend', actions: [deployFrontendAction, invalidateCacheAction] },
      ],
    });
  }
}
