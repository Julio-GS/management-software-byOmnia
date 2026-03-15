import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CategoryUpdatedEvent } from '../../shared/events';
import { SyncGateway } from '../sync.gateway';

@EventsHandler(CategoryUpdatedEvent)
export class CategoryUpdatedHandler implements IEventHandler<CategoryUpdatedEvent> {
  private readonly logger = new Logger(CategoryUpdatedEvent.name);

  constructor(private readonly syncGateway: SyncGateway) {}

  handle(event: CategoryUpdatedEvent) {
    this.logger.log(`Handling CategoryUpdatedEvent for category: ${event.id}`);
    
    this.syncGateway.emitCategoryUpdated({
      id: event.id,
      ...event.changes,
    });
  }
}
