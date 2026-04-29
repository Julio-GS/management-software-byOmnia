/**
 * Base class for Integration Events
 * 
 * Integration events represent something that happened that external systems
 * or other bounded contexts need to know about (e.g., for sync, webhooks, or queues).
 * 
 * Future: These will be published to external message brokers (e.g., RabbitMQ, Redis Pub/Sub).
 */
export abstract class IntegrationEvent {
  public readonly occurredAt: Date;
  public readonly eventId: string;

  constructor() {
    this.occurredAt = new Date();
    this.eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Event name (used for routing to external systems)
   */
  abstract get eventName(): string;

  /**
   * Serialize event to JSON for external systems
   */
  toJSON(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      occurredAt: this.occurredAt.toISOString(),
      ...this,
    };
  }
}
