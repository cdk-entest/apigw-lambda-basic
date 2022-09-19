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