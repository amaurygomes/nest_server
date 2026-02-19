export interface CreateChargeDto {
  value: number;
  description?: string;
  customer: {
    name: string;
    email: string;
    document: string;
  };
}

export interface CreateChargeResponse {
  transactionId: string;
  status: string;
  paymentLink?: string;
  qrCode?: string;
  qrCodeImageBase64?: string;
}

export interface RefundDto {
  transactionId: string;
  e2eId: string;
  value: number;
}

export interface RefundResponse {
  refundId: string;
  status: string;
}

export interface IPaymentGateway {
  createCharge(data: CreateChargeDto): Promise<CreateChargeResponse>;
  refund(data: RefundDto): Promise<RefundResponse>;
}

export const PAYMENT_GATEWAY_TOKEN = 'PAYMENT_GATEWAY_SERVICE';
