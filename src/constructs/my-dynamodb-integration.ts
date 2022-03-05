import { join } from "path";
import { Aws } from "aws-cdk-lib";
import { AwsIntegration, IntegrationOptions } from "aws-cdk-lib/aws-apigateway";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { MyIntegrationProps } from "./my-integration-props";

export class MyDynamoDBIntegration extends Construct {
  constructor(scope: Construct, id: string, props: MyIntegrationProps) {
    super(scope, id);

    const lambda = new NodejsFunction(this, "Lambda", {
      entry: join(__dirname, "../lambda-fns/delivery-by-dynamodb.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
      retryAttempts: 0,
      bundling: {
        minify: true,
      },
    });
    lambda.addEventSource(
      new DynamoEventSource(props.table, {
        startingPosition: StartingPosition.TRIM_HORIZON,
        batchSize: 10,
        retryAttempts: 0,
      })
    );

    const apiGatewayDynamoDBRole = new Role(this, "ApiGatewayDynamoDBRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });
    props.table.grantWriteData(apiGatewayDynamoDBRole);

    const integrationOptions: IntegrationOptions = {
      credentialsRole: apiGatewayDynamoDBRole,
      requestParameters: {
        "integration.request.header.Content-Type":
          "'application/x-www-form-urlencoded'", // "'application/x-amz-json-1.1'"
      },
      requestTemplates: {
        "application/json": JSON.stringify({
          TableName: props.table.tableName,
          KeyConditionExpression: "name = :name",
          Item: {
            name: {
              S: "$input.path('$.name')",
            },
          },
        }),
      },
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: { "application/json": "" },
        },
      ],
    };

    const integrationPost = new AwsIntegration({
      service: "dynamodb",
      action: "PutItem",
      region: `${Aws.REGION}`,
      options: integrationOptions,
    });

    props.resource.addMethod("POST", integrationPost, {
      methodResponses: [{ statusCode: "200" }],
      requestModels: { "application/json": props.model },
      requestValidator: props.validator,
    });
  }
}
