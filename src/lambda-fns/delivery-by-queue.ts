import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { SQSEvent, SQSBatchItemFailure, SQSBatchResponse } from "aws-lambda";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: SQSEvent) => {
  let batchFailureResponse: SQSBatchResponse = {
    batchItemFailures: [],
  };

  for (let record of event.Records) {
    try {
      const pk = record.messageId;
      const payload = JSON.parse(record.body);

      payload["pk"] = pk;
      payload["delivery-by"] = "apigateway-queue-lambda-dynamo";

      const input: PutItemCommandInput = {
        TableName: process.env.TABLE_NAME,
        Item: marshall(payload),
      };
      await client.send(new PutItemCommand(input));
    } catch (err) {
      let failureResponse: SQSBatchItemFailure = {
        itemIdentifier: record.messageId,
      }
      batchFailureResponse.batchItemFailures.push(failureResponse);
    }
  }  

  return batchFailureResponse;
};
