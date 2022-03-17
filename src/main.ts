import { App, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  JsonSchema,
  JsonSchemaType,
  JsonSchemaVersion,
  Model,
  RequestValidator,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { MyLambdaIntegration } from "./constructs/my-lambda-integration";
import { MySnsIntegration } from "./constructs/my-sns-integration";
import { MySqsIntegration } from "./constructs/my-sqs-integration";
import { MyStepFunctionIntegration } from "./constructs/my-step-function-integration";

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    /* Uma tabela para armazenar os objetos enviados, no caso será
       um objeto com os parâmetros name, age e delivery-by
    */
    const table = new Table(this, "Table", {
      partitionKey: {
        name: "pk",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Um ApiGateway único para todos os endpoints do exemplo de integração
    const gateway = new RestApi(this, "ApiGatewayIntegrations", {
      restApiName: "apigateway-integrations",
    });

    /* JsonSchema para o ApiGateway, neste schema o gateway espera um json
      no formato { "name": string, age: number }, sendo que o parâmetro
      'name' é obrigatório
    */
    const requestSchemaPost: JsonSchema = {
      title: "PostRequest",
      type: JsonSchemaType.OBJECT,
      schema: JsonSchemaVersion.DRAFT4,
      properties: {
        name: { type: JsonSchemaType.STRING },
        age: { type: JsonSchemaType.INTEGER },
      },
      required: ["name"],
    };

    // Cria um modelo baseado no schema criado e aplica no gateway
    const requestModelPost: Model = new Model(this, "PostModel", {
      restApi: gateway,
      contentType: "application/json",
      schema: requestSchemaPost,
    });

    const responseModel: Model = new Model(this, 'ResponseModel', {
      restApi: gateway,
      contentType: "application/json",
      schema: {
        title: "ResponseRequest",
        type: JsonSchemaType.OBJECT,
        schema: JsonSchemaVersion.DRAFT4,
        properties: {
          result: { type: JsonSchemaType.OBJECT },
        }
      }
    });

    /* Cria um validador indicando o que deve ser validado no payload
        recebido, no nosso caso serão validados apenas o 'body' das mensagens
    */
    const requestValidator = new RequestValidator(this, "PostValidator", {
      requestValidatorName: "validator",
      restApi: gateway,
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    new MyLambdaIntegration(this, "MyLambdaIntegration", {
      resource: gateway.root.addResource("lambda"),
      model: requestModelPost,
      validator: requestValidator,
      table: table,
      response: responseModel,
    });

    new MySqsIntegration(this, "MySqsIntegration", {
      resource: gateway.root.addResource("sqs"),
      model: requestModelPost,
      validator: requestValidator,
      table: table,
      response: responseModel,
    });

    new MySnsIntegration(this, "MySnsIntegration", {
      resource: gateway.root.addResource("sns"),
      model: requestModelPost,
      validator: requestValidator,
      table: table,
      response: responseModel,
    });

    new MyStepFunctionIntegration(this, "MyStepFunctionIntegration", {
      resource: gateway.root.addResource('step-function'),
      model: requestModelPost,
      validator: requestValidator,
      table: table,
      response: responseModel,
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, "apigateway-integrations-dev", { env: devEnv });
// new MyStack(app, "apigateway-integrations-prod", { env: prodEnv });

app.synth();
