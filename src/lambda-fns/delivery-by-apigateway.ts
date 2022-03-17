import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import sha256 from 'crypto-js/sha256';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: APIGatewayEvent) => {
  const payload = JSON.parse(event.body || "");

  payload["pk"] = sha256(JSON.stringify(payload)).toString();
  payload["delivery-by"] = "apigateway-lambda-dynamo";

  const input: PutItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Item: marshall(payload),
  };

  let result: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({"searchKey": payload["pk"]}),
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
