import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { PasswordRequestDto } from './dto/pasword-request';
import { SignOutDto } from './dto/signout.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  signUp(@Body() request: SignUpDto) {
    return this.authService.signUp(request);
  }

  @Post('sign-in')
  signIn(@Body() request: SignInDto) {
    return this.authService.signIn(request);
  }

  @Post('sign-out')
  signOut(@Body() request: SignOutDto) {
    return this.authService.signOut(request);
  }

  @Post('password-request')
  passwordRequest(@Body() request: PasswordRequestDto) {
    return this.authService.passwordRequest(request)
  }

  @Post('update-password')
  updatePassword(@Body() request: UpdatePasswordDto) {
    return this.authService.updatePassword(request);
  }
}
