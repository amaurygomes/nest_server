
import { Controller, Get, Query, UseGuards, Req, ForbiddenException, Put, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { AuthGuard } from '../auth/auth.guard';
import { FindAccountQueryDto } from './dto/find-account-query.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    @Get()
    @ApiOperation({ summary: 'List all accounts (Admin only)' })
    findAll(@Req() req, @Query() query: FindAccountQueryDto) {
        const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('You do not have permission to list accounts.');
        }

        return this.accountsService.findAll(query);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update account details (Admin only)' })
    update(@Req() req, @Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
        const isPrivileged = ['OWNER', 'ADMIN'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('You do not have permission to update accounts.');
        }

        return this.accountsService.update({ id }, updateAccountDto);
    }
}
