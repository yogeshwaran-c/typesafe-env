import type { EnvType, TypeMap } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Coerce a raw string value into the target type.
 * Returns the coerced value or throws a descriptive string on failure.
 */
export function coerce<T extends EnvType>(raw: string, type: T): TypeMap[T] {
  switch (type) {
    case "string":
      return raw as TypeMap[T];

    case "number": {
      const num = Number(raw);
      if (Number.isNaN(num)) {
        throw `expected a valid number, received "${raw}"`;
      }
      return num as TypeMap[T];
    }

    case "boolean": {
      const lower = raw.toLowerCase().trim();
      if (["true", "1", "yes", "on"].includes(lower)) return true as TypeMap[T];
      if (["false", "0", "no", "off"].includes(lower)) return false as TypeMap[T];
      throw `expected a boolean (true/false/1/0/yes/no), received "${raw}"`;
    }

    case "port": {
      const port = Number(raw);
      if (Number.isNaN(port) || !Number.isInteger(port) || port < 0 || port > 65535) {
        throw `expected a valid port (0-65535), received "${raw}"`;
      }
      return port as TypeMap[T];
    }

    case "url": {
      try {
        new URL(raw);
        return raw as TypeMap[T];
      } catch {
        throw `expected a valid URL, received "${raw}"`;
      }
    }

    case "email": {
      if (!EMAIL_REGEX.test(raw)) {
        throw `expected a valid email address, received "${raw}"`;
      }
      return raw as TypeMap[T];
    }

    default:
      throw `unknown type "${type}"`;
  }
}
