import { Aws } from "aws-cdk-lib";
import { AwsIntegration, IntegrationOptions } from "aws-cdk-lib/aws-apigateway";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { MyIntegrationProps } from "./my-integration-props";

export class MyDynamoDBIntegration extends Construct {
  constructor(scope: Construct, id: string, props: MyIntegrationProps) {
    super(scope, id);

    const apiGatewayDynamoRole = new Role(this, 'ApiGatewayDynamoRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com')
    });
    props.table.grantWriteData(apiGatewayDynamoRole);

    // const integrationOptions: IntegrationOptions = {
    //   credentialsRole: apiGatewayDynamoRole,
    //   requestTemplates: {
    //     'application/json': JSON.stringify({
    //       'TableName': props.table.tableName,
    //       'Item': {
    //         'pk': {
    //           'S': '$context.requestId',
    //         },
    //         'name': {
    //           'S': '$input.path(\'$.name\')',
    //         },
    //         'age': {
    //           'N': '$input.path(\'$.age\')',
    //         },
    //         'delivery-by': {
    //           'S': 'apigateway-dynamodb',
    //         }
    //       }
    //     })
    //   },
    //   integrationResponses: [
    //     {
    //       statusCode: '200',
    //       responseTemplates: {
    //         'application/json': '$context.requestId',
    //       }
    //     }
    //   ],
    // };
    const integrationOptions: IntegrationOptions = {
      credentialsRole: apiGatewayDynamoRole,
      requestTemplates: {
        'application/json': `
        #if($input.path(\'$.age\').toString() != '')
        {
          "TableName":"${props.table.tableName}",
          "Item": {
            "pk":{"S":"$context.requestId"},
            "name":{"S":"$input.path('$.name')"},
            "age":{"N":"$input.path('$.age')"},
            "delivery-by":{"S":"apigateway-dynamodb"}
          }
        }
        #else
        {
          "TableName":"${props.table.tableName}",
          "Item": {
            "pk":{"S":"$context.requestId"},
            "name":{"S":"$input.path('$.name')"},
            "delivery-by":{"S":"apigateway-dynamodb"}
          }
        }
        #end`
      },
      integrationResponses: [
        {
          statusCode: '200',
          responseTemplates: {
            'application/json': '$context.requestId',
          }
        }
      ],
    };

    const postIntegration = new AwsIntegration({
      service: 'dynamodb',
      region: `${Aws.REGION}`,
      action: 'PutItem',
      options: integrationOptions,
    });

    props.resource.addMethod('POST', postIntegration, {
      methodResponses: [{ statusCode: '200' }],
      requestModels: { 'application/json': props.model },
      requestValidator: props.validator,
    });
  }
}