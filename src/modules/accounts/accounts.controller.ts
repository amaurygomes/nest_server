import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { RequestIdDto } from './dto/request-id.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Body() request: CreateAccountDto) {
    return this.accountsService.create(request);
  }

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') request: RequestIdDto) {
    return this.accountsService.findOne(request);
  }

  @Patch(':id')
  update(@Param('id') requestId: RequestIdDto, @Body() requestData: UpdateAccountDto) {
    return this.accountsService.update(requestId, requestData);
  }

  @Delete(':id')
  remove(@Param('id') id: RequestIdDto) {
    return this.accountsService.remove(id);
  }
}
