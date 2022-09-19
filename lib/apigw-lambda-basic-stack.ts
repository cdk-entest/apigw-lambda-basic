import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import * as fs from "fs";

export class ApigwLambdaBasicStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // lambda function
    const func = new cdk.aws_lambda.Function(this, "SimpleLambda", {
      functionName: "SimpleLambda",
      code: cdk.aws_lambda.Code.fromInline(
        fs.readFileSync(path.resolve(__dirname, "./../lambda/index.py"), {
          encoding: "utf-8",
        })
      ),
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_8,
      memorySize: 512,
      timeout: Duration.seconds(10),
      handler: "index.handler",
    });

    // apigatway
    const apigw = new cdk.aws_apigateway.RestApi(this, "ApiGwDemo", {
      restApiName: "ApiGwDemo",
    });

    // resource
    const resource = apigw.root.addResource("order");

    // method and lambda integration
    resource.addMethod("GET", new cdk.aws_apigateway.LambdaIntegration(func));
  }
}
