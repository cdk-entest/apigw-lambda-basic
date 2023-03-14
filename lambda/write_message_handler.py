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

    # time stamp
    now = datetime.datetime.now()
    time_stamp = now.strftime("%Y/%m/%d %H:%M:%S.%f")

    # parse message from post request body
    try:
        message = event["body"]
    except:
        print("error parsing message from post body")
        message = None
    # write message to table
    if message is not None:
        try:
            table.put_item(Item={"id": str(uuid.uuid4()), "message": event["body"]})
        except:
            print("error write to ddb")

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET",
        },
        "body": json.dumps({"time": f"lambda {time_stamp}", "event": event}),
    }
