import { INotificationService } from './notification.service.interface';

describe('INotificationService Interface Contract', () => {
  it('should define required methods', () => {
    const requiredMethods = [
      'notifyProductCreated',
      'notifyProductUpdated',
      'notifyInventoryMovement',
      'notifyPricingRecalculated',
      'notifySaleCreated',
      'notifySaleCancelled',
    ];

    // Mock implementation to validate interface contract
    const mockImplementation: INotificationService = {
      notifyProductCreated: jest.fn(),
      notifyProductUpdated: jest.fn(),
      notifyInventoryMovement: jest.fn(),
      notifyPricingRecalculated: jest.fn(),
      notifySaleCreated: jest.fn(),
      notifySaleCancelled: jest.fn(),
    };

    requiredMethods.forEach((method) => {
      expect(mockImplementation).toHaveProperty(method);
      expect(typeof mockImplementation[method]).toBe('function');
    });
  });

  it('should allow valid mock implementation', () => {
    const mockNotificationService: INotificationService = {
      notifyProductCreated: jest.fn().mockResolvedValue(undefined),
      notifyProductUpdated: jest.fn().mockResolvedValue(undefined),
      notifyInventoryMovement: jest.fn().mockResolvedValue(undefined),
      notifyPricingRecalculated: jest.fn().mockResolvedValue(undefined),
      notifySaleCreated: jest.fn().mockResolvedValue(undefined),
      notifySaleCancelled: jest.fn().mockResolvedValue(undefined),
    };

    expect(mockNotificationService).toBeDefined();
    expect(mockNotificationService.notifyProductCreated).toBeDefined();
    expect(mockNotificationService.notifyProductUpdated).toBeDefined();
    expect(mockNotificationService.notifyInventoryMovement).toBeDefined();
    expect(mockNotificationService.notifyPricingRecalculated).toBeDefined();
    expect(mockNotificationService.notifySaleCreated).toBeDefined();
    expect(mockNotificationService.notifySaleCancelled).toBeDefined();
  });
});
