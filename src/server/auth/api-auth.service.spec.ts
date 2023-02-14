import { Test, TestingModule } from '@nestjs/testing';
import { RegulatorService } from '../regulator/regulator.service';
import { ApiAuthService } from './api-auth.service';
import {
  DEFAULT_USER,
  DEFAULT_USER_WITH_REGULATOR,
} from '../../../test/mocks/prismaService.mock';
import { AuthService } from './auth.service';
import { mockLogger } from '../../../test/mocks/logger.mock';
import { mockConfigService } from '../../../test/mocks/config.mock';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_API_CREDENTIAL } from '../../../test/mocks/cognitoApiCred.mock';
import { mockTokens } from '../../../test/mocks/tokens.mock';

const mockCognito = {
  send: jest.fn().mockImplementation(() => 'COGNITO_RESPONSE'),
};
jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  return {
    AdminAddUserToGroupCommand: jest.fn((args) => ({
      ...args,
      adminAddUserToGroupCommand: true,
    })),
    AdminConfirmSignUpCommand: jest.fn((args) => ({
      ...args,
      adminConfirmSignUpCommand: true,
    })),
    AdminGetUserCommand: jest.fn((args) => ({
      ...args,
      adminGetUserCommand: true,
    })),
    AdminInitiateAuthCommand: jest.fn((args) => ({
      ...args,
      adminInitiateAuthCommand: true,
    })),
    CreateGroupCommand: jest.fn((args) => ({
      ...args,
      createGroupCommand: true,
    })),
    ListUsersInGroupCommand: jest.fn((args) => ({
      ...args,
      listUsersInGroupCommand: true,
    })),
    SignUpCommand: jest.fn((args) => ({ ...args, signUpCommand: true })),
    CognitoIdentityProviderClient: jest.fn(() => mockCognito),
  };
});

