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
import { LogsService } from '../logs/logs.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('DRIZZLE') private readonly db: DrizzleDb,
    @Inject('SUPABASE_CLIENT') private readonly supabaseClient: SupabaseClient,
    private readonly accountsService: AccountsService,
    private readonly logsService: LogsService,
  ) { }

  /**
   * Registers a new user and links to an existing account.
   */
  async signUp(signUpDto: SignUpDto) {
    const account = await this.getAccountBasicInfo(signUpDto.cpf);

    const { data, error } = await this.supabaseClient.auth.admin.createUser({
      email: account.email,
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
        vehicleType: signUpDto.vehicleType,
        termsAccepted: signUpDto.termsAccepted,
      });
    } catch (err) {
      await this.supabaseClient.auth.admin.deleteUser(data.user.id);
      throw new InternalServerErrorException('Failed to link user account');
    }

    // Log Signup
    await this.logsService.logUserAction(
      account.id,
      'SIGN_UP',
      `User signed up with CPF ${signUpDto.cpf}`
    );

    return {
      message: 'User created and account linked successfully',
      authId: data.user.id,
    };
  }

  /**
   * Authenticates a user.
   */
  async signIn(signInDto: SignInDto) {
    const account = await this.getAccountBasicInfo(signInDto.cpf);

    const { data, error } = await this.supabaseClient.auth.signInWithPassword({
      email: account.email,
      password: signInDto.password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Log Login
    await this.logsService.logUserAction(
      account.id,
      'LOGIN',
      `User logged in`
    );

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

  /**
   * Signs out a user (invalidates session).
   * @param signOutDto - Token to invalidate.
   */
  async signOut(signOutDto: SignOutDto) {
    const { error } = await this.supabaseClient.auth.admin.signOut(
      signOutDto.token,
    );

    if (error) {
      throw new BadRequestException(`Sign-out failed: ${error.message}`);
    }

    return { message: 'Signed out successfully' };
  }

  /**
   * Requests a password reset email.
   * @param passwordRequestDto - Email address.
   */
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

  /**
   * Updates the authenticated user's password.
   * @param updatePasswordDto - New password.
   */
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

  /**
   * Retrieves basic account info (ID, Email) by CPF.
   * @param cpf - User CPF.
   */
  async getAccountBasicInfo(cpf: string): Promise<{ id: string; email: string }> {
    const res = await this.db
      .select({
        id: accounts.id,
        email: accounts.email,
      })
      .from(accounts)
      .where(eq(accounts.cpf, cpf));

    const account = res[0];

    if (!account) {
      throw new NotFoundException('Account with provided CPF not found.');
    }

    return account;
  }
}
