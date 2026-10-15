/** A problem the person can fix (bad input, not allowed, not found). Shown to them as-is with the given status. */
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
