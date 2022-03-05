import { DynamoDBStreamEvent } from "aws-lambda";

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    console.log(record);
    const payload = record.dynamodb;
    console.log(payload);
  }
};
