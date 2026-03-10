import { handleOnlineOffline } from '../offline-adapter';
import { syncService } from '../../sync/sync-service';

// Mock syncService
jest.mock('../../sync/sync-service', () => ({
  syncService: {
    getOnlineStatus: jest.fn(),
  },
}));

// Mock logger
jest.mock('../logger', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('offline-adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleOnlineOffline', () => {
    it('should call online handler when online', async () => {
      // Arrange
      (syncService.getOnlineStatus as jest.Mock).mockReturnValue(true);
      const onlineHandler = jest.fn().mockResolvedValue('online result');
      const offlineHandler = jest.fn().mockResolvedValue('offline result');

      // Act
      const result = await handleOnlineOffline(onlineHandler, offlineHandler);

      // Assert
      expect(result).toBe('online result');
      expect(onlineHandler).toHaveBeenCalledTimes(1);
      expect(offlineHandler).not.toHaveBeenCalled();
    });

    it('should call offline handler when offline', async () => {
      // Arrange
      (syncService.getOnlineStatus as jest.Mock).mockReturnValue(false);
      const onlineHandler = jest.fn().mockResolvedValue('online result');
      const offlineHandler = jest.fn().mockResolvedValue('offline result');

      // Act
      const result = await handleOnlineOffline(onlineHandler, offlineHandler);

      // Assert
      expect(result).toBe('offline result');
      expect(offlineHandler).toHaveBeenCalledTimes(1);
      expect(onlineHandler).not.toHaveBeenCalled();
    });

    it('should call offline handler when forceOffline is true', async () => {
      // Arrange
      (syncService.getOnlineStatus as jest.Mock).mockReturnValue(true);
      const onlineHandler = jest.fn().mockResolvedValue('online result');
      const offlineHandler = jest.fn().mockResolvedValue('offline result');

      // Act
      const result = await handleOnlineOffline(onlineHandler, offlineHandler, {
        forceOffline: true,
      });

      // Assert
      expect(result).toBe('offline result');
      expect(offlineHandler).toHaveBeenCalledTimes(1);
      expect(onlineHandler).not.toHaveBeenCalled();
    });

    it('should fallback to offline handler if online handler fails', async () => {
      // Arrange
      (syncService.getOnlineStatus as jest.Mock).mockReturnValue(true);
      const onlineError = new Error('Network error');
      const onlineHandler = jest.fn().mockRejectedValue(onlineError);
      const offlineHandler = jest.fn().mockResolvedValue('offline result');

      // Act
      const result = await handleOnlineOffline(onlineHandler, offlineHandler, {
        logFallback: true,
      });

      // Assert
      expect(result).toBe('offline result');
      expect(onlineHandler).toHaveBeenCalledTimes(1);
      expect(offlineHandler).toHaveBeenCalledTimes(1);
    });

    it('should propagate offline handler error if both fail', async () => {
      // Arrange
      (syncService.getOnlineStatus as jest.Mock).mockReturnValue(true);
      const onlineError = new Error('Network error');
      const offlineError = new Error('Database error');
      const onlineHandler = jest.fn().mockRejectedValue(onlineError);
      const offlineHandler = jest.fn().mockRejectedValue(offlineError);

      // Act & Assert
      await expect(
        handleOnlineOffline(onlineHandler, offlineHandler)
      ).rejects.toThrow('Database error');
    });

    it('should work with different return types', async () => {
      // Arrange
      (syncService.getOnlineStatus as jest.Mock).mockReturnValue(true);
      const complexResult = { data: [1, 2, 3], meta: { count: 3 } };
      const onlineHandler = jest.fn().mockResolvedValue(complexResult);
      const offlineHandler = jest.fn().mockResolvedValue({});

      // Act
      const result = await handleOnlineOffline(onlineHandler, offlineHandler);

      // Assert
      expect(result).toEqual(complexResult);
    });

    it('should handle async operations correctly', async () => {
      // Arrange
      (syncService.getOnlineStatus as jest.Mock).mockReturnValue(true);
      const onlineHandler = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'async result';
      });
      const offlineHandler = jest.fn();

      // Act
      const result = await handleOnlineOffline(onlineHandler, offlineHandler);

      // Assert
      expect(result).toBe('async result');
      expect(onlineHandler).toHaveBeenCalledTimes(1);
    });
  });
});
