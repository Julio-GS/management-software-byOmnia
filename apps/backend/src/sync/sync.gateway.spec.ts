import { Test, TestingModule } from '@nestjs/testing';
import { SyncGateway } from './sync.gateway';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

describe('SyncGateway', () => {
  let gateway: SyncGateway;
  let jwtService: JwtService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const createMockSocket = (overrides = {}): Partial<Socket> => ({
    id: 'test-socket-id',
    handshake: {
      auth: {},
      headers: {},
      query: {},
      time: '',
      address: '',
      xdomain: false,
      secure: false,
      issued: 0,
      url: '',
    },
    data: {},
    emit: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    gateway = module.get<SyncGateway>(SyncGateway);
    jwtService = module.get<JwtService>(JwtService);

    // Mock the WebSocket server
    gateway.server = {
      emit: jest.fn(),
    } as any;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate client with JWT token from auth', async () => {
      const mockPayload = {
        sub: 'user-123',
        username: 'testuser',
        role: 'cashier',
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const client = createMockSocket({
        handshake: {
          auth: { token: 'valid-jwt-token' },
          headers: {},
          query: {},
        },
      });

      await gateway.handleConnection(client as Socket);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt-token');
      expect(client.data.user).toEqual({
        id: 'user-123',
        username: 'testuser',
        role: 'cashier',
      });
      expect(client.emit).toHaveBeenCalledWith('sync:status', {
        status: 'connected',
        timestamp: expect.any(String),
        message: 'Connected to sync server',
      });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should authenticate client with JWT token from authorization header', async () => {
      const mockPayload = {
        sub: 'user-456',
        username: 'admin',
        role: 'admin',
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const client = createMockSocket({
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-jwt-token' },
          query: {},
        },
      });

      await gateway.handleConnection(client as Socket);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('header-jwt-token');
      expect(client.data.user.username).toBe('admin');
    });

    it('should authenticate client with JWT token from query param', async () => {
      const mockPayload = {
        sub: 'user-789',
        username: 'manager',
        role: 'manager',
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const client = createMockSocket({
        handshake: {
          auth: {},
          headers: {},
          query: { token: 'query-jwt-token' },
        },
      });

      await gateway.handleConnection(client as Socket);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('query-jwt-token');
      expect(client.data.user.role).toBe('manager');
    });

    it('should disconnect client without token', async () => {
      const client = createMockSocket({
        handshake: {
          auth: {},
          headers: {},
          query: {},
        },
      });

      await gateway.handleConnection(client as Socket);

      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.data.user).toBeUndefined();
    });

    it('should disconnect client with invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const client = createMockSocket({
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {},
          query: {},
        },
      });

      await gateway.handleConnection(client as Socket);

      expect(client.emit).toHaveBeenCalledWith('sync:status', {
        status: 'error',
        message: 'Authentication failed',
      });
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnect with username', () => {
      const client = createMockSocket();
      client.data.user = { username: 'testuser' };

      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleDisconnect(client as Socket);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('testuser'),
      );
    });

    it('should handle disconnect for unauthenticated client', () => {
      const client = createMockSocket();
      client.data.user = undefined;

      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleDisconnect(client as Socket);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown'),
      );
    });
  });

  describe('emit events', () => {
    it('should emit product:created event', () => {
      const product = { id: 'prod-123', name: 'Test Product', price: 100 };

      gateway.emitProductCreated(product);

      expect(gateway.server.emit).toHaveBeenCalledWith('product:created', {
        timestamp: expect.any(String),
        data: product,
      });
    });

    it('should emit product:updated event', () => {
      const product = { id: 'prod-123', name: 'Updated Product', price: 150 };

      gateway.emitProductUpdated(product);

      expect(gateway.server.emit).toHaveBeenCalledWith('product:updated', {
        timestamp: expect.any(String),
        data: product,
      });
    });

    it('should emit product:deleted event', () => {
      const productId = 'prod-456';

      gateway.emitProductDeleted(productId);

      expect(gateway.server.emit).toHaveBeenCalledWith('product:deleted', {
        timestamp: expect.any(String),
        data: { id: productId },
      });
    });

    it('should emit category:updated event', () => {
      const category = { id: 'cat-123', name: 'Electronics', defaultMarkup: 30 };

      gateway.emitCategoryUpdated(category);

      expect(gateway.server.emit).toHaveBeenCalledWith('category:updated', {
        timestamp: expect.any(String),
        data: category,
      });
    });

    it('should emit inventory:movement event', () => {
      const movement = {
        id: 'mov-123',
        productId: 'prod-123',
        type: 'ENTRY',
        quantity: 50,
      };

      gateway.emitInventoryMovement(movement);

      expect(gateway.server.emit).toHaveBeenCalledWith('inventory:movement', {
        timestamp: expect.any(String),
        data: movement,
      });
    });

    it('should emit pricing:recalculated event for product', () => {
      const data = {
        type: 'product' as const,
        count: 1,
        id: 'prod-123',
      };

      gateway.emitPricingRecalculated(data);

      expect(gateway.server.emit).toHaveBeenCalledWith('pricing:recalculated', {
        timestamp: expect.any(String),
        data,
      });
    });

    it('should emit pricing:recalculated event for category', () => {
      const data = {
        type: 'category' as const,
        count: 15,
        id: 'cat-123',
      };

      gateway.emitPricingRecalculated(data);

      expect(gateway.server.emit).toHaveBeenCalledWith('pricing:recalculated', {
        timestamp: expect.any(String),
        data,
      });
    });

    it('should emit pricing:recalculated event for global', () => {
      const data = {
        type: 'global' as const,
        count: 50,
      };

      gateway.emitPricingRecalculated(data);

      expect(gateway.server.emit).toHaveBeenCalledWith('pricing:recalculated', {
        timestamp: expect.any(String),
        data,
      });
    });

    it('should emit sync:status event', () => {
      const status = {
        status: 'completed' as const,
        message: 'Sync finished',
        details: { count: 10 },
      };

      gateway.emitSyncStatus(status);

      expect(gateway.server.emit).toHaveBeenCalledWith('sync:status', {
        timestamp: expect.any(String),
        status: 'completed',
        message: 'Sync finished',
        details: { count: 10 },
      });
    });
  });

  describe('handlePing', () => {
    it('should respond to ping with pong', () => {
      const client = createMockSocket({ id: 'client-123' });

      const result = gateway.handlePing(client as Socket);

      expect(result).toEqual({
        event: 'pong',
        data: {
          timestamp: expect.any(String),
          clientId: 'client-123',
        },
      });
    });
  });

  describe('multiple clients', () => {
    it('should broadcast events to all connected clients', () => {
      // Verify that server.emit (not client.emit) is used
      // This broadcasts to ALL clients on the server

      const product = { id: 'prod-999' };
      gateway.emitProductCreated(product);

      expect(gateway.server.emit).toHaveBeenCalledWith(
        'product:created',
        expect.any(Object),
      );
      // In a real scenario, Socket.io will broadcast this to all connected clients
    });
  });
});
