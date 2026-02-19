import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import { accounts } from 'src/providers/database/drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    @Inject('DRIZZLE') private readonly db: DrizzleDb,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('Token not provided');
    const token = authHeader.split(' ')[1];

    const {
      data: { user: authUser },
      error,
    } = await this.supabase.auth.getUser(token);
    if (error || !authUser) throw new UnauthorizedException('Invalid token');

    const [account] = await this.db
      .select({
        id: accounts.id,
        role: accounts.role,
        cpf: accounts.cpf,
        email: accounts.email,
        machineId: accounts.machineId,
        vtrNumber: accounts.vtrNumber,
        status: accounts.status,
        name: accounts.name,
        vehicleType: accounts.vehicleType,
      })
      .from(accounts)
      .where(eq(accounts.authId, authUser.id));

    if (!account) {
      throw new UnauthorizedException('Account not linked to the system');
    }

    if (account.status === 'E') {
      throw new UnauthorizedException('Account is not active');
    }

    request.user = {
      accountId: account.id,
      role: account.role,
      authId: authUser.id,
      cpf: account.cpf,
      email: account.email,
      machineId: account.machineId,
      vtrNumber: account.vtrNumber,
      status: account.status,
      name: account.name,
      vehicleType: account.vehicleType,
    };

    return true;
  }
}
