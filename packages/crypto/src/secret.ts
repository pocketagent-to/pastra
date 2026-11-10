/**
 * A value that must never leak into logs, JSON or errors (docs/architecture.md section 14).
 * `JSON.stringify` and `String()` return a redaction; the real value is only available via
 * {@link Secret.reveal}.
 */
export class Secret<T = string> {
  readonly #value: T;

  constructor(value: T) {
    this.#value = value;
  }

  reveal(): T {
    return this.#value;
  }

  toJSON(): string {
    return '[redacted]';
  }

  toString(): string {
    return '[redacted]';
  }

  // Hide the value from console.log / util.inspect.
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return 'Secret([redacted])';
  }
}

export function secret<T>(value: T): Secret<T> {
  return new Secret(value);
}
