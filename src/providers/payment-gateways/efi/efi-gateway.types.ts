export interface EfiGatewayModuleOptions {
  clientId: string;
  clientSecret: string;
  pixCertPath?: string; // Optional path to .p12 certificate for Pix
  sandbox?: boolean; // Optional, defaults to false (production)
}
