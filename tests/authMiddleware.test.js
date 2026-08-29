process.env.DB_HOST = "localhost";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";
process.env.JWT_SECRET = "test-secret";

const jwt = require("jsonwebtoken");
const { authenticate, authorizeAdmin } = require("../src/middleware/auth");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("authenticate", () => {
  test("rejects a request with no Authorization header", () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects an invalid token", () => {
    const req = { headers: { authorization: "Bearer not-a-real-token" } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
  });

  test("attaches the decoded user and calls next for a valid token", () => {
    const token = jwt.sign({ id: 1, role: "user" }, "test-secret");
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 1, role: "user" });
  });

  test("reports an expired token distinctly", () => {
    const token = jwt.sign({ id: 1, role: "user" }, "test-secret", { expiresIn: -1 });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ error: "Session expired, please log in again" });
  });
});

describe("authorizeAdmin", () => {
  test("blocks a non-admin user", () => {
    const req = { user: { role: "user" } };
    const res = mockRes();
    const next = jest.fn();

    authorizeAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("allows an admin user through", () => {
    const req = { user: { role: "admin" } };
    const res = mockRes();
    const next = jest.fn();

    authorizeAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
