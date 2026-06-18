export class AuctionServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "AuctionServiceError";
  }
}

export function serviceError(message: string, code: string, status = 400) {
  return new AuctionServiceError(message, code, status);
}
