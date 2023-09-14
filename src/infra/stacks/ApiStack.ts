import { CfnParameter, Fn, IResolvable, Stack, StackProps } from 'aws-cdk-lib'
import { ApiDefinition, AuthorizationType, BasePathMapping, CognitoUserPoolsAuthorizer, Cors, EndpointType, InlineApiDefinition, LambdaIntegration, MethodLoggingLevel, MethodOptions, ResourceOptions, RestApi, SpecRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Certificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { LoggingLevel } from 'aws-cdk-lib/aws-chatbot';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';
import path = require('path');
import { getSuffixFromStack, replaceStringInYaml } from '../Utils';

interface ApiStackProps extends StackProps {
    helloLambdaIntegration: LambdaIntegration,

    spacesLambdaIntegration: LambdaIntegration,
    userPool: IUserPool;
    certificate: ICertificate,
    domainName: string;

}


export class ApiStack extends Stack {
    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props)
    
        const suffix = getSuffixFromStack(this);

                  
        const openApiAsset = new Asset(this, 'OpenApifile', {            
            path: path.join(__dirname, '../../services/openapi/SpacesApi.yaml')
        })
        const data = Fn.transform('AWS::Include', {'Location': openApiAsset.s3ObjectUrl})
        const apiDefinition: InlineApiDefinition = ApiDefinition.fromInline(data);
      
        // API Gateway deployment with openapi specs yaml        
        new SpecRestApi(this, 'SpacesRestApi', {
            apiDefinition: apiDefinition,
            restApiName: `SpacesApi-${suffix}`,
            deployOptions: {
                stageName: 'dev',
            },
            deploy: true
        })
    
        // API Gateway deployment without openapi specs yaml
        const api = new RestApi(this, 'SpacesApi', {
            endpointTypes: [EndpointType.REGIONAL]            
        });

        const apiDomain = api.addDomainName('apidomain', {
            domainName: `api.${props.domainName}`,
            certificate: props.certificate,
            endpointType: EndpointType.REGIONAL,
            basePath: "prod"
        })

        new BasePathMapping(this, 'BasepathMapping', {
            basePath: '',
            domainName: apiDomain,
            restApi: api,          
        })
            
            // Find the current hosted zone in Route 53 
        const zone = HostedZone.fromLookup(this, 'Zone', { domainName: props.domainName });

        // Create a Route53 record
        new route53.ARecord(this, 'ApiRecord', {
            zone,
            recordName: `api.${props.domainName}`,
            target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api))
          });
  
  
        const authorizer = new CognitoUserPoolsAuthorizer(this, 'SpacesApiAuthorizer', {
            cognitoUserPools:[props.userPool],
            identitySource: 'method.request.header.Authorization'
        });
        authorizer._attachToApi(api);

        const optionsWithAuth: MethodOptions = {
            authorizationType: AuthorizationType.COGNITO,
            authorizer: {
                authorizerId: authorizer.authorizerId
            }
        }

        const optionsWithCors: ResourceOptions = {
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS
            }
        }

        const apiResource = api.root.addResource('api', optionsWithCors);
        const spacesResource = apiResource.addResource('spaces', optionsWithCors);
        spacesResource.addMethod('GET', props.spacesLambdaIntegration, optionsWithAuth);
        spacesResource.addMethod('POST', props.spacesLambdaIntegration,optionsWithAuth);
        spacesResource.addMethod('PUT', props.spacesLambdaIntegration, optionsWithAuth);
        spacesResource.addMethod('DELETE', props.spacesLambdaIntegration, optionsWithAuth); 
    }
}