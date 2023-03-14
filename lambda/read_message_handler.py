# haimtran 03 DEC 2022
# lambda write messages to dyanmdodb
# expose via api gateway

import os
import datetime
import time
import json
import boto3
import uuid

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])


def handler(event, context) -> json:
    """
    simple lambda function
    """

    # query should be here
    resp = table.scan(Limit=50)
    # parse response
    try:
        items = resp["Items"]
    except:
        items = []
    # return 
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET",
        },
        "body": json.dumps(resp)
    }