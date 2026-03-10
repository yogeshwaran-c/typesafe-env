import type { EnvSchemaMap, InferEnv, EnvError, CreateEnvOptions, EnvSchema } from "./types";
import { coerce } from "./validators";

/**
 * Validate and parse environment variables against a schema.
 * Returns a fully typed, readonly config object.
 *
 * Throws an `EnvGuardError` listing ALL validation issues at once
 * (unless a custom `onError` handler is provided).
 *
 * @example
 * ```ts
 * const env = createEnv({
 *   PORT: { type: "port", default: 3000 },
 *   DATABASE_URL: { type: "url", required: true },
 *   DEBUG: { type: "boolean", default: false },
 *   NODE_ENV: { type: "string", choices: ["development", "production", "test"] as const },
 * });
 * // env.PORT    -> number
 * // env.DEBUG   -> boolean
 * // env.NODE_ENV -> "development" | "production" | "test"
 * ```
 */
export function createEnv<T extends EnvSchemaMap>(
  schema: T,
  options: CreateEnvOptions = {},
): InferEnv<T> {
  const { source = process.env, prefix = "", onError } = options;
  const errors: EnvError[] = [];
  const result: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(schema)) {
    const envKey = prefix ? `${prefix}${key}` : key;
    const raw = source[envKey];

    const value = processKey(key, envKey, raw, def, errors);
    result[key] = value;
  }

  if (errors.length > 0) {
    if (onError) {
      onError(errors);
    } else {
      throw new EnvGuardError(errors);
    }
  }

  return Object.freeze(result) as InferEnv<T>;
}

function processKey(
  key: string,
  envKey: string,
  raw: string | undefined,
  def: EnvSchema,
  errors: EnvError[],
): unknown {
  const isRequired = def.required !== false;

  // Missing value
  if (raw === undefined || raw === "") {
    if (def.default !== undefined) {
      return def.default;
    }
    if (isRequired) {
      errors.push({ key: envKey, message: "missing required environment variable" });
    }
    return undefined;
  }

  // Coerce
  let value: unknown;
  try {
    value = coerce(raw, def.type);
  } catch (msg) {
    errors.push({ key: envKey, message: msg as string, received: raw });
    return undefined;
  }

  // Choices
  if (def.choices && !def.choices.includes(raw as never)) {
    errors.push({
      key: envKey,
      message: `expected one of [${def.choices.join(", ")}], received "${raw}"`,
      received: raw,
    });
    return undefined;
  }

  // Custom validator
  if (def.validate) {
    const result = def.validate(value as never);
    if (result === false) {
      errors.push({ key: envKey, message: "failed custom validation", received: raw });
      return undefined;
    }
    if (typeof result === "string") {
      errors.push({ key: envKey, message: result, received: raw });
      return undefined;
    }
  }

  return value;
}

/**
 * Error thrown when environment validation fails.
 * Contains all validation errors in a single, readable message.
 */
export class EnvGuardError extends Error {
  public readonly errors: EnvError[];

  constructor(errors: EnvError[]) {
    const lines = errors.map((e) => `  - ${e.key}: ${e.message}`);
    const message = `Environment validation failed:\n${lines.join("\n")}`;
    super(message);
    this.name = "EnvGuardError";
    this.errors = errors;
  }
}
