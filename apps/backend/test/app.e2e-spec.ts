import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Dabbu API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('/api/v1');
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /api/v1/health should return 200', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
          expect(res.body.services).toBeDefined();
          expect(res.body.services.database).toBeDefined();
        });
    });
  });

  describe('Authentication', () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
    };

    let accessToken: string;
    let refreshToken: string;

    it('POST /api/v1/auth/register should create a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.data.user).toBeDefined();
          expect(res.body.data.user.email).toBe(testUser.email);
          expect(res.body.data.tokens).toBeDefined();
          accessToken = res.body.data.tokens.accessToken;
          refreshToken = res.body.data.tokens.refreshToken;
        });
    });

    it('POST /api/v1/auth/register with duplicate email should return 409', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('POST /api/v1/auth/login should authenticate user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.tokens.accessToken).toBeDefined();
          accessToken = res.body.data.tokens.accessToken;
        });
    });

    it('POST /api/v1/auth/login with wrong password should return 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword123!' })
        .expect(401);
    });

    it('GET /api/v1/auth/profile should return user profile', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.email).toBe(testUser.email);
        });
    });

    it('GET /api/v1/auth/profile without token should return 401', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('POST /api/v1/auth/refresh should refresh tokens', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.refreshToken).toBeDefined();
        });
    });

    it('POST /api/v1/auth/forgot-password should send reset email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);
    });
  });

  describe('Family', () => {
    let familyId: string;
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: `test-${Date.now() - 1000}@example.com`, password: 'TestPass123!' })
        .catch(() => null);

      if (res?.body?.data?.tokens?.accessToken) {
        accessToken = res.body.data.tokens.accessToken;
      }
    });

    it('POST /api/v1/family should create a family', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: `test-${Date.now() - 2000}@example.com`, password: 'TestPass123!' });

      if (loginRes.body.data?.tokens?.accessToken) {
        accessToken = loginRes.body.data.tokens.accessToken;
      }

      return request(app.getHttpServer())
        .post('/api/v1/family')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Family' })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.name).toBe('Test Family');
          familyId = res.body.data.id;
        });
    });
  });
});
