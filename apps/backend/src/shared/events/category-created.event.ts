export class CategoryCreatedEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
  ) {}
}
