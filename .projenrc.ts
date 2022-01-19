import { awscdk } from "projen";
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.8.0",
  defaultReleaseBranch: "main",
  name: "aws-apigatewa-integrations",
  projenrcTs: true,

  release: true,

  codeCov: true,

  prettier: true,
  eslint: true,
  tsconfig: {
    compilerOptions: {
      lib: ["dom", "es2019"],
    },
  },

  deps: [
    "@types/aws-lambda",
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/util-dynamodb",
  ],
});
project.synth();