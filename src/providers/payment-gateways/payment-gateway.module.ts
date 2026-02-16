import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_GATEWAY_TOKEN, IPaymentGateway } from './payment-gateway.interface';

import { EfiGatewayService } from './efi/efi-gateway.service';
import { EfiGatewayModuleOptions } from './efi/efi-gateway.types';

@Module({})
export class PaymentGatewayModule {
  static register(): DynamicModule {
    const gatewayFactoryProvider: Provider = {
      provide: PAYMENT_GATEWAY_TOKEN,
      useFactory: (
        configService: ConfigService,
        efiGatewayService: EfiGatewayService,
      ): IPaymentGateway => {
        const providerName = configService.get<string>('PAYMENT_GATEWAY_PROVIDER');

        switch (providerName?.toLowerCase()) {
          case 'efi':
            return efiGatewayService;
          // case 'stripe':
          //   return stripeGatewayService;
          default:
            throw new Error(`Payment gateway provider "${providerName}" is not supported.`);
        }
      },
      inject: [
        ConfigService,
        EfiGatewayService,
        // Adicionar outros serviços de gateway para injeção aqui
      ],
    };

    const createGatewayOptionsProvider = (provide: string, useFactory: (config: ConfigService) => any) => ({
      provide,
      useFactory,
      inject: [ConfigService],
    });

    return {
      module: PaymentGatewayModule,
      global: true,
      providers: [
        createGatewayOptionsProvider('EFI_GATEWAY_MODULE_OPTIONS', (config: ConfigService): EfiGatewayModuleOptions => ({
          clientId: config.getOrThrow<string>('EFI_CLIENT_ID'),
          clientSecret: config.getOrThrow<string>('EFI_CLIENT_SECRET'),
          pixCertPath: config.get<string>('EFI_PIX_CERT_PATH'),
          sandbox: config.get<string>('EFI_SANDBOX') === 'true',
        })),

        EfiGatewayService,
        gatewayFactoryProvider,
      ],
      exports: [PAYMENT_GATEWAY_TOKEN],
    };
  }
}
