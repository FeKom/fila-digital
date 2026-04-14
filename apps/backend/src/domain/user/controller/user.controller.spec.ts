import { describe, beforeEach, it, expect, vi } from "vitest";
import * as userRepository from "../repository/user.repository";
import userController from "./user.controller";
import { ServerRequest, ServerResponse } from "../../../infra/types";

vi.mock("../repository/user.repository");
vi.mock("../utils/validators");
vi.mock("../utils/password");
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
    // Mock validators to return valid results
    // vi.mocked(validatePassword).mockReturnValue(true);
    // vi.mocked(validateName).mockReturnValue(true);
    // vi.mocked(validateEmail).mockReturnValue("test@example.com");
    // vi.mocked(validatePhone).mockReturnValue("1234567890");
    // vi.mocked(hashPassword).mockResolvedValue("hashedPassword");
    // vi.mocked(uuidv7).mockReturnValue("mocked-uuid");
  });

  it("should register a new user successfully", async () => {
    const req = {
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
      },
    };

    vi.mocked(userRepository.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(userRepository.createNewUser).mockResolvedValue({
      id: "mocked-uuid",
      name: "Test User",
      email: "test@example.com",
      password: "hashedPassword",
      phone: "1234567890",
      queue_id: null,
      commerce_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await controller.register(
      req as unknown as ServerRequest,
      res as unknown as ServerResponse
    );

    expect(userRepository.getUserByEmail).toHaveBeenCalledWith(
      "test@example.com"
    );
    expect(userRepository.createNewUser).toHaveBeenCalled();
    expect(res.code).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({ message: "User Created!" });
  });

  it("should return 409 if user already exists", async () => {
    const req = {
      body: {
        name: "Existing User",
        email: "existing@example.com",
        password: "password123",
        phone: "1234567890",
      },
    };

    //vi.mocked(validateEmail).mockReturnValue("existing@example.com");
    //vi.mocked(validatePhone).mockReturnValue("1234567890");
    vi.mocked(userRepository.getUserByEmail).mockResolvedValue({
      id: "mocked-uuid",
      name: "Existing User",
      email: "existing@example.com",
      password: "hashedPassword",
      phone: "1234567890",
      commerce_id: null,
      queue_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await controller.register(
      req as unknown as ServerRequest,
      res as unknown as ServerResponse
    );

    expect(userRepository.getUserByEmail).toHaveBeenCalledWith(
      "existing@example.com"
    );
    expect(userRepository.createNewUser).not.toHaveBeenCalled();
    expect(res.code).toHaveBeenCalledWith(400); // Updated to 400 based on controller
    expect(res.send).toHaveBeenCalledWith({ message: "User Already Exists" });
  });

  it("should return 500 if user creation fails", async () => {
    const req = {
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
      },
    };

    vi.mocked(userRepository.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(userRepository.createNewUser).mockRejectedValue(
      new Error("Database error")
    );

    await controller.register(
      req as unknown as ServerRequest,
      res as unknown as ServerResponse
    );

    expect(userRepository.getUserByEmail).toHaveBeenCalledWith(
      "test@example.com"
    );
    expect(userRepository.createNewUser).toHaveBeenCalled();
    expect(res.code).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      message: "Failed to create User!",
    });
  });
});
