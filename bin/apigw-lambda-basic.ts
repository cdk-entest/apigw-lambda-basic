#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApigwLambdaBasicStack } from "../lib/apigw-lambda-basic-stack";
import { ApigwDemoStack } from "../lib/apigw-lambda-demo-stack";

const app = new cdk.App();

// basic apigw lambda stack
new ApigwLambdaBasicStack(app, "ApigwLambdaBasicStack", {});

// interim apigw lambda stack
new ApigwDemoStack(app, "ApigwDemoStack", {});
