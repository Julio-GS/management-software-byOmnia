import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Sales E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let accessToken: string;
  let testUser: any;
  let testProduct: any;
  let createdSaleIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'cashier',
        isActive: true,
      },
    });

    // Generate valid JWT token
    accessToken = await jwtService.signAsync(
      {
        sub: testUser.id,
        email: testUser.email,
        role: testUser.role,
      },
      {
        secret: process.env.JWT_SECRET || 'test-secret',
        expiresIn: '1h',
      },
    );

    // Create test product with stock
    const category = await prisma.category.findFirst();
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product E2E',
        sku: `TEST-SKU-${Date.now()}`,
        price: 100,
        cost: 50,
        stock: 50,
        isActive: true,
        ...(category && { category: { connect: { id: category.id } } }),
        taxRate: 0,
      },
    });
  });

  afterAll(async () => {
    // Cleanup: delete all created sales
    if (createdSaleIds.length > 0) {
      await prisma.saleItem.deleteMany({
        where: {
          saleId: {
            in: createdSaleIds,
          },
        },
      });
      await prisma.sale.deleteMany({
        where: {
          id: {
            in: createdSaleIds,
          },
        },
      });
    }

    // Cleanup test product and user
    if (testProduct) {
      await prisma.product.delete({ where: { id: testProduct.id } });
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }

    await app.close();
  });

  afterEach(() => {
    // Clear created IDs after each test for cleanup
    createdSaleIds = [];
  });

  describe('POST /sales', () => {
    it('should create a sale with valid payload and return 201', async () => {
      const createSaleDto = {
        paymentMethod: 'cash',
        items: [
          {
            productId: testProduct.id,
            quantity: 2,
            unitPrice: testProduct.price,
          },
        ],
        cashierId: testUser.id,
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createSaleDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('saleNumber');
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.status).toBe('COMPLETED');

      // Store for cleanup
      createdSaleIds.push(response.body.id);
    });

    it('should return 401 Unauthorized without auth token', async () => {
      const createSaleDto = {
        paymentMethod: 'cash',
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unitPrice: testProduct.price,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/sales')
        .send(createSaleDto)
        .expect(401);
    });

    it('should return 400 Bad Request with invalid payload (missing items)', async () => {
      const invalidDto = {
        paymentMethod: 'cash',
        // items missing
      };

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 Bad Request with empty items array', async () => {
      const invalidDto = {
        paymentMethod: 'cash',
        items: [],
      };

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /sales', () => {
    it('should return array of sales with valid auth', async () => {
      // Create a sale first
      const createSaleDto = {
        paymentMethod: 'card',
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unitPrice: testProduct.price,
          },
        ],
        cashierId: testUser.id,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createSaleDto)
        .expect(201);

      createdSaleIds.push(createResponse.body.id);

      // Fetch all sales
      const response = await request(app.getHttpServer())
        .get('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 401 Unauthorized without auth token', async () => {
      await request(app.getHttpServer())
        .get('/sales')
        .expect(401);
    });
  });

  describe('GET /sales/:id', () => {
    it('should return sale details with valid ID', async () => {
      // Create a sale first
      const createSaleDto = {
        paymentMethod: 'transfer',
        items: [
          {
            productId: testProduct.id,
            quantity: 3,
            unitPrice: testProduct.price,
          },
        ],
        cashierId: testUser.id,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createSaleDto)
        .expect(201);

      createdSaleIds.push(createResponse.body.id);

      // Fetch by ID
      const response = await request(app.getHttpServer())
        .get(`/sales/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createResponse.body.id);
      expect(response.body.saleNumber).toBe(createResponse.body.saleNumber);
    });

    it('should return 404 Not Found with invalid ID', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/sales/${invalidId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 Unauthorized without auth token', async () => {
      await request(app.getHttpServer())
        .get('/sales/some-id')
        .expect(401);
    });
  });

  describe('PATCH /sales/:id/cancel', () => {
    it('should cancel a sale and return 200 OK', async () => {
      // Create a sale first
      const createSaleDto = {
        paymentMethod: 'cash',
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unitPrice: testProduct.price,
          },
        ],
        cashierId: testUser.id,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createSaleDto)
        .expect(201);

      createdSaleIds.push(createResponse.body.id);

      // Cancel the sale
      const response = await request(app.getHttpServer())
        .patch(`/sales/${createResponse.body.id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Test cancellation' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });

    it('should return 404 Not Found when cancelling non-existent sale', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/sales/${invalidId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Test' })
        .expect(404);
    });

    it('should return 401 Unauthorized without auth token', async () => {
      await request(app.getHttpServer())
        .patch('/sales/some-id/cancel')
        .send({ reason: 'Test' })
        .expect(401);
    });
  });
});
