import {
  IModel,
  IRequestValidator,
  IResource,
} from "aws-cdk-lib/aws-apigateway";
import { ITable } from "aws-cdk-lib/aws-dynamodb";

export interface MyIntegrationProps {
  resource: IResource;
  model: IModel;
  validator: IRequestValidator;
  table: ITable;
}
