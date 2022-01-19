import { join } from "path";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { MyIntegrationProps } from "./my-integration-props";

export class MyLambdaIntegration extends Construct {
  constructor(scope: Construct, id: string, props: MyIntegrationProps) {
    super(scope, id);

    const lambda = new NodejsFunction(this, "MyLambda", {
      entry: join(__dirname, "../lambda-fns/delivery-by-apigateway.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
      retryAttempts: 1,
      environment: {
        TABLE_NAME: props.table.tableName,
      },
      bundling: {
        minify: true,
      },
    });

    props.table.grantWriteData(lambda);

    const integrationPost = new LambdaIntegration(lambda);

    props.resource.addMethod("POST", integrationPost, {
      requestModels: {
        "application/json": props.model,
      },
      requestValidator: props.validator,
    });
  }
}
