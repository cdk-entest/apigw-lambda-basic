#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApigwLambdaBasicStack } from "../lib/apigw-lambda-basic-stack";
import { ApigwDemoStack } from "../lib/apigw-lambda-demo-stack";
import { WafApigwStack } from "../lib/waf-stack";

const app = new cdk.App();

// basic apigw lambda stack
// new ApigwLambdaBasicStack(app, "ApigwLambdaBasicStack", {});

// interim apigw lambda stack
const apigw = new ApigwDemoStack(app, "ApigwDemoStack", {});

// waf rule to protect api
const waf = new WafApigwStack(app, "WafApigwStack", {
  resourceArns: apigw.apiArns,
});

waf.addDependency(apigw);
