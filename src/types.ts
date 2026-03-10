/** Supported primitive types for environment variables */
export type EnvType = "string" | "number" | "boolean" | "port" | "url" | "email";

/** Maps EnvType strings to their TypeScript output types */
export type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  port: number;
  url: string;
  email: string;
};

/** Schema definition for a single environment variable */
export type EnvSchema<T extends EnvType = EnvType, E extends readonly string[] = readonly string[]> =
  | {
      type: T;
      required?: true;
      default?: TypeMap[T];
      choices?: E;
      validate?: (value: TypeMap[T]) => boolean | string;
    }
  | {
      type: T;
      required: false;
      default?: TypeMap[T];
      choices?: E;
      validate?: (value: TypeMap[T]) => boolean | string;
    };

/** Full schema map — keys are env var names, values are schema definitions */
export type EnvSchemaMap = Record<string, EnvSchema>;

/** Infers the output type for a single schema entry */
export type InferEnvType<S extends EnvSchema> = S extends { choices: readonly (infer C)[] }
  ? S extends { required: false; default?: undefined }
    ? C | undefined
    : C
  : S extends { type: infer T extends EnvType }
    ? S extends { required: false; default?: undefined }
      ? TypeMap[T] | undefined
      : TypeMap[T]
    : never;

/** Infers the full typed output from a schema map */
export type InferEnv<T extends EnvSchemaMap> = {
  readonly [K in keyof T]: InferEnvType<T[K]>;
};

/** A single validation error */
export interface EnvError {
  key: string;
  message: string;
  received?: string;
}

/** Options for createEnv */
export interface CreateEnvOptions {
  /** Custom env source. Defaults to `process.env` */
  source?: Record<string, string | undefined>;
  /** Prefix to strip from env var names (e.g., "APP_") */
  prefix?: string;
  /** Called when validation fails instead of throwing */
  onError?: (errors: EnvError[]) => void;
}
