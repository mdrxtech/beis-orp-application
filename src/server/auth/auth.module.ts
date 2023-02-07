import { Logger, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { PassportModule } from '@nestjs/passport';
import { SessionSerializer } from './session.serializer';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { JwtStrategy } from './jwt.strategy';
import { RegulatorService } from '../regulator/regulator.service';
import JwtRegulatorStrategy from './jwt-regulator.strategy';

@Module({
  imports: [PassportModule.register({ session: true })],
  providers: [
    AuthService,
    LocalStrategy,
    SessionSerializer,
    PrismaService,
    Logger,
    UserService,
    JwtStrategy,
    JwtRegulatorStrategy,
    RegulatorService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
