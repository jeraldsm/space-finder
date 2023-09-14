import { Duration, Stack, StackProps } from 'aws-cdk-lib'
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function as LambdaFunction, Runtime, Tracing} from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Lambda } from 'aws-cdk-lib/aws-ses-actions';
import { Construct } from 'constructs';
import { join } from 'path';

interface LambdaStackProps extends StackProps {
    spacesTable: ITable
}

export class LambdaStack extends Stack {

    public readonly helloLambdaIntegration: LambdaIntegration
    public readonly spacesLambdaIntegration: LambdaIntegration

    constructor(scope: Construct, id: string, props: LambdaStackProps) {
        super(scope, id, props)

        // Hello Lambda Test with LambdaFunction
        const helloLambda = new LambdaFunction(this, 'HelloLambda', {
            functionName: 'helloLambdaFunction',
            runtime: Runtime.NODEJS_18_X,
            handler: 'hello.main',
            code: Code.fromAsset(join(__dirname, '..','..', 'services')),
            environment: {
                TABLE_NAME: props.spacesTable.tableName
            }
        })

        // Spaces App Lambda Test with NodejsFunction
        const spacesLambda = new NodejsFunction(this, 'SpacesLambda', {
            functionName: 'spacesLambdaFunction',
            runtime: Runtime.NODEJS_18_X,
            handler: 'handler',
            entry: (join(__dirname, '..','..', 'services', 'spaces', 'handler.ts')),
            environment: {
                TABLE_NAME: props.spacesTable.tableName
            },
            tracing: Tracing.ACTIVE,
            timeout: Duration.minutes(1)
        });

        spacesLambda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [props.spacesTable.tableArn],
            actions:[
                'dynamodb:PutItem',
                'dynamodb:Scan',
                'dynamodb:GetItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem'
            ]
        }))


        this.helloLambdaIntegration = new LambdaIntegration(helloLambda)
        this.spacesLambdaIntegration = new LambdaIntegration(spacesLambda)

    }
}
