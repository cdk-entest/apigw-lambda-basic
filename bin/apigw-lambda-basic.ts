#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApigwLambdaBasicStack } from "../lib/apigw-lambda-basic-stack";

const app = new cdk.App();
new ApigwLambdaBasicStack(app, "ApigwLambdaBasicStack", {});
