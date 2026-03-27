const {
  assertEmail,
  assertPassword,
  assertCoordinates,
  assertString,
} = require("../lib/validation");

const { hasValidTaskHeaders } = require("../lib/taskSecurity");

describe("validation guards", () => {
  test("accepts valid email", () => {
    expect(assertEmail("test@example.com")).toBe("test@example.com");
  });

  test("rejects invalid email", () => {
    expect(() => assertEmail("bad-email")).toThrow("email is invalid");
  });

  test("rejects short password", () => {
    expect(() => assertPassword("123")).toThrow("password is required");
  });

  test("accepts valid coordinates", () => {
    expect(assertCoordinates(30.1, 31.2)).toEqual({ latitude: 30.1, longitude: 31.2 });
  });

  test("rejects invalid latitude", () => {
    expect(() => assertCoordinates(120, 31.2)).toThrow("latitude is invalid");
  });

  test("rejects empty required string", () => {
    expect(() => assertString("   ", "name")).toThrow("name is required");
  });
});

describe("task security", () => {
  test("accepts valid task headers", () => {
    const req = {
      get(name) {
        const headers = {
          "x-cloudtasks-taskname": "task-1",
          "x-cloudtasks-queuename": "queue-1",
          authorization: "Bearer token",
        };
        return headers[name.toLowerCase()] || headers[name];
      },
    };

    expect(hasValidTaskHeaders(req)).toBe(true);
  });

  test("rejects missing bearer token", () => {
    const req = {
      get(name) {
        const headers = {
          "x-cloudtasks-taskname": "task-1",
          "x-cloudtasks-queuename": "queue-1",
          authorization: "",
        };
        return headers[name.toLowerCase()] || headers[name];
      },
    };

    expect(hasValidTaskHeaders(req)).toBe(false);
  });
});
