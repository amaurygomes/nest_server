export class AccountDto {
  id: string;
  name: string;
  email: string;
  chavePix: string;
  status: string;
  role: string;
  machineId: string;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}
