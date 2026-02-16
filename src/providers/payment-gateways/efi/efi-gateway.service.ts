import { Injectable, Inject, Logger } from '@nestjs/common';
import EfiPay from 'sdk-typescript-apis-efi';
import {
  IPaymentGateway,
  CreateChargeDto,
  CreateChargeResponse,
  RefundDto,
  RefundResponse,
} from '../payment-gateway.interface';
import type { EfiGatewayModuleOptions } from './efi-gateway.types'; 

@Injectable()
export class EfiGatewayService implements IPaymentGateway {
  private readonly efi: any;
  private readonly logger = new Logger(EfiGatewayService.name);

  constructor(
    @Inject('EFI_GATEWAY_MODULE_OPTIONS') private options: EfiGatewayModuleOptions,
  ) {
    const config: any = {
      client_id: options.clientId,
      client_secret: options.clientSecret,
      sandbox: options.sandbox || false,
    };

    if (options.pixCertPath) {
      config.pix_cert = options.pixCertPath;
    }

    this.efi = new EfiPay(config);
    this.logger.log('EfiGatewayService initialized.');
  }

  async createCharge(data: CreateChargeDto): Promise<CreateChargeResponse> {
    this.logger.debug('EfiGateway: Creating charge with data:', data);
    try {

      const efiChargeData = {
        calendario: {
          expiracao: 3600,
        },
        devedor: {
          cpf: data.customer.document,
          nome: data.customer.name,
        },
        valor: {
          original: (data.value / 100).toFixed(2),
        },
        chave: process.env.EFI_PIX_KEY,
        solicitacaoPagador: data.description || 'Pagamento de serviço',
      };

      
      const chargeResponse = await this.efi.pixCreateImmediateCharge({}, efiChargeData);
      
      const qrCodeResponse = await this.efi.pixGenerateQRCode({ id: chargeResponse.loc.id });

      this.logger.log('EfiGateway: Cobrança Pix criada com sucesso.');

      return {
        transactionId: chargeResponse.txid,
        status: chargeResponse.status,
        qrCode: qrCodeResponse.qrcode,
        paymentLink: qrCodeResponse.imagemQrcode,
      };
    } catch (error) {
      this.logger.error('EfiGateway: Erro ao criar cobrança Pix:', error?.response?.data || error.message);
      throw error;
    }
  }

  async refund(data: RefundDto): Promise<RefundResponse> {
    const { transactionId, value } = data;
    this.logger.debug(`EfiGateway: Efetuando devolução para txid ${transactionId} com valor ${value}`);
    try {
      
      const params = {
        e2eId: 'E2E_ID_DA_TRANSACAO_ORIGINAL',
        id: transactionId,
      };

      const body: { valor?: string } = {}; // Inicializa como objeto vazio
      if (value !== undefined) {
        body.valor = (value / 100).toFixed(2);
      }

      const refundResponse = await this.efi.pixDevolution(params, body);

      this.logger.log(`EfiGateway: Devolução iniciada para a transação ${transactionId}.`);
      
      return {
        refundId: refundResponse.rtrId,
        status: refundResponse.status,
      };
    } catch (error) {
      this.logger.error(`EfiGateway: Erro na devolução da transação ${transactionId}:`, error?.response?.data || error.message);
      throw error;
    }
  }
}
