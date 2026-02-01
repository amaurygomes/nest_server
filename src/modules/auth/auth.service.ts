import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
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

  async signUp(signUpDto: SignUpDto) {
    const accountEmail = await this.getAccountEmail(signUpDto.cpf);

    const { data, error } = await this.supabaseClient.auth.admin.createUser({
      email: accountEmail,
      password: signUpDto.password,
      email_confirm: true,
    });

    if (error) {
      throw new BadRequestException(`Sign-up failed: ${error.message}`);
    }

    if (!data.user || !data.user.id) {
      throw new InternalServerErrorException('User creation failed');
    }

    try {
      await this.accountsService.linkUserAccount({
        authId: data.user.id,
        cpf: signUpDto.cpf,
      });
    } catch (err) {
      await this.supabaseClient.auth.admin.deleteUser(data.user.id);
      throw new InternalServerErrorException('Failed to link user account');
    }

    return {
      message: 'User created and account linked successfully',
      authId: data.user.id,
    };
  }

  async signIn(signInDto: SignInDto) {
    const accountEmail = await this.getAccountEmail(signInDto.cpf);

    if (!accountEmail) {
      throw new NotFoundException('Account with provided CPF not found.');
    }

    const { data, error } = await this.supabaseClient.auth.signInWithPassword({
      email: accountEmail,
      password: signInDto.password,
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

  async signOut(signOutDto: SignOutDto) {
    const { error } = await this.supabaseClient.auth.admin.signOut(
      signOutDto.token,
    );

    if (error) {
      throw new BadRequestException(`Sign-out failed: ${error.message}`);
    }

    return { message: 'Signed out successfully' };
  }

  async passwordRequest(passwordRequestDto: PasswordRequestDto) {
    const { error } = await this.supabaseClient.auth.resetPasswordForEmail(
      passwordRequestDto.email,
    );

    if (error) {
      throw new InternalServerErrorException(
        `Reset password failed: ${error.message}`,
      );
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async updatePassword(updatePasswordDto: UpdatePasswordDto) {
    const { error } = await this.supabaseClient.auth.updateUser({
      password: updatePasswordDto.password,
    });

    if (error) {
      throw new InternalServerErrorException(
        `Update password failed: ${error.message}`,
      );
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
