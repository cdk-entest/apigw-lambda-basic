---
title: API Gateway and Lambda Integration Basic
description: show a very basic integration of api gateway and lambda
author: haimtran
publishedDate: 06/23/2022
date: 2022-07-24
---

## Introduction

[GitHub](https://github.com/cdk-entest/apigw-lambda-basic) this demonstrates a very basic example of integrating api gateway with a lambda function.

- lambda handler header for proxy apigw
- apigw and lambda integration
- simple test to see lambda scale concurrency

<LinkedImage
  href="https://youtu.be/16BUGFMsHlA"
  height={400}
  alt="apigw lambda basic"
  src="/thumbnail/apigw-lambda-basic.png"
/>

## Lambda Handler

add header to work with api gw proxy integration

```py
import datetime
import time
import json

def handler(event, context) -> json:
    """
    simple lambda function
    """

    # time stamp
    now = datetime.datetime.now()
    time_stamp = now.strftime("%Y/%m/%d %H:%M:%S.%f")

    # sleep
    time.sleep(2)

    return {
        'statusCode': 200,
        'headers': {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        'body': json.dumps({
            'message': f'lambda {time_stamp} {event}'
        })
    }
```

## Cdk Stack

lambda inline function

```tsx
// lambda function
const func = new cdk.aws_lambda.Function(this, "HelloLambdaTest", {
  functionName: "HelloLambdaTest",
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
```

api gateway and integration with lambda

```tsx
// apigatway
const apigw = new cdk.aws_apigateway.RestApi(this, "ApiGwDemo", {
  restApiName: "ApiGwDemo",
});

// resource
const resource = apigw.root.addResource("order");

// method and lambda integration
resource.addMethod("GET", new cdk.aws_apigateway.LambdaIntegration(func));
```

## Concurrency

Send concurrent requests and see how lambda scale

```py
import time
from concurrent.futures import ThreadPoolExecutor
import boto3

# function name
FUNCTION_NAME = "HelloLambdaTest"

# lambda client
lambda_client = boto3.client("lambda")

# number of concurrent request
NUM_CONCUR_REQUEST = 100


def invoke_lambda(id: int) -> str:
    """
    invoke lambda
    """
    res = lambda_client.invoke(
        FunctionName=FUNCTION_NAME
    )

    print(f'lamda {id} {res["Payload"].read()}')
    print("\n")
    return res['Payload'].read()


def test_scale_lambda() -> None:
    """
    Test how lambda scale
    """
    with ThreadPoolExecutor(max_workers=NUM_CONCUR_REQUEST) as executor:
        for k in range(1, NUM_CONCUR_REQUEST):
            executor.submit(invoke_lambda, k)


if __name__ == "__main__":
    while True:
        test_scale_lambda()
        time.sleep(5)
```

## Enable Access Log

Log access to api gw to a cloudwatch loggroup. First, create a iam role which assumed by the api so that it can put event logs to a cloudwatch log group.

```tsx
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
```

create a log group to store the log

```tsx
// access log group - prod stage
const prodLogGroup = new aws_logs.LogGroup(this, "ProdLogGroup", {
  logGroupName: "ProdLogGroupAccessLog",
  removalPolicy: RemovalPolicy.DESTROY,
});
```

## Deployment and Stage

Disable the default deployment and add two stages later on

```tsx
const apiGw = new aws_apigateway.RestApi(this, "HelloApiGw", {
  restApiName: "HelloApiGw",
  deploy: false,
});

const book = apiGw.root.addResource("book");
```

add prod stage

```tsx
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
```

create a cloudwatch loggroup

```tsx
const devLogGroup = new aws_logs.LogGroup(this, "ApiAccessLogGroup", {
  logGroupName: "DevLogGroupAccessLog",
  removalPolicy: RemovalPolicy.DESTROY,
});
```

create a deployment

```tsx
const deployment = new aws_apigateway.Deployment(this, "Deployment", {
  api: apiGw,
});
```

deploy the dev stage

```tsx
const devStage = new aws_apigateway.Stage(this, "DevStage", {
  stageName: "dev",
  deployment,
  dataTraceEnabled: true,
  accessLogDestination: new aws_apigateway.LogGroupLogDestination(devLogGroup),
  accessLogFormat: aws_apigateway.AccessLogFormat.jsonWithStandardFields(),
});
```

deploy the prod stage

```tsx
const prodStage = new aws_apigateway.Stage(this, "ProdStage", {
  stageName: "prod",
  deployment,
  dataTraceEnabled: true,
  accessLogDestination: new aws_apigateway.LogGroupLogDestination(prodLogGroup),
  accessLogFormat: aws_apigateway.AccessLogFormat.jsonWithStandardFields(),
});
```

store and publish stage arn so we can attach waf to these arn later on inside the waf stack

```tsx
this.apiArns.push(prodStage.stageArn);
```

## Protect API using WAF

create three waf rules to protect the api. First rule is an AWS managed rule which block IP addresses typically associated with bots from Amazon internal threat intelligence

```tsx
const awsMangedRuleIPReputationList: aws_wafv2.CfnWebACL.RuleProperty = {
  name: "AWSManagedRulesCommonRuleSet",
  priority: 10,
  statement: {
    managedRuleGroupStatement: {
      name: "AWSManagedRulesCommonRuleSet",
      vendorName: "AWS",
    },
  },
  overrideAction: { none: {} },
  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: "AWSIPReputationList",
  },
};
```

second waf rule geo restrict block from a list of countries

```tsx
const ruleGeoRestrict: aws_wafv2.CfnWebACL.RuleProperty = {
  name: "RuleGeoRestrict",
  priority: 2,
  action: {
    block: {},
  },
  statement: {
    geoMatchStatement: {
      countryCodes: ["SG"],
    },
  },
  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: "GeoMatch",
  },
};
```

third rule is ip rate based which block if more than 2000 request per second from an IP address

```tsx
const ruleLimiteRequestsThreshold: aws_wafv2.CfnWebACL.RuleProperty = {
  name: "LimiteRequestsThreshold",
  priority: 1,
  action: {
    block: {},
  },
  statement: {
    // 2000 requests within 5 minutes
    rateBasedStatement: {
      limit: 2000,
      aggregateKeyType: "IP",
    },
  },
  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: "LimitRequestsThreshold",
  },
};
```

## API WAF Test

using [Artillery](https://www.artillery.io/), send more than 2000 requests from client using 10 threads

```bash
artillery quick -n 2100 --count 10 ENDPOINT
```

then the IP will be blocked and received 403 (fobiden error) in the following requests

## Reference

- [Lambda optmization](https://aws.amazon.com/blogs/compute/operating-lambda-performance-optimization-part-1/)
- [Lambda re-invent 2021](https://www.youtube.com/watch?v=pqC-t1kcTL4)
- [WAF protect API](https://aws.amazon.com/blogs/compute/amazon-api-gateway-adds-support-for-aws-waf/)
