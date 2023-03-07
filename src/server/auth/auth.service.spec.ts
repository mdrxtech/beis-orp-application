import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { mockConfigService } from '../../../test/mocks/config.mock';
import { mockLogger } from '../../../test/mocks/logger.mock';
import { DEFAULT_REGULATOR, DEFAULT_USER } from '../../../test/mocks/user.mock';
import { AuthException } from './types/AuthException';
import { RegulatorService } from '../regulator/regulator.service';
import { COGNITO_SUCCESSFUL_RESPONSE_REGULATOR } from '../../../test/mocks/cognitoSuccessfulResponse';

const mockCognito = {
  send: jest.fn().mockImplementation(() => 'COGNITO_RESPONSE'),
};
jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  return {
    AdminDeleteUserCommand: jest.fn((args) => ({
      ...args,
      adminDeleteUserCommand: true,
    })),
    AdminInitiateAuthCommand: jest.fn((args) => ({
      ...args,
      adminInitiateAuthCommand: true,
    })),
    CognitoIdentityProviderClient: jest.fn(() => mockCognito),
    ConfirmForgotPasswordCommand: jest.fn((args) => ({
      ...args,
      confirmForgotPasswordCommand: true,
    })),
    ResendConfirmationCodeCommand: jest.fn((args) => ({
      ...args,
      resendConfirmationCodeCommand: true,
    })),
    SignUpCommand: jest.fn((args) => ({ ...args, signUpCommand: true })),
    ChangePasswordCommand: jest.fn((args) => ({
      ...args,
      changePasswordCommand: true,
    })),
    ForgotPasswordCommand: jest.fn((args) => ({
      ...args,
      forgotPasswordCommand: true,
    })),
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let regulatorService: RegulatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, mockConfigService, mockLogger, RegulatorService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    regulatorService = module.get<RegulatorService>(RegulatorService);

    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register the user with the cognito user pool', async () => {
      const user = {
        email: 'e@mail.com',
        password: 'pw',
        confirmPassword: 'pw',
      };
      await service.registerUser(user);
      expect(mockCognito.send).toBeCalledWith({
        ClientId: 'clid',
        signUpCommand: true,
        Username: user.email,
        Password: user.password,
      });
    });

    it('should throw AuthException if cognito errors', async () => {
      mockCognito.send.mockRejectedValueOnce({ __type: 'error' });

      const user = {
        email: 'ALREADY_IN_USE',
        password: 'pw',
        confirmPassword: 'pw',
      };
      await expect(
        async () => await service.registerUser(user),
      ).rejects.toBeInstanceOf(AuthException);
    });
  });

  describe('authenticateUser', () => {
    it('should call authenticateUser on congnitoUser and return user if success', async () => {
      mockCognito.send.mockResolvedValueOnce(
        COGNITO_SUCCESSFUL_RESPONSE_REGULATOR,
      );

      jest
        .spyOn(regulatorService, 'getRegulatorByEmail')
        .mockReturnValue(DEFAULT_REGULATOR);

      const user = {
        email: 'e@mail.com',
        password: 'pw',
      };

      const result = await service.authenticateUser(user);
      expect(mockCognito.send).toBeCalledWith({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        ClientId: 'clid',
        UserPoolId: 'upid',
        AuthParameters: {
          USERNAME: user.email,
          PASSWORD: user.password,
        },
        adminInitiateAuthCommand: true,
      });
      expect(result).toMatchObject({
        email: 'e@mail.com',
        regulator: DEFAULT_REGULATOR,
      });
    });

    it('should throw authError if rejected', async () => {
      const user = {
        email: 'e@mail.com',
        password: 'pw',
      };
      mockCognito.send.mockRejectedValueOnce({
        __type: 'NotAuthorizedException',
      });

      return expect(service.authenticateUser(user)).rejects.toBeInstanceOf(
        AuthException,
      );
    });
  });

  describe('resendConfirmationCode', () => {
    it('should call resendConfirmationCode on congnitoUser and return user if success', async () => {
      const result = await service.resendConfirmationCode('e@mail.com');
      expect(mockCognito.send).toBeCalledWith({
        ClientId: 'clid',
        Username: 'e@mail.com',
        resendConfirmationCodeCommand: true,
      });
      expect(result).toEqual('COGNITO_RESPONSE');
    });

    it('should throw authError if rejected', () => {
      mockCognito.send.mockRejectedValueOnce({
        __type: 'Error',
      });

      return expect(
        async () => await service.resendConfirmationCode('e@mail.com'),
      ).rejects.toBeInstanceOf(AuthException);
    });
  });

  describe('resetPassword', () => {
    it('should use ChangePasswordCommand and return result if success', async () => {
      const result = await service.resetPassword(DEFAULT_USER, {
        previousPassword: 'opw',
        newPassword: 'mpw',
        confirmPassword: 'mpw',
      });
      expect(mockCognito.send).toBeCalledWith({
        AccessToken: 'token',
        PreviousPassword: 'opw',
        ProposedPassword: 'mpw',
        changePasswordCommand: true,
      });
      expect(result).toEqual('COGNITO_RESPONSE');
    });

    it('should throw if rejected', () => {
      mockCognito.send.mockRejectedValueOnce({
        __type: 'Error',
      });

      return expect(
        service.resetPassword(DEFAULT_USER, {
          previousPassword: 'opw',
          newPassword: 'mpw',
          confirmPassword: 'mpw',
        }),
      ).rejects.toBeInstanceOf(AuthException);
    });
  });

  describe('deleteUser', () => {
    it('should delete the user from the cognito user pool and from db', async () => {
      await service.deleteUser(DEFAULT_USER);
      expect(mockCognito.send).toBeCalledWith({
        UserPoolId: 'upid',
        Username: DEFAULT_USER.email,
        adminDeleteUserCommand: true,
      });
    });

    it('should throw AuthException if cognito errors', async () => {
      mockCognito.send.mockRejectedValueOnce({ __type: 'error' });

      await expect(
        async () => await service.deleteUser(DEFAULT_USER),
      ).rejects.toBeInstanceOf(AuthException);
    });
  });

  describe('startForgotPassword', () => {
    it('should use ForgotPasswordCommand and return result if success', async () => {
      const result = await service.startForgotPassword(DEFAULT_USER.email);
      expect(mockCognito.send).toBeCalledWith({
        ClientId: 'clid',
        Username: DEFAULT_USER.email,
        forgotPasswordCommand: true,
      });
      expect(result).toEqual('COGNITO_RESPONSE');
    });

    it('should throw if rejected', async () => {
      mockCognito.send.mockRejectedValueOnce({
        __type: 'Error',
      });

      await expect(
        async () => await service.startForgotPassword(DEFAULT_USER.email),
      ).rejects.toBeInstanceOf(AuthException);
    });
  });

  describe('confirmForgotPassword', () => {
    it('should use ConfirmForgotPasswordCommand and return result if success', async () => {
      const result = await service.confirmForgotPassword({
        verificationCode: 'code',
        email: DEFAULT_USER.email,
        newPassword: 'pw',
        confirmPassword: 'pw',
      });
      expect(mockCognito.send).toBeCalledWith({
        ClientId: 'clid',
        ConfirmationCode: 'code',
        Username: DEFAULT_USER.email,
        Password: 'pw',
        confirmForgotPasswordCommand: true,
      });
      expect(result).toEqual('COGNITO_RESPONSE');
    });

    it('should throw if rejected', async () => {
      mockCognito.send.mockRejectedValueOnce({
        __type: 'Error',
      });

      await expect(
        async () =>
          await service.confirmForgotPassword({
            verificationCode: 'code',
            email: DEFAULT_USER.email,
            newPassword: 'pw',
            confirmPassword: 'pw',
          }),
      ).rejects.toBeInstanceOf(AuthException);
    });
  });
});
