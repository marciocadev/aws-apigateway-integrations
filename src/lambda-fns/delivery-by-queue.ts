import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { SQSEvent } from "aws-lambda";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const payload = JSON.parse(record.body);

    payload["delivery-by"] = "apigateway-queue-lambda-dynamo";

    const input: PutItemCommandInput = {
      TableName: process.env.TABLE_NAME,
      Item: marshall(payload),
    };

    try {
      await client.send(new PutItemCommand(input));
    } catch (err) {
      console.error(err);
    }
  }
};
