import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './repositories/categories.repository';
import { Category } from './entities/category.entity';
import {
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
  CategoryDeletedEvent,
} from '../shared/events';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: jest.Mocked<CategoriesRepository>;
  let eventBus: jest.Mocked<EventBus>;

  const mockCategory = Category.fromPersistence({
    id: '123',
    name: 'Electronics',
    description: 'Electronic products',
    parentId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      save: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CategoriesRepository,
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get(CategoriesRepository);
    eventBus = module.get(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category and emit CategoryCreatedEvent', async () => {
      const dto = {
        name: 'Electronics',
        description: 'Electronic products',
      };

      repository.create.mockResolvedValue(mockCategory);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockCategory.toJSON());
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockCategory.id,
          name: mockCategory.name,
          description: mockCategory.description,
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(CategoryCreatedEvent),
      );
    });

    it('should propagate ConflictException from repository', async () => {
      const dto = {
        name: 'Electronics',
        description: 'Electronic products',
      };

      repository.create.mockRejectedValue(
        new ConflictException('Category with name Electronics already exists'),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      repository.findAll.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(repository.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([mockCategory.toJSON()]);
    });

    it('should filter categories by parentId', async () => {
      repository.findAll.mockResolvedValue([mockCategory]);

      const result = await service.findAll({ parentId: 'parent-123' });

      expect(repository.findAll).toHaveBeenCalledWith({ parentId: 'parent-123' });
      expect(result).toEqual([mockCategory.toJSON()]);
    });

    it('should filter categories by active status', async () => {
      repository.findAll.mockResolvedValue([mockCategory]);

      const result = await service.findAll({ isActive: true });

      expect(repository.findAll).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual([mockCategory.toJSON()]);
    });

    it('should return empty array when no categories', async () => {
      repository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a category by ID', async () => {
      repository.findById.mockResolvedValue(mockCategory);

      const result = await service.findOne('123');

      expect(repository.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockCategory.toJSON());
    });

    it('should throw NotFoundException when category not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('999')).rejects.toThrow(
        'Category with ID 999 not found',
      );
    });
  });

  describe('update', () => {
    it('should update a category and emit CategoryUpdatedEvent', async () => {
      const dto = { name: 'Updated Electronics' };
      const updatedCategory = Category.fromPersistence({
        ...mockCategory.toJSON(),
        name: 'Updated Electronics',
      });

      repository.update.mockResolvedValue(updatedCategory);

      const result = await service.update('123', dto);

      expect(repository.update).toHaveBeenCalledWith('123', dto);
      expect(result).toEqual(updatedCategory.toJSON());
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(CategoryUpdatedEvent),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          id: updatedCategory.id,
          changes: {
            name: updatedCategory.name,
            description: updatedCategory.description,
          },
        }),
      );
    });

    it('should propagate NotFoundException from repository', async () => {
      repository.update.mockRejectedValue(
        new NotFoundException('Category with ID 999 not found'),
      );

      await expect(service.update('999', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should propagate ConflictException from repository', async () => {
      repository.update.mockRejectedValue(
        new ConflictException('Category with name Electronics already exists'),
      );

      await expect(
        service.update('123', { name: 'Electronics' }),
      ).rejects.toThrow(ConflictException);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete a category and emit CategoryDeletedEvent', async () => {
      const deletedCategory = Category.fromPersistence({
        ...mockCategory.toJSON(),
        isActive: false,
      });

      repository.softDelete.mockResolvedValue(deletedCategory);

      const result = await service.remove('123');

      expect(repository.softDelete).toHaveBeenCalledWith('123');
      expect(result).toEqual(deletedCategory.toJSON());
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(CategoryDeletedEvent),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '123',
          name: mockCategory.name,
        }),
      );
    });

    it('should propagate NotFoundException from repository', async () => {
      repository.softDelete.mockRejectedValue(
        new NotFoundException('Category with ID 999 not found'),
      );

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
