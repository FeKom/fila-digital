import { describe, beforeEach, it, expect, vi } from "vitest";
import * as userRepository from "../repository/user.repository";
import userController from "./user.controller";
import { ServerRequest, ServerResponse } from "../../../infra/types";
import { hashPassword } from "../../../utils/hash";
import {
  validatePassword,
  validateName,
  validateEmail,
  validatePhone,
} from "../../../utils/validate";

vi.mock("../repository/user.repository");
vi.mock("../repository/refresh-token.repository");
vi.mock("../../../utils/validate");
vi.mock("uuidv7");

describe("User Controller - Unit Test with Mocks", () => {
  let controller: ReturnType<typeof userController>;
  let res: { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = userController();
    res = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    vi.mocked(validatePassword).mockReturnValue(true);
    vi.mocked(validateName).mockImplementation((name) => name);
    vi.mocked(validateEmail).mockImplementation((email) => email);
    vi.mocked(validatePhone).mockImplementation((phone) => phone);
    // vi.mocked(hashPassword).mockResolvedValue("hashedPassword");
    // vi.mocked(uuidv7).mockReturnValue("mocked-uuid");
  });

  it("should register a new user successfully", async () => {
    const req = {
      // Fastify sempre entrega headers. O controller lê x-anonymous-id
      // (claim de usuário anônimo) e sem este campo o acesso estoura TypeError.
      headers: {},
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
      },
    };

    vi.mocked(userRepository.emailExists).mockResolvedValue(false);
    vi.mocked(userRepository.createNewUser).mockResolvedValue({
      id: "mocked-uuid",
      name: "Test User",
      email: "test@example.com",
      password: "hashedPassword",
      phone: "1234567890",
      queue_id: null,
      commerce_id: null,
      google_id: null,
      role: "CUSTOMER",
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await controller.register(
      req as unknown as ServerRequest,
      res as unknown as ServerResponse
    );

    expect(userRepository.emailExists).toHaveBeenCalledWith("test@example.com");
    expect(userRepository.createNewUser).toHaveBeenCalled();
    expect(res.code).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "User Created!" })
    );
  });

  it("should return 409 if user already exists", async () => {
    const req = {
      // Fastify sempre entrega headers. O controller lê x-anonymous-id
      // (claim de usuário anônimo) e sem este campo o acesso estoura TypeError.
      headers: {},
      body: {
        name: "Existing User",
        email: "existing@example.com",
        password: "password123",
        phone: "1234567890",
      },
    };

    //vi.mocked(validateEmail).mockReturnValue("existing@example.com");
    //vi.mocked(validatePhone).mockReturnValue("1234567890");
    vi.mocked(userRepository.emailExists).mockResolvedValue(true);

    await controller.register(
      req as unknown as ServerRequest,
      res as unknown as ServerResponse
    );

    expect(userRepository.emailExists).toHaveBeenCalledWith(
      "existing@example.com"
    );
    expect(userRepository.createNewUser).not.toHaveBeenCalled();
    expect(res.code).toHaveBeenCalledWith(409);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "User Already Exists" })
    );
  });

  it("should return 500 if user creation fails", async () => {
    const req = {
      // Fastify sempre entrega headers. O controller lê x-anonymous-id
      // (claim de usuário anônimo) e sem este campo o acesso estoura TypeError.
      headers: {},
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
      },
    };

    vi.mocked(userRepository.emailExists).mockResolvedValue(false);
    vi.mocked(userRepository.createNewUser).mockRejectedValue(
      new Error("Database error")
    );

    await controller.register(
      req as unknown as ServerRequest,
      res as unknown as ServerResponse
    );

    expect(userRepository.emailExists).toHaveBeenCalledWith("test@example.com");
    expect(userRepository.createNewUser).toHaveBeenCalled();
    expect(res.code).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Failed to create User!" })
    );
  });

  describe("login", () => {
    const password = "Correct#123";
    const loginReq = (body: { email: string; password: string }) =>
      ({
        body,
        log: { info: vi.fn(), error: vi.fn() },
      }) as unknown as ServerRequest;
    const credentials = async (active: boolean) => ({
      id: "person-1",
      name: "Test User",
      email: "test@example.com",
      role: "CUSTOMER" as const,
      password: await hashPassword(password),
      active,
    });

    it("returns the same 401 for unknown email and wrong password", async () => {
      vi.mocked(userRepository.findCredentialsByEmail).mockResolvedValue(
        undefined
      );
      await controller.login(
        loginReq({ email: "nobody@example.com", password }),
        res as unknown as ServerResponse
      );
      const unknownEmail = res.send.mock.calls[0][0];

      vi.mocked(userRepository.findCredentialsByEmail).mockResolvedValue(
        await credentials(true)
      );
      await controller.login(
        loginReq({ email: "test@example.com", password: "Wrong#123" }),
        res as unknown as ServerResponse
      );
      const wrongPassword = res.send.mock.calls[1][0];

      expect(res.code).toHaveBeenNthCalledWith(1, 401);
      expect(res.code).toHaveBeenNthCalledWith(2, 401);
      expect(unknownEmail).toEqual(wrongPassword);
    });

    it("returns 403 for a disabled account only after the right password", async () => {
      vi.mocked(userRepository.findCredentialsByEmail).mockResolvedValue(
        await credentials(false)
      );
      await controller.login(
        loginReq({ email: "test@example.com", password }),
        res as unknown as ServerResponse
      );

      expect(res.code).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Account disabled" })
      );
    });

    it("returns tokens for an active account with the right password", async () => {
      vi.mocked(userRepository.findCredentialsByEmail).mockResolvedValue(
        await credentials(true)
      );
      await controller.login(
        loginReq({ email: "TEST@example.com", password }),
        res as unknown as ServerResponse
      );

      expect(userRepository.findCredentialsByEmail).toHaveBeenCalledWith(
        "test@example.com"
      );
      expect(res.code).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ access_token: expect.any(String) })
      );
    });
  });
});
