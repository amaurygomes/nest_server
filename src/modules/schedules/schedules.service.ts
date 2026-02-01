import { Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { MachineService } from 'src/providers/machine/machine.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly machineService: MachineService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSyncAccounts() {
    const accountsToSync = await this.machineService.mapAccounts();
    if (!accountsToSync.length) return;

    const formattedData = accountsToSync.map((acc) => ({
      machineId: acc.id,
      cpf: acc.cpf,
      name: acc.nome,
      vtrNumber: acc.numero_viatura || '',
      email: acc.email || '',
      status: 'A',
      role: 'USER',
    }));

    const chunkSize = 500;
    for (let i = 0; i < formattedData.length; i += chunkSize) {
      const chunk = formattedData.slice(i, i + chunkSize);

      try {
        await this.accountsService.bulkCreate(chunk);
      } catch (error) {
        console.error('Failed to process specific batch:', error);
      }
    }
  }
}
