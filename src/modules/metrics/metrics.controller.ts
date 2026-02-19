
import { Controller, Get, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Metrics')
@Controller('metrics')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) { }

    @Get('dashboard')
    @ApiOperation({ summary: 'Get comprehensive admin dashboard metrics' })
    async getDashboardMetrics(@Req() req) {
        const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('You do not have permission to access metrics.');
        }

        const [financials, users, subscriptions, charts, topDrivers] = await Promise.all([
            this.metricsService.getFinancialMetrics(),
            this.metricsService.getUserMetrics(),
            this.metricsService.getSubscriptionMetrics(),
            this.metricsService.getRevenueChart(),
            this.metricsService.getTopDrivers(),
        ]);

        return {
            financials: {
                ...financials,
                topDrivers,
            },
            users,
            subscriptions,
            charts,
        };
    }
}
