import { Body, Controller, Get, Post, Put, Delete, Patch, Param, Req, UseGuards, ForbiddenException, Request, BadRequestException, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
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
    @ApiResponse({ status: 201, description: 'Plan created successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden. Admin Only.' })
    createPlan(@Request() req, @Body() createPlanDto: CreatePlanDto) {
        const isPrivileged = ['OWNER', 'ADMIN'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('User does not have permission to create plans');
        }
        return this.subscriptionsService.createPlan(createPlanDto);
    }

    @Get('plans')
    @ApiOperation({ summary: 'List all plans' })
    @ApiResponse({ status: 200, description: 'List of matching plans.' })
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

    @Put('plans/:id')
    @ApiOperation({ summary: 'Update plan details' })
    @ApiResponse({ status: 200, description: 'Plan updated successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden. Admin Only.' })
    @ApiResponse({ status: 404, description: 'Plan not found.' })
    updatePlan(@Request() req, @Param('id') id: string, @Body() updatePlanDto: CreatePlanDto) {
        const isPrivileged = ['OWNER', 'ADMIN'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('User does not have permission to update plans');
        }
        // Using CreatePlanDto as partial for update is acceptable for now, or defined distinct DTO.
        return this.subscriptionsService.updatePlan(id, updatePlanDto);
    }

    @Delete('plans/:id')
    @ApiOperation({ summary: 'Delete (Inactive) a plan' })
    @ApiResponse({ status: 200, description: 'Plan deleted successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden. Admin Only.' })
    @ApiResponse({ status: 404, description: 'Plan not found.' })
    deletePlan(@Request() req, @Param('id') id: string) {
        const isPrivileged = ['OWNER', 'ADMIN'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('User does not have permission to delete plans');
        }
        return this.subscriptionsService.deletePlan(id);
    }

    @Patch('plans/:id/reactivate')
    @ApiOperation({ summary: 'Reactivate a deleted plan' })
    @ApiResponse({ status: 200, description: 'Plan reactivated successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden. Admin Only.' })
    @ApiResponse({ status: 404, description: 'Plan not found.' })
    reactivatePlan(@Request() req, @Param('id') id: string) {
        const isPrivileged = ['OWNER', 'ADMIN'].includes(req.user.role);
        if (!isPrivileged) {
            throw new ForbiddenException('User does not have permission to reactivate plans');
        }
        return this.subscriptionsService.reactivatePlan(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create (subscribe) a user to a plan' })
    @ApiResponse({ status: 201, description: 'Subscription created (Pending Payment).' })
    @ApiResponse({ status: 400, description: 'Bad Request (User not eligible or Invalid data).' })
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
