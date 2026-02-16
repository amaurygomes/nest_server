import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_GATEWAY_TOKEN, IPaymentGateway } from './payment-gateway.interface';

// Importa implementações específicas de gateway
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
        // Injetar outros serviços de gateway aqui quando adicioná-los (ex: stripeGatewayService)
      ): IPaymentGateway => {
        const providerName = configService.get<string>('PAYMENT_GATEWAY_PROVIDER');

        switch (providerName?.toLowerCase()) {
          case 'efi':
            return efiGatewayService;
          // case 'stripe':
          //   return stripeGatewayService;
          default:
            throw new Error(`Gateway de pagamento "${providerName}" não é suportado.`);
        }
      },
      inject: [
        ConfigService,
        EfiGatewayService,
        // Adicionar outros serviços de gateway para injeção aqui
      ],
    };

    // Função auxiliar para criar um provedor de opções para um gateway específico
    const createGatewayOptionsProvider = (provide: string, useFactory: (config: ConfigService) => any) => ({
      provide,
      useFactory,
      inject: [ConfigService],
    });

    return {
      module: PaymentGatewayModule,
      // Torna o módulo global para que o PAYMENT_GATEWAY_TOKEN esteja disponível em toda a aplicação
      global: true,
      providers: [
        // Cria provedores para as opções de cada gateway
        createGatewayOptionsProvider('EFI_GATEWAY_MODULE_OPTIONS', (config: ConfigService): EfiGatewayModuleOptions => ({
          clientId: config.get<string>('EFI_CLIENT_ID'),
          clientSecret: config.get<string>('EFI_CLIENT_SECRET'),
          pixCertPath: config.get<string>('EFI_PIX_CERT_PATH'),
          sandbox: config.get<string>('EFI_SANDBOX') === 'true',
        })),
        // ...adicionar provedores de opções para outros gateways aqui

        // Fornece as implementações reais dos serviços de gateway
        EfiGatewayService,
        // ...adicionar outros serviços de gateway aqui

        // O provedor de fábrica principal que seleciona o gateway ativo
        gatewayFactoryProvider,
      ],
      exports: [PAYMENT_GATEWAY_TOKEN], // Exporta o token para que ele possa ser injetado em outros módulos
    };
  }
}
