---
title: API Gateway and Lambda Integration Basic
description: show a very basic integration of api gateway and lambda
author: haimtran
publishedDate: 06/23/2022
date: 2022-07-24
---

## Introduction

[GitHub]() this demonstrates a very basic example of integrating api gateway with a lambda function.

- lambda handler header for proxy apigw
- apigw and lambda integration
- simple test to see lambda scale concurrency

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

## Reference

- [Lambda optmization](https://aws.amazon.com/blogs/compute/operating-lambda-performance-optimization-part-1/)
- [Lambda re-invent 2021](https://www.youtube.com/watch?v=pqC-t1kcTL4)
