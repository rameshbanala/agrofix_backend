const ApiError = require("../src/utils/ApiError");
const { errorHandler, notFoundHandler } = require("../src/middleware/errorHandler");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("errorHandler", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("formats an ApiError with its own status and message", () => {
    const res = mockRes();
    errorHandler(new ApiError(404, "Product not found"), {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Product not found" });
  });

  test("includes details when an ApiError carries them", () => {
    const res = mockRes();
    errorHandler(new ApiError(400, "Validation failed", ["\"name\" is required"]), {}, res, () => {});

    expect(res.json).toHaveBeenCalledWith({
      error: "Validation failed",
      details: ["\"name\" is required"],
    });
  });

  test("maps a Postgres unique-violation to 409 without leaking the raw error", () => {
    const res = mockRes();
    const pgErr = new Error("duplicate key value violates unique constraint");
    pgErr.code = "23505";
    errorHandler(pgErr, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "Resource already exists" });
  });

  test("falls back to a generic 500 and does not leak the raw error message", () => {
    const res = mockRes();
    errorHandler(new Error("password_hash column does not exist"), {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  test("maps a Multer file-size error to 400", () => {
    const res = mockRes();
    const multerErr = new Error("File too large");
    multerErr.name = "MulterError";
    multerErr.code = "LIMIT_FILE_SIZE";
    errorHandler(multerErr, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "File is too large" });
  });
});

describe("notFoundHandler", () => {
  test("returns a 404 with a generic message", () => {
    const res = mockRes();
    notFoundHandler({}, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Route not found" });
  });
});
