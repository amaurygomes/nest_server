import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { PasswordRequestDto } from './dto/pasword-request';
import { SignOutDto } from './dto/signout.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @ApiOperation({
    summary: 'Register new account',
    description:
      'Creates a new account in the system and links it with Supabase Auth.',
  })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('sign-in')
  @ApiOperation({
    summary: 'Login to system',
    description:
      'Authenticates user via CPF and password, returning a JWT session token.',
  })
  @ApiResponse({ status: 200, description: 'Authenticated successfully.' })
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @ApiBearerAuth()
  @Post('sign-out')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidates the current session token.',
  })
  signOut(@Body() signOutDto: SignOutDto) {
    return this.authService.signOut(signOutDto);
  }

  @Post('password-request')
  @ApiOperation({
    summary: 'Request reset link',
    description:
      'Sends a password recovery email if the provided email exists in our records.',
  })
  passwordRequest(@Body() passwordRequestDto: PasswordRequestDto) {
    return this.authService.passwordRequest(passwordRequestDto);
  }

  @Post('update-password')
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Updates the user password using the token received in the recovery email.',
  })
  updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    return this.authService.updatePassword(updatePasswordDto);
  }
}
