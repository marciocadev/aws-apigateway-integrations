import { join } from "path";
import { Aws } from "aws-cdk-lib";
import { AwsIntegration, IntegrationOptions } from "aws-cdk-lib/aws-apigateway";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { MyIntegrationProps } from "./my-integration-props";

export class MySqsIntegration extends Construct {
  constructor(scope: Construct, id: string, props: MyIntegrationProps) {
    super(scope, id);

    const lambda = new NodejsFunction(this, "Lambda", {
      entry: join(__dirname, "../lambda-fns/delivery-by-queue.ts"),
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

    let apiGatewaySqsRole = new Role(this, "ApiGatewaySqsRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });

    const deadLetterQueue = new Queue(this, "MyDeadLetterQueue", {
      queueName: "apigateway-dead-letter-queue",
    });

    const queue = new Queue(this, "MyQueue", {
      queueName: "apigateway-queue",
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 1,
      },
    });
    queue.grantSendMessages(apiGatewaySqsRole);
    queue.grantConsumeMessages(lambda);

    lambda.addEventSource(new SqsEventSource(queue));

    const integrationOptions: IntegrationOptions = {
      credentialsRole: apiGatewaySqsRole,
      requestParameters: {
        "integration.request.header.Content-Type":
          "'application/x-www-form-urlencoded'", // "'application/x-amz-json-1.1'"
      },
      requestTemplates: {
        "application/json": "Action=SendMessage&" + "MessageBody=$input.body",
      },
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: { "application/json": "" },
        },
      ],
    };

    const integrationPost = new AwsIntegration({
      service: "sqs",
      region: `${Aws.REGION}`,
      path: `${Aws.ACCOUNT_ID}/${queue.queueName}`,
      integrationHttpMethod: "POST",
      options: integrationOptions,
    });

    props.resource.addMethod("POST", integrationPost, {
      methodResponses: [{ statusCode: "200" }],
      requestModels: { "application/json": props.model },
      requestValidator: props.validator,
    });
  }
}
