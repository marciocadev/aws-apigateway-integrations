import { join } from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { MyIntegrationProps } from "./my-integration-props";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Chain, StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { AwsIntegration, IntegrationOptions } from "aws-cdk-lib/aws-apigateway";
import sha256 from "crypto-js/sha256";

export class MyStepFunctionIntegration extends Construct {
  constructor(scope: Construct, id: string, props: MyIntegrationProps) {
    super(scope, id);

    const lambda = new NodejsFunction(this, "Lambda", {
      entry: join(__dirname, "../lambda-fns/delivery-by-step-function.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
      retryAttempts: 0,
      environment: {
        TABLE_NAME: props.table.tableName,
      },
      bundling: {
        minify: true,
      },
    });

    props.table.grantWriteData(lambda);

    const lambdaInvoke = new LambdaInvoke(this, 'ApiGatewayIntegration', {
      lambdaFunction: lambda,
    });
    const chain = Chain.start(lambdaInvoke);
    const statemachine = new StateMachine(this, 'ApiGatewayMachine', {
      definition: chain,
      stateMachineName: 'ApiGatewayStepFunctionIntegration',
    });

    const apiGatewayStepFunctionRole = new Role(this, 'GtwRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    apiGatewayStepFunctionRole.attachInlinePolicy(
      new Policy(this, 'SFPolicy', {
        statements: [
          new PolicyStatement({
            actions: ['states:StartExecution'],
            effect: Effect.ALLOW,
            resources: [statemachine.stateMachineArn],
          }),
        ],
      }),
    );

    const integrationOptions: IntegrationOptions = {
      credentialsRole: apiGatewayStepFunctionRole,
      integrationResponses: [
        {
          statusCode: '200',
          responseTemplates: {
            'application/json': `{"pk": "${sha256(JSON.stringify('$input.body'))}"}`,
          },
        },
      ],
      requestTemplates: {
        'application/json': `{
          "input": "$util.escapeJavaScript($input.body)",
          "stateMachineArn": "${statemachine.stateMachineArn}"
        }`,
      },
    };

    const integrationPost = new AwsIntegration({
      service: 'states',
      action: 'StartExecution',
      integrationHttpMethod: 'POST',
      options: integrationOptions,
    });

    props.resource.addMethod("POST", integrationPost, {
      methodResponses: [{ statusCode: "200"}],
      requestModels: { "application/json": props.model },
      requestValidator: props.validator,
    });
  }
}