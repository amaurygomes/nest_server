
import { Controller, Get, Query, UseGuards, Req, ForbiddenException, Put, Param, Body, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
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
    @ApiResponse({ status: 200, description: 'List of accounts retrieved successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden. Requires ADMIN or SUPPORT role.' })
    findAll(@Req() req, @Query() query: FindAccountQueryDto) {
        const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('You do not have permission to list accounts.');
        }

        return this.accountsService.findAll(query);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update account details (Admin only)' })
    @ApiResponse({ status: 200, description: 'Account updated successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden. Requires ADMIN role.' })
    @ApiResponse({ status: 404, description: 'Account not found.' })
    update(@Req() req, @Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
        const isPrivileged = ['OWNER', 'ADMIN'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('You do not have permission to update accounts.');
        }

        return this.accountsService.update({ id }, updateAccountDto);
    }

    @Delete(':id/anonymize')
    @ApiOperation({ summary: 'Anonymize user data (Right to be Forgotten - LGPD)' })
    @ApiResponse({ status: 200, description: 'User data anonymized successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden. Requires ADMIN role.' })
    @ApiResponse({ status: 404, description: 'Account not found.' })
    // @Roles('ADMIN', 'OWNER') // Or allow USER to self-delete if policy allows. For now ADMIN.
    async anonymize(@Req() req, @Param('id') id: string) {
        const isPrivileged = ['OWNER', 'ADMIN'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('You do not have permission to anonymize accounts.');
        }
        return this.accountsService.anonymize({ id });
    }
}
