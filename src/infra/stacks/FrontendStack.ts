import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { BlockPublicAccess, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HttpOrigin, RestApiOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Certificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';
import { CachePolicy, OriginRequestPolicy } from 'aws-cdk-lib/aws-cloudfront';


interface FrontendStackProps extends StackProps {
    certificate: ICertificate,
    domainName: string;
}

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const siteDomain = 'www' + '.' + props.domainName;
    const apiDomain = 'api' + '.' + props.domainName;

  // 1. Define the domain name by changing'stormit.link'.
//   const domainName = 'jsmtraining.com';
//   const siteDomain = 'www' + '.' + domainName;

    // 1.1 Create a Route 53 hosted zone (optional - you will need to update the NS records).
    // const zone = new route53.PublicHostedZone(this, 'MyHostedZone', {
    //     zoneName: domainName,
    //     });
          
    
    // new CfnOutput(this, 'Site', { value: 'https://' + siteDomain });

    // 1.2 Find the current hosted zone in Route 53 
      const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: props.domainName });
      console.log(zone);
    
  // 2. Create a TLS/SSL certificate for HTTPS
        // const certificate = new acm.DnsValidatedCertificate(this, 'SiteCertificate', {
        //   domainName: domainName,
        //   subjectAlternativeNames: ['*.' + domainName],
        //       hostedZone: zone,
        //       region: 'us-east-1', // Cloudfront only checks this region for certificates
        // });

    // 2.1 The removal policy for the certificate can be set to 'Retain' or 'Destroy'
        // certificate.applyRemovalPolicy(RemovalPolicy.DESTROY)

        // new CfnOutput(this, 'Certificate', { value: certificate.certificateArn });
    

  // 3. Create an S3 bucket to store content, and set the removal policy to either 'Retain' or 'Destroy'
    // Please be aware that all content stored in the S3 bucket is publicly available.
        const siteBucket = new s3.Bucket(this, 'SiteBucket', {
          bucketName: siteDomain,
          publicReadAccess: false,
          removalPolicy: RemovalPolicy.DESTROY,
          autoDeleteObjects: true,
          accessControl: BucketAccessControl.PRIVATE,
          encryption: BucketEncryption.S3_MANAGED,            
        })

          new CfnOutput(this, 'Bucket', { value: siteBucket.bucketName });

                  
  // 4. Deploy CloudFront distribution

        const ApigwCachePolicy = new cloudfront.CachePolicy(this, 'ApigwCachePolicy', {
            cachePolicyName: 'ApigwCachePolicy',
            comment: 'Cache policy for API GW',
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization'),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        });
    
        const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
          certificate: props.certificate,
          defaultRootObject: "index.html",
          domainNames: [siteDomain, props.domainName],
          minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
          errorResponses:[
            {
              httpStatus: 404,
              responseHttpStatus: 404,
              responsePagePath: '/error/index.html',
              ttl: Duration.minutes(30),
            }
          ],
          defaultBehavior: {
            origin: new S3Origin(siteBucket),
            compress: true,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          },
          additionalBehaviors: {
            '/api/*': {
                origin: new HttpOrigin(apiDomain),
                compress: false,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                cachePolicy: ApigwCachePolicy
            },
          },        
        });

        new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });

        
  // 5. Create a Route 53 alias record for the CloudFront distribution
        //5.1  Add an 'A' record to Route 53 for 'www.example.com'
        new route53.ARecord(this, 'WWWSiteAliasRecord', {
          zone,
          recordName: siteDomain,
          target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
        });
        //5.2 Add an 'A' record to Route 53 for 'example.com'
        new route53.ARecord(this, 'SiteAliasRecord', {
          zone,
          recordName: props.domainName,
          target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
        });

    //6. Deploy the files from the 'html-website' folder in Github to an S3 bucket
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
          sources: [s3deploy.Source.asset('./html-website')],
          destinationBucket: siteBucket,
        });
  }
}
