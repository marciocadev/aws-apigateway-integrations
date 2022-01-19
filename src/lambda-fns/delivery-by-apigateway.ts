import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: APIGatewayEvent) => {
  const payload = JSON.parse(event.body || "");

  console.log(process.env);

  payload["delivery-by"] = "apigateway-lambda-dynamo";

  const input: PutItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Item: marshall(payload),
  };

  let result: APIGatewayProxyResult = {
    statusCode: 200,
    body: "Lambda Success",
  };

  try {
    await client.send(new PutItemCommand(input));
  } catch (err) {
    console.error(err);
    result = {
      statusCode: 400,
      body: "Lambda fail",
    };
  }

  return result;
};
