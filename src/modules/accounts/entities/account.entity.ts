export class Account {
  id: string;
  authId?: string | null;
  machineId: string;
  cpf: string;
  name: string;
  vtrNumber: string;
  email: string;
  chavePix?: string | null;
  status: 'A' | 'I' | 'E';
  role: 'OWNER' | 'ADMIN' | 'USER' | 'SUPPORT';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}