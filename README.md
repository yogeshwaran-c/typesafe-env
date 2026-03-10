# typesafe-env

Type-safe environment variable validation and parsing with **zero dependencies**.

- Validates and coerces `process.env` into a fully typed config object
- Reports **all** missing/invalid variables at once (not one at a time)
- Built-in types: `string`, `number`, `boolean`, `port`, `url`, `email`
- Supports choices (enums), defaults, custom validators, and prefixes
- Dual CJS/ESM with full TypeScript type inference
- Zero runtime dependencies

## Install

```bash
npm install typesafe-env
```

## Quick Start

```ts
import { createEnv } from "typesafe-env";

const env = createEnv({
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url", required: true },
  DEBUG: { type: "boolean", default: false },
  NODE_ENV: {
    type: "string",
    choices: ["development", "production", "test"] as const,
    default: "development",
  },
});

// Fully typed:
// env.PORT       -> number
// env.DATABASE_URL -> string
// env.DEBUG      -> boolean
// env.NODE_ENV   -> "development" | "production" | "test"
```

If `DATABASE_URL` is missing, you get a clear error:

```
TypesafeEnvError: Environment validation failed:
  - DATABASE_URL: missing required environment variable
```

## API

### `createEnv(schema, options?)`

#### Schema

Each key maps to a schema definition:

```ts
{
  type: "string" | "number" | "boolean" | "port" | "url" | "email";
  required?: boolean;    // default: true
  default?: T;           // fallback value if missing
  choices?: readonly string[];  // restrict to specific values
  validate?: (value: T) => boolean | string;  // custom validation
}
```

#### Options

```ts
{
  source?: Record<string, string | undefined>;  // default: process.env
  prefix?: string;    // e.g., "APP_" reads APP_PORT for schema key PORT
  onError?: (errors: EnvError[]) => void;  // custom error handler
}
```

### Built-in Types

| Type | Coerces to | Accepts |
|------|-----------|---------|
| `string` | `string` | any non-empty string |
| `number` | `number` | valid numeric strings |
| `boolean` | `boolean` | `true/false/1/0/yes/no/on/off` |
| `port` | `number` | integers 0-65535 |
| `url` | `string` | valid URLs |
| `email` | `string` | valid email format |

### Choices (Enums)

```ts
const env = createEnv({
  LOG_LEVEL: {
    type: "string",
    choices: ["debug", "info", "warn", "error"] as const,
    default: "info",
  },
});
// env.LOG_LEVEL -> "debug" | "info" | "warn" | "error"
```

### Custom Validators

Return `true` to pass, `false` or a string message to fail:

```ts
const env = createEnv({
  PORT: {
    type: "port",
    validate: (port) => port >= 1024 || "must be >= 1024 (non-privileged)",
  },
});
```

### Prefix

Read prefixed variables while keeping clean keys:

```ts
const env = createEnv(
  { PORT: { type: "port" }, HOST: { type: "string" } },
  { prefix: "APP_" },
);
// Reads APP_PORT and APP_HOST from process.env
// Access as env.PORT and env.HOST
```

### Custom Error Handling

```ts
const env = createEnv(schema, {
  onError: (errors) => {
    errors.forEach((e) => console.error(`${e.key}: ${e.message}`));
    process.exit(1);
  },
});
```

### Error Object

```ts
interface EnvError {
  key: string;       // variable name
  message: string;   // what went wrong
  received?: string; // the raw value (if any)
}
```

## License

MIT
