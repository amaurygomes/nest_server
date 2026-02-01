type PaymentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'APPROVED';
type PaymentMethod = 'PIX' | 'APPROVED';

export class Payment {
  id: string;
  accountId: string;
  amount: string;
  status: PaymentStatus;
  description?: string | null;
  transactionId: string;
  paymentDate?: Date | null;

  pixCopyPaste?: string | null;
  pixImageBase64?: string | null;

  paymentMethod: PaymentMethod | null;

  approvedAt?: Date | null;
  approvedBy?: string | null;
  refundedBy?: string | null;
  refundedAt?: Date | null;
  refundReason?: string | null;

  statusSyncAt: boolean;

  createdAt: Date;
  updatedAt: Date;
}
