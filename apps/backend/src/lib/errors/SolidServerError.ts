import { JSError } from '@noeldemartin/utils';

export class SolidServerError extends JSError {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
  }
}
