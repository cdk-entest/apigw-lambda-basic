// haimtran 15 AUG 2022
// add proxy option
// add logs removal destroy
// app waf ip rate rule

import {
  aws_apigateway,
  aws_iam,
  aws_lambda,
  aws_logs,
  aws_wafv2,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

export class ApigwDemoStack extends Stack {
  public readonly apiArns: string[] = [];

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // lambda
    const func = new aws_lambda.Function(this, "ProcessOrderLambda", {
      functionName: "ProcessOrderLambda",
      code: aws_lambda.Code.fromAsset(path.join(__dirname, "./../lambda")),
      handler: "index.handler",
      runtime: aws_lambda.Runtime.PYTHON_3_8,
    });

    // role for apigw
    const role = new aws_iam.Role(this, "RoleForApiGwInvokeLambda", {
      roleName: "ApiGwInvokeLambda",
      assumedBy: new aws_iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [func.functionArn],
      })
    );

    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
        ],
        resources: ["*"],
      })
    );

    // access log group - prod stage
    const prodLogGroup = new aws_logs.LogGroup(this, "ProdLogGroup", {
      logGroupName: "ProdLogGroupAccessLog",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // create an apigw - prod stage
    const apiGw = new aws_apigateway.RestApi(this, "HelloApiGw", {
      restApiName: "HelloApiGw",
      deploy: false,
      // deployOptions: {
      //   stageName: "prod",
      //   accessLogDestination: new aws_apigateway.LogGroupLogDestination(
      //     prodLogGroup
      //   ),
      //   accessLogFormat:
      //     aws_apigateway.AccessLogFormat.jsonWithStandardFields(),
      // },
    });

    const book = apiGw.root.addResource("book");

    // apigw-lambda integration
    book.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(func, {
        proxy: true,
        allowTestInvoke: false,
        credentialsRole: role,
        integrationResponses: [
          {
            statusCode: "200",
          },
        ],
      }),
      // method options
      {
        // required for non-proxy
        methodResponses: [{ statusCode: "200" }],
      }
    );

    // access log group - dev stage
    const devLogGroup = new aws_logs.LogGroup(this, "ApiAccessLogGroup", {
      logGroupName: "DevLogGroupAccessLog",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const deployment = new aws_apigateway.Deployment(this, "Deployment", {
      api: apiGw,
    });

    // dev stage
    const devStage = new aws_apigateway.Stage(this, "DevStage", {
      stageName: "dev",
      deployment,
      dataTraceEnabled: true,
      accessLogDestination: new aws_apigateway.LogGroupLogDestination(
        devLogGroup
      ),
      accessLogFormat: aws_apigateway.AccessLogFormat.jsonWithStandardFields(),
    });

    // prod stage
    const prodStage = new aws_apigateway.Stage(this, "ProdStage", {
      stageName: "prod",
      deployment,
      dataTraceEnabled: true,
      accessLogDestination: new aws_apigateway.LogGroupLogDestination(
        prodLogGroup
      ),
      accessLogFormat: aws_apigateway.AccessLogFormat.jsonWithStandardFields(),
    });

    // make sure this stage deployed after prod stage
    deployment.node.addDependency(book);

    // store api arns
    // this.apiArns.push(devStage.stageArn);
    this.apiArns.push(prodStage.stageArn);
  }
}