jest.mock('uuid', () => {
  return { v4: jest.fn(() => 'UUID') };
});
describe('ApiAuthService', () => {
  let service: ApiAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiAuthService,
        AuthService,
        mockConfigService,
        PrismaService,
        mockLogger,
        RegulatorService,
      ],
    }).compile();

    service = module.get<ApiAuthService>(ApiAuthService);

    jest.clearAllMocks();
  });

  describe('registerClient', () => {
    describe('regulator user', () => {
      it('should sign up the user and add to a group named by regulatorId', async () => {
        const result = await service.registerClient(
          DEFAULT_USER_WITH_REGULATOR,
        );

        expect(mockCognito.send).toBeCalledTimes(4);
        expect(mockCognito.send).toBeCalledWith({
          ClientId: 'apiClId',
          signUpCommand: true,
          Username: 'UUID',
          Password: 'UUID',
          UserAttributes: [{ Name: 'custom:regulator', Value: 'rid' }],
        });

        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          GroupName: 'rid',
          createGroupCommand: true,
        });

        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          Username: 'UUID',
          GroupName: 'rid',
          adminAddUserToGroupCommand: true,
        });

        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          Username: 'UUID',
          adminConfirmSignUpCommand: true,
        });

        expect(result).toEqual({ clientId: 'UUID', clientSecret: 'UUID' });
      });

      it('should add the client to the group if one already exists', async () => {
        mockCognito.send
          .mockResolvedValueOnce('COGNITO_RESPONSE')
          .mockRejectedValueOnce({ __type: 'GroupExistsException' })
          .mockResolvedValue('COGNITO_RESPONSE');

        const result = await service.registerClient(
          DEFAULT_USER_WITH_REGULATOR,
        );

        expect(mockCognito.send).toBeCalledTimes(4);
        expect(mockCognito.send).toBeCalledWith({
          ClientId: 'apiClId',
          signUpCommand: true,
          Username: 'UUID',
          Password: 'UUID',
          UserAttributes: [{ Name: 'custom:regulator', Value: 'rid' }],
        });

        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          GroupName: 'rid',
          createGroupCommand: true,
        });

        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          Username: 'UUID',
          GroupName: 'rid',
          adminAddUserToGroupCommand: true,
        });

        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          Username: 'UUID',
          adminConfirmSignUpCommand: true,
        });

        expect(result).toEqual({ clientId: 'UUID', clientSecret: 'UUID' });
      });
    });

    describe('non-regulator user', () => {
      it('should sign up the user and add to a group named by regulatorId', async () => {
        const result = await service.registerClient(DEFAULT_USER);

        expect(mockCognito.send).toBeCalledTimes(4);
        expect(mockCognito.send).toBeCalledWith({
          ClientId: 'apiClId',
          signUpCommand: true,
          Username: 'UUID',
          Password: 'UUID',
          UserAttributes: [],
        });

        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          GroupName: 'cogun',
          createGroupCommand: true,
        });

        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          Username: 'UUID',
          GroupName: 'cogun',
          adminAddUserToGroupCommand: true,
        });

        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          Username: 'UUID',
          adminConfirmSignUpCommand: true,
        });

        expect(result).toEqual({ clientId: 'UUID', clientSecret: 'UUID' });
      });
    });
  });

  describe('getApiClientsForUser', () => {
    describe('regulator user', () => {
      it('should get all clients in regulator group of user', async () => {
        const clientResponse = {
          Users: [DEFAULT_API_CREDENTIAL],
        };

        mockCognito.send.mockResolvedValueOnce(clientResponse);

        const result = await service.getApiClientsForUser(
          DEFAULT_USER_WITH_REGULATOR,
        );

        expect(mockCognito.send).toBeCalledTimes(1);
        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          listUsersInGroupCommand: true,
          GroupName: 'rid',
        });

        expect(result).toEqual([DEFAULT_API_CREDENTIAL]);
      });

      it('should return empty list of no group exists', async () => {
        mockCognito.send.mockRejectedValueOnce({
          __type: 'ResourceNotFoundException',
        });

        const result = await service.getApiClientsForUser(
          DEFAULT_USER_WITH_REGULATOR,
        );

        expect(mockCognito.send).toBeCalledTimes(1);
        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          listUsersInGroupCommand: true,
          GroupName: 'rid',
        });

        expect(result).toEqual([]);
      });
    });

    describe('non-regulator user', () => {
      it('should get all clients in userId group of user', async () => {
        const clientResponse = {
          Users: [DEFAULT_API_CREDENTIAL],
        };

        mockCognito.send.mockResolvedValueOnce(clientResponse);

        const result = await service.getApiClientsForUser(DEFAULT_USER);

        expect(mockCognito.send).toBeCalledTimes(1);
        expect(mockCognito.send).toBeCalledWith({
          UserPoolId: 'apiUpId',
          listUsersInGroupCommand: true,
          GroupName: 'cogun',
        });

        expect(result).toEqual([DEFAULT_API_CREDENTIAL]);
      });
    });
  });

  describe('authenticateApiClient', () => {
    it('should auth user in cognito and return tokens', async () => {
      mockCognito.send.mockResolvedValueOnce({
        AuthenticationResult: mockTokens,
      });

      const result = await service.authenticateApiClient({
        clientId: 'un',
        clientSecret: 'pw',
      });

      expect(mockCognito.send).toBeCalledTimes(1);
      expect(mockCognito.send).toBeCalledWith({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        ClientId: 'apiClId',
        UserPoolId: 'apiUpId',
        adminInitiateAuthCommand: true,
        AuthParameters: {
          USERNAME: 'un',
          PASSWORD: 'pw',
        },
      });

      expect(result).toEqual(mockTokens);
    });
  });

  describe('refreshApiUser', () => {
    it('should refresh tokens in cognito and return tokens', async () => {
      mockCognito.send.mockResolvedValueOnce({
        AuthenticationResult: mockTokens,
      });

      const result = await service.refreshApiUser('token');

      expect(mockCognito.send).toBeCalledTimes(1);
      expect(mockCognito.send).toBeCalledWith({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: 'apiClId',
        UserPoolId: 'apiUpId',
        adminInitiateAuthCommand: true,
        AuthParameters: {
          REFRESH_TOKEN: 'token',
        },
      });

      expect(result).toEqual(mockTokens);
    });
  });
});