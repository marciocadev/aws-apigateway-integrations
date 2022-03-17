import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { SNSEvent } from "aws-lambda";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: SNSEvent) => {
  const pk = event.Records[0].Sns.MessageId;
  const payload = JSON.parse(event.Records[0].Sns.Message);

  payload["pk"] = pk;
  payload["delivery-by"] = "apigateway-topic-lambda-dynamo";

  const input: PutItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Item: marshall(payload),
  };

  try {
    await client.send(new PutItemCommand(input));
  } catch (err) {
    console.error(err);
  }
};
