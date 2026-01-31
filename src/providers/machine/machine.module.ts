import { Module } from '@nestjs/common';
import { MachineService } from './machine.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [MachineService],
  exports: [MachineService],
})
export class MachineModule {}
