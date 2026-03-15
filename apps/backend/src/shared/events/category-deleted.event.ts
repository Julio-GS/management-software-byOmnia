export class CategoryDeletedEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}
}
