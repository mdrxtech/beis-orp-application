import { CORRECT_EMAIL, CORRECT_PW, E2eFixture } from '../e2e.fixture';
import * as cheerio from 'cheerio';

const mockCogUserPool = {
  signUp: (email, password, userAttributes, validationData, callback) =>
    callback(undefined, { user: 'USER_MOCK' }),
};

const mockCogUser = {
  authenticateUser: (authDetails, callbacks) => callbacks.onSuccess(),
};

jest.mock('amazon-cognito-identity-js', () => {
  return {
    CognitoUserPool: jest.fn(() => mockCogUserPool),
    AuthenticationDetails: jest.fn((args) => args),
    CognitoUser: jest.fn(() => mockCogUser),
  };
});
describe('AuthController (e2e)', () => {
  const fixture = new E2eFixture();

  beforeEach(async () => {
    await fixture.init();
  });

  describe('auth/login (GET)', () => {
    it('displays login form', () => {
      return fixture
        .request()
        .get('/auth/login')
        .expect(200)
        .expect((res) => {
          const $ = cheerio.load(res.text);
          expect($("form[method='post'] > input[name='email']")).toBeTruthy();
          expect(
            $("form[method='post'] > input[name='password']"),
          ).toBeTruthy();
        });
    });
  });

  describe('auth/login (POST)', () => {
    it('redirects back if no password', () => {
      return fixture
        .request()
        .post('/auth/login')
        .send({ email: CORRECT_EMAIL, password: '' })
        .expect(302)
        .expect('Location', '/auth/login');
    });

    it('redirects back if no email', () => {
      return fixture
        .request()
        .post('/auth/login')
        .send({ email: '', password: CORRECT_PW })
        .expect(302)
        .expect('Location', '/auth/login');
    });

    it('redirects back to search if successful', () => {
      return fixture
        .request()
        .post('/auth/login')
        .send({ email: CORRECT_EMAIL, password: CORRECT_PW })
        .expect(302)
        .expect('Location', '/search');
    });

    it('redirects back if unsuccessful', () => {
      return fixture
        .request()
        .post('/auth/login')
        .send({ email: CORRECT_EMAIL, password: 'WRONG' })
        .expect(302)
        .expect('Location', '/auth/login');
    });
  });
});