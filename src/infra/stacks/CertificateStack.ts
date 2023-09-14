import { Stack, StackProps } from 'aws-cdk-lib'
import { Certificate, CertificateValidation, ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from "constructs";


interface CertificateStackProps extends StackProps {
    domainName: string;
  }
  
  
  export class CertificateStack extends Stack {

    public readonly siteCertificate: ICertificate;

    constructor(scope: Construct, id: string, props: CertificateStackProps) {
      super(scope, id, props);
  
      const siteDomain = 'www' + '.' + props.domainName;
    

    // Find the current hosted zone in Route 53 
    const zone = HostedZone.fromLookup(this, 'Zone', { domainName: props.domainName });
    console.log(zone);

    this.siteCertificate = new Certificate(this, 'certificate', {
        certificateName: siteDomain, 
        domainName: props.domainName,
        subjectAlternativeNames: ['*.' + props.domainName],
        validation: CertificateValidation.fromDns(zone)
    });
  

    }
  }
  
  
  
  
