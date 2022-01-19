import { join } from "path";
import { Aws } from "aws-cdk-lib";
import { AwsIntegration, IntegrationOptions } from "aws-cdk-lib/aws-apigateway";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Topic } from "aws-cdk-lib/aws-sns";
import { LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";
import { MyIntegrationProps } from "./my-integration-props";

export class MySnsIntegration extends Construct {
  constructor(scope: Construct, id: string, props: MyIntegrationProps) {
    super(scope, id);

    const lambda = new NodejsFunction(this, "Lambda", {
      entry: join(__dirname, "../lambda-fns/delivery-by-topic.ts"),
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

    let apiGatewaySnsRole = new Role(this, "ApiGatewaySnsRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });

    const topic = new Topic(this, "Topic", {
      topicName: "apigateway-topic",
    });
    topic.addSubscription(new LambdaSubscription(lambda));
    topic.grantPublish(apiGatewaySnsRole);

    const integrationOptions: IntegrationOptions = {
      credentialsRole: apiGatewaySnsRole,
      requestParameters: {
        "integration.request.header.Content-Type":
          "'application/x-www-form-urlencoded'", // "'application/x-amz-json-1.1'"
      },
      requestTemplates: {
        "application/json":
          "Action=Publish&" +
          "TargetArn=$util.urlEncode('" +
          topic.topicArn +
          "')&" +
          "Message=$input.body&",
      },
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: { "application/json": "" },
        },
      ],
    };

    const integrationPost = new AwsIntegration({
      service: "sns",
      region: `${Aws.REGION}`,
      path: `${Aws.ACCOUNT_ID}/${topic.topicName}`,
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
