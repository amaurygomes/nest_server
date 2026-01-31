import { 
  Inject, 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  UnauthorizedException,
  InternalServerErrorException 
} from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { PasswordRequestDto } from './dto/pasword-request';
import { SupabaseClient } from '@supabase/supabase-js';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import { accounts } from 'src/providers/database/drizzle/schema';
import { eq } from 'drizzle-orm';
import { SignOutDto } from './dto/signout.dto';
import { AccountsService } from '../accounts/accounts.service';
import { access } from 'fs';
import e from 'express';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('DRIZZLE') private readonly db: DrizzleDb,
    @Inject('SUPABASE_CLIENT') private readonly supabaseClient: SupabaseClient,
    private readonly accountsService: AccountsService,
  ) {}

  async signUp(request: SignUpDto) {
    const accountEmail = await this.getAccountEmail(request.cpf);

    const { data, error } = await this.supabaseClient.auth.admin.createUser({
      email: accountEmail,
      password: request.password,
      email_confirm: true,
    });
    
    if (error) {
      throw new BadRequestException(`Sign-up failed: ${error.message}`);
    }

    if (!data.user || !data.user.id) {
      throw new InternalServerErrorException('User creation failed');
    }


    try{
      await this.accountsService.linkUserAccount({
        authId: data.user.id,
        cpf: request.cpf,
      });
    }catch(err){
      await this.supabaseClient.auth.admin.deleteUser(data.user.id);
      throw new InternalServerErrorException('Failed to link user account');
    } 

    return {
      message: 'User created and account linked successfully',
      authId: data.user.id,

    };
  }

  async signIn(request: SignInDto) {
    const accountEmail = await this.getAccountEmail(request.cpf);

    if (!accountEmail) {
      throw new NotFoundException('Account with provided CPF not found.');
    }

    const { data, error } = await this.supabaseClient.auth.signInWithPassword({
      email: accountEmail,
      password: request.password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      message: 'Signed in successfully',
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
      user: {
        authId: data.user.id,
        email: data.user.email,
      },
    };
  }

  async signOut(request: SignOutDto) {
    const { error } = await this.supabaseClient.auth.admin.signOut(request.token);
    
    if (error) {
      throw new BadRequestException(`Sign-out failed: ${error.message}`);
    }

    return { message: 'Signed out successfully' };
  }

  async passwordRequest(request: PasswordRequestDto) {
    const { error } = await this.supabaseClient.auth.resetPasswordForEmail(request.email);
    
    if (error) {
      throw new InternalServerErrorException(`Reset password failed: ${error.message}`);
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async updatePassword(request: UpdatePasswordDto) {
    const { error } = await this.supabaseClient.auth.updateUser({
      password: request.password
    });

    if (error) {
      throw new InternalServerErrorException(`Update password failed: ${error.message}`);
    }

    return { message: 'Password updated successfully' };
  }

  async getAccountEmail(cpf: string): Promise<string> {
    const res = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.cpf, cpf));

    const accountEmail = res[0]?.email;

    if (!accountEmail) {
      throw new NotFoundException('Account with provided CPF not found.');
    }
    
    return accountEmail;
  }
}