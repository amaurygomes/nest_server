import { Body, Controller, Get, Post, Req, UseGuards, ForbiddenException, Request, BadRequestException, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class SubscriptionsController {
    constructor(private readonly subscriptionsService: SubscriptionsService) { }

    @Post('plans')
    @ApiOperation({ summary: 'Create a new plan' })
    createPlan(@Request() req, @Body() createPlanDto: CreatePlanDto) {
        const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('User does not have permission to create plans');
        }
        return this.subscriptionsService.createPlan(createPlanDto);
    }

    @Get('plans')
    @ApiOperation({ summary: 'List all plans' })
    findAllPlans(@Req() req, @Query('vehicleType') queryVehicleType?: string) {
        const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);

        if (isPrivileged) {
            // Admin sees ALL if no query param, or filters by query param.
            // We pass 'true' for showAllIfNoType if vehicleType is undefined.
            // If vehicleType IS defined, we filter by it (and it's not showAll).
            return this.subscriptionsService.findAllPlans(queryVehicleType, !queryVehicleType);
        }

        // Regular user: Always filter by their own vehicle type.
        return this.subscriptionsService.findAllPlans(req.user?.vehicleType);
    }

    @Post()
    @ApiOperation({ summary: 'Create (subscribe) a user to a plan' })
    createSubscription(@Request() req, @Body() createSubscriptionDto: CreateSubscriptionDto) {
        const { accountId } = req.user;
        const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);

        if (isPrivileged && !createSubscriptionDto.accountId) {
            throw new BadRequestException('AccountId not provided for privileged user');
        }

        const data: CreateSubscriptionDto = {
            ...createSubscriptionDto,
            accountId: isPrivileged ? createSubscriptionDto.accountId : accountId,
        };

        return this.subscriptionsService.createSubscription(data);
    }

    // @Get('my')
    // @ApiOperation({ summary: 'Get my subscription' })
    // findMy(@Req() req) {
    //   // Assuming req.user is populated by AuthGuard
    //   // return this.subscriptionsService.findMySubscription(req.user.sub);
    // }
}
