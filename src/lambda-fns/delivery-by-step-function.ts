import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import sha256 from 'crypto-js/sha256';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async(event: any) => {
  let payload = event;
  
  payload["pk"] = sha256(JSON.stringify('$input.body')).toString();
  payload["delivery-by"] = "apigateway-step-function-lambda-dynamo";

  const input: PutItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Item: marshall(payload),
  };

  await client.send(new PutItemCommand(input));
}