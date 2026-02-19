
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { LogsService } from '../../modules/logs/logs.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly logsService: LogsService,
    ) { }

    async catch(exception: unknown, host: ArgumentsHost) {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();

        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.message
                : 'Internal server error';

        const stack = exception instanceof Error ? exception.stack : '';

        // Extract User ID if available (request.user injected by AuthGuard)
        const userId = request.user?.accountId || null;

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(request),
            message,
        };

        // Capture original error message for logging
        const originalMessage = exception instanceof Error ? exception.message : message;

        // Log to DB
        try {
            await this.logsService.logError({
                statusCode: httpStatus,
                message: originalMessage, // Log the REAL error
                stack,
                path: httpAdapter.getRequestUrl(request),
                method: httpAdapter.getRequestMethod(request),
                userId,
            });
        } catch (logError) {
            this.logger.error(`Failed to log error to DB: ${logError.message}`);
        }

        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
}
