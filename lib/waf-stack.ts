import { v4 as uuidv4 } from "uuid";
import { aws_wafv2, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

interface WafApigwProps extends StackProps {
  resourceArns: string[];
}

export class WafApigwStack extends Stack {
  constructor(scope: Construct, id: string, props: WafApigwProps) {
    super(scope, id, props);

    /**
     * 1. AWS managed WAF rule
     * block IP addresses typically associated with bots
     * from Amazon internal threat intelligence
     */
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

    /**
     * 2. Geo restrict rule. Block from a list.
     */
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

    /**
     * 3. Rate limite rule. in five-minute period,
     * if number of requests over the limit 100,
     * block the IP.
     */
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

    // Push rules into ACL
    const webAcl = new aws_wafv2.CfnWebACL(this, "WafToProtectApigwDemo", {
      defaultAction: { allow: {} },
      // scope: "CLOUDFRONT",
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "waf-regional-apigw",
        sampledRequestsEnabled: true,
      },
      description: "WAFv2 ACL for CloudFront",
      name: "WafToProtectApigwDemo",
      // push all rules into an ACL
      rules: [
        awsMangedRuleIPReputationList,
        ruleLimiteRequestsThreshold,
        ruleGeoRestrict,
      ],
    });

    //
    props.resourceArns.map((arn) => {
      new aws_wafv2.CfnWebACLAssociation(this, `WafProtectApi-${uuidv4()}`, {
        resourceArn: arn,
        webAclArn: webAcl.attrArn,
      });
    });
  }
}
