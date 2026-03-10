import { describe, it, expect } from "vitest";
import { createEnv, EnvGuardError } from "../src";

describe("createEnv", () => {
  describe("string type", () => {
    it("parses a string value", () => {
      const env = createEnv(
        { NAME: { type: "string" } },
        { source: { NAME: "hello" } },
      );
      expect(env.NAME).toBe("hello");
    });

    it("throws for missing required string", () => {
      expect(() =>
        createEnv({ NAME: { type: "string" } }, { source: {} }),
      ).toThrow(EnvGuardError);
    });

    it("uses default for missing optional string", () => {
      const env = createEnv(
        { NAME: { type: "string", default: "world" } },
        { source: {} },
      );
      expect(env.NAME).toBe("world");
    });

    it("returns undefined for optional without default", () => {
      const env = createEnv(
        { NAME: { type: "string", required: false } },
        { source: {} },
      );
      expect(env.NAME).toBeUndefined();
    });
  });

  describe("number type", () => {
    it("coerces string to number", () => {
      const env = createEnv(
        { COUNT: { type: "number" } },
        { source: { COUNT: "42" } },
      );
      expect(env.COUNT).toBe(42);
    });

    it("handles floating point numbers", () => {
      const env = createEnv(
        { RATE: { type: "number" } },
        { source: { RATE: "3.14" } },
      );
      expect(env.RATE).toBe(3.14);
    });

    it("throws for invalid number", () => {
      expect(() =>
        createEnv({ COUNT: { type: "number" } }, { source: { COUNT: "abc" } }),
      ).toThrow("expected a valid number");
    });
  });

  describe("boolean type", () => {
    it.each([
      ["true", true],
      ["1", true],
      ["yes", true],
      ["on", true],
      ["TRUE", true],
      ["false", false],
      ["0", false],
      ["no", false],
      ["off", false],
      ["FALSE", false],
    ])("coerces '%s' to %s", (input, expected) => {
      const env = createEnv(
        { FLAG: { type: "boolean" } },
        { source: { FLAG: input } },
      );
      expect(env.FLAG).toBe(expected);
    });

    it("throws for invalid boolean", () => {
      expect(() =>
        createEnv({ FLAG: { type: "boolean" } }, { source: { FLAG: "maybe" } }),
      ).toThrow("expected a boolean");
    });
  });

  describe("port type", () => {
    it("parses a valid port", () => {
      const env = createEnv(
        { PORT: { type: "port" } },
        { source: { PORT: "3000" } },
      );
      expect(env.PORT).toBe(3000);
    });

    it("rejects port out of range", () => {
      expect(() =>
        createEnv({ PORT: { type: "port" } }, { source: { PORT: "70000" } }),
      ).toThrow("expected a valid port");
    });

    it("rejects non-integer port", () => {
      expect(() =>
        createEnv({ PORT: { type: "port" } }, { source: { PORT: "3.5" } }),
      ).toThrow("expected a valid port");
    });
  });

  describe("url type", () => {
    it("accepts a valid URL", () => {
      const env = createEnv(
        { API: { type: "url" } },
        { source: { API: "https://example.com/api" } },
      );
      expect(env.API).toBe("https://example.com/api");
    });

    it("rejects invalid URL", () => {
      expect(() =>
        createEnv({ API: { type: "url" } }, { source: { API: "not-a-url" } }),
      ).toThrow("expected a valid URL");
    });
  });

  describe("email type", () => {
    it("accepts a valid email", () => {
      const env = createEnv(
        { EMAIL: { type: "email" } },
        { source: { EMAIL: "user@example.com" } },
      );
      expect(env.EMAIL).toBe("user@example.com");
    });

    it("rejects invalid email", () => {
      expect(() =>
        createEnv({ EMAIL: { type: "email" } }, { source: { EMAIL: "notanemail" } }),
      ).toThrow("expected a valid email");
    });
  });

  describe("choices", () => {
    it("accepts a value in choices", () => {
      const env = createEnv(
        { NODE_ENV: { type: "string", choices: ["development", "production", "test"] as const } },
        { source: { NODE_ENV: "production" } },
      );
      expect(env.NODE_ENV).toBe("production");
    });

    it("rejects a value not in choices", () => {
      expect(() =>
        createEnv(
          { NODE_ENV: { type: "string", choices: ["development", "production"] as const } },
          { source: { NODE_ENV: "staging" } },
        ),
      ).toThrow("expected one of [development, production]");
    });
  });

  describe("custom validate", () => {
    it("passes when validator returns true", () => {
      const env = createEnv(
        { PORT: { type: "number", validate: (v) => v > 1000 } },
        { source: { PORT: "3000" } },
      );
      expect(env.PORT).toBe(3000);
    });

    it("fails when validator returns false", () => {
      expect(() =>
        createEnv(
          { PORT: { type: "number", validate: (v) => v > 1000 } },
          { source: { PORT: "80" } },
        ),
      ).toThrow("failed custom validation");
    });

    it("uses string return as error message", () => {
      expect(() =>
        createEnv(
          { PORT: { type: "number", validate: (v) => (v > 1000 ? true : "must be > 1000") } },
          { source: { PORT: "80" } },
        ),
      ).toThrow("must be > 1000");
    });
  });

  describe("prefix", () => {
    it("strips prefix when reading from source", () => {
      const env = createEnv(
        { PORT: { type: "port" } },
        { source: { APP_PORT: "3000" }, prefix: "APP_" },
      );
      expect(env.PORT).toBe(3000);
    });
  });

  describe("aggregated errors", () => {
    it("reports ALL errors at once", () => {
      try {
        createEnv(
          {
            DB_URL: { type: "url" },
            PORT: { type: "port" },
            SECRET: { type: "string" },
          },
          { source: {} },
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(EnvGuardError);
        const error = err as EnvGuardError;
        expect(error.errors).toHaveLength(3);
        expect(error.errors.map((e) => e.key)).toEqual(["DB_URL", "PORT", "SECRET"]);
      }
    });
  });

  describe("onError callback", () => {
    it("calls onError instead of throwing", () => {
      const collected: unknown[] = [];
      createEnv(
        { MISSING: { type: "string" } },
        { source: {}, onError: (errors) => collected.push(...errors) },
      );
      expect(collected).toHaveLength(1);
    });
  });

  describe("immutability", () => {
    it("returns a frozen object", () => {
      const env = createEnv(
        { NAME: { type: "string" } },
        { source: { NAME: "hello" } },
      );
      expect(Object.isFrozen(env)).toBe(true);
    });
  });

  describe("empty string handling", () => {
    it("treats empty string as missing", () => {
      expect(() =>
        createEnv({ NAME: { type: "string" } }, { source: { NAME: "" } }),
      ).toThrow(EnvGuardError);
    });

    it("uses default when value is empty string", () => {
      const env = createEnv(
        { NAME: { type: "string", default: "fallback" } },
        { source: { NAME: "" } },
      );
      expect(env.NAME).toBe("fallback");
    });
  });
});
