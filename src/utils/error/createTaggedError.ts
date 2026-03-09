class TaggedError extends Error {
  public tag: string;

  constructor(tag: string, message: string) {
    super(message);
    this.tag = tag;
  }
}

export const createTaggedError = (tag: string, message: string) => new TaggedError(tag, message);

export const isTaggedError = (tag: string, error: unknown): error is Error =>
  error instanceof TaggedError && error.tag === tag;
