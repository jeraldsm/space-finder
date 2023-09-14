import { App } from "aws-cdk-lib";
import { ApiStack } from "./stacks/ApiStack";
import { AuthStack } from "./stacks/AuthStack";
import { CertificateStack } from "./stacks/CertificateStack";
import { DataStack } from "./stacks/DataStack";
import { FrontendStack } from "./stacks/FrontendStack";
import { LambdaStack } from "./stacks/LambdaStack";



const app = new App();


// AWS Environment variables for eu-central-1
const RegionalEnv = {
    account: process.env.CDK_DEFAULT_ACCOUNT || '134854240686',
    region: 'eu-central-1',
  };

// AWS Environment variables for us-east-1
const USEast1Env = {
    account: process.env.CDK_DEFAULT_ACCOUNT || '134854240686',
    region: 'us-east-1',
  };
  

// Provide the domain name (FDQN) here or pass it as environment variable :  
const fdqn = {
    domainName: process.env.FDQN || 'jsmtraining.com',
  };


// Datastack contains dynamodb and s3 buckets
const dataStack = new DataStack(app, 'DataStack',{
    env: RegionalEnv,

});

// Lambdastack contains lambda functions
const lambdaStack = new LambdaStack(app, 'LambdaStack', {
    spacesTable: dataStack.spacesTable,
    env: RegionalEnv,
})

// authStack contains cognito userpool and roles
const authStack = new AuthStack(app, 'AuthStack', {
    photosBucket: dataStack.photosBucket,
    env: RegionalEnv,
});

// RegionalcertificateStack creates SSL certificates for given FDQN in eu-central-1 region
const RegionalcertificateStack = new CertificateStack(app, 'RegionalCertificateStack', {
    ...fdqn,
    env: RegionalEnv,
})

// authStack contains api gateway, custom domains, resources, cognito authorizer and methods
new ApiStack(app, 'ApiStack', {
    ...fdqn,
    helloLambdaIntegration: lambdaStack.helloLambdaIntegration,
    //helloLambdaIntegrationArn: lambdaStack.helloLambdaIntegrationArn

    spacesLambdaIntegration: lambdaStack.spacesLambdaIntegration,
    userPool: authStack.userPool,
    certificate: RegionalcertificateStack.siteCertificate,
    env: RegionalEnv,
})

// RegionalcertificateStack creates SSL certificates for given FDQN in us-east-1 region for the cloudfront
const USEast1CertificateStack = new CertificateStack(app, 'USEast1CertificateStack', {
    ...fdqn,
    env: USEast1Env,
    crossRegionReferences: true,
})

// FrontendStack contains cloudfront, cloudfront origin - sample html website in s3 bucket and apigateway
new FrontendStack(app, 'FrontendStack', {
    ...fdqn,
    certificate: USEast1CertificateStack.siteCertificate,
    env: RegionalEnv,
    crossRegionReferences: true,
})

