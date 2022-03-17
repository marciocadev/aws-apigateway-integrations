import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: APIGatewayEvent, context: Context) => {
  const payload = JSON.parse(event.body || "");

  payload["pk"] = context.awsRequestId;
  payload["delivery-by"] = "apigateway-lambda-dynamo";

  const input: PutItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Item: marshall(payload),
  };

  let result: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({"pk": payload["pk"]}),
  };

  try {
    await client.send(new PutItemCommand(input));
  } catch (err) {
    result = {
      statusCode: 400,
      body: "Lambda fail",
    };
  }

  return result;
};
