export class CategoryUpdatedEvent {
  constructor(
    public readonly id: string,
    public readonly changes: {
      name?: string;
      description?: string | null;
    },
  ) {}
}
