export class ValidationError extends Error {
  constructor(message: string, public details: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}
