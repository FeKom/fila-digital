import { describe, beforeEach, it, expect, vi } from "vitest";
import participantsQueueController from "./participants-queue.controller";
import * as commerceRepository from "../../commerce/repository/commerce.repository";
import * as queueRepository from "../../queue/repository/queue.repository";
import * as participantsQueueRepository from "../repository/participants-queue.repository";
import * as notificationsRepository from "../../notifications/repository/notifications.repository";
import { publishQueueEvent } from "../../../infra/redis";
import { ServerRequest, ServerResponse } from "../../../infra/types";
import { cacheKeys } from "../../../utils/cacheKeys";

const mockCache = vi.hoisted(() => ({
  wrap: vi.fn((_key: string, fn: () => unknown) => fn()),
  del: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("../../../infra/database/cache", () => ({
  default: Promise.resolve(mockCache),
}));
vi.mock("../../commerce/repository/commerce.repository");
vi.mock("../../queue/repository/queue.repository");
vi.mock("../repository/participants-queue.repository");
vi.mock("../../notifications/repository/notifications.repository");
vi.mock("../../../infra/redis");

describe("Participants-Queue Controller - Permission & Cache Tests", () => {
  let controller: ReturnType<typeof participantsQueueController>;
  let res: { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };

  const commerceId = "commerce-second-id";
  const queueMock = {
    id: "queue-1",
    name: "Fila Principal",
    description: null,
    type: "ephemera" as const,
    status: "open" as const,
    commerce_id: commerceId,
    qrcode_token: "token-1",
    created_at: new Date(),
    updated_at: new Date(),
    active: true,
  };
  const commerceMock = {
    id: commerceId,
    name: "Padaria Central",
    description: null,
    phone: null,
    document_id: "hash",
    owner_id: "owner-1",
    open_at: null,
    closed_at: null,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = participantsQueueController();
    res = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    vi.mocked(
      notificationsRepository.notifyParticipantCalled
    ).mockResolvedValue(undefined);
    vi.mocked(publishQueueEvent).mockResolvedValue(undefined);
  });

  describe("removeFirst", () => {
    it("allows owner of multiple commerces or admin when canManageCommerce is true", async () => {
      const req = {
        user: {
          id: "admin-or-multi-owner",
          name: "Admin",
          email: "admin@example.com",
          role: "CUSTOMER",
        },
        params: { commerce_id: commerceId },
        log: { error: vi.fn() },
      } as unknown as ServerRequest;

      vi.mocked(queueRepository.findQueueByCommerceId).mockResolvedValue(
        queueMock
      );
      vi.mocked(commerceRepository.canManageCommerce).mockResolvedValue(true);
      vi.mocked(commerceRepository.getCommerceById).mockResolvedValue(
        commerceMock
      );
      vi.mocked(
        participantsQueueRepository.findFirstParticipantsByQueueId
      ).mockResolvedValue({
        id: "entry-1",
        queue_id: queueMock.id,
        person_id: "customer-1",
        anonymous_id: null,
        position: 1,
        is_active: true,
        called_at: null,
        leave_at: null,
        leave_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await controller.removeFirst(req, res as unknown as ServerResponse);

      expect(commerceRepository.canManageCommerce).toHaveBeenCalledWith(
        "admin-or-multi-owner",
        commerceId
      );
      expect(mockCache.wrap).toHaveBeenCalledWith(
        cacheKeys.canManageCommerce("admin-or-multi-owner", commerceId),
        expect.any(Function),
        expect.any(Number)
      );
      expect(mockCache.wrap).toHaveBeenCalledWith(
        cacheKeys.commerceById(commerceId),
        expect.any(Function),
        expect.any(Number)
      );
      expect(
        participantsQueueRepository.dequeueParticipantById
      ).toHaveBeenCalledWith("entry-1");
      expect(
        notificationsRepository.notifyParticipantCalled
      ).toHaveBeenCalledWith("customer-1", null, "Padaria Central");
      expect(res.code).toHaveBeenCalledWith(200);
    });

    it("returns 403 when canManageCommerce is false", async () => {
      const req = {
        user: {
          id: "stranger-id",
          name: "Stranger",
          email: "stranger@example.com",
          role: "CUSTOMER",
        },
        params: { commerce_id: commerceId },
        log: { error: vi.fn() },
      } as unknown as ServerRequest;

      vi.mocked(queueRepository.findQueueByCommerceId).mockResolvedValue(
        queueMock
      );
      vi.mocked(commerceRepository.canManageCommerce).mockResolvedValue(false);
      vi.mocked(commerceRepository.getCommerceById).mockResolvedValue(
        commerceMock
      );

      await controller.removeFirst(req, res as unknown as ServerResponse);

      expect(
        participantsQueueRepository.dequeueParticipantById
      ).not.toHaveBeenCalled();
      expect(res.code).toHaveBeenCalledWith(403);
    });
  });

  describe("removeNextN", () => {
    it("removes N participants and notifies using commerceById cache when canManageCommerce is true", async () => {
      const req = {
        user: {
          id: "admin-1",
          name: "Admin",
          email: "admin@example.com",
          role: "CUSTOMER",
        },
        params: { commerce_id: commerceId, count: 2 },
        log: { error: vi.fn() },
      } as unknown as ServerRequest;

      vi.mocked(queueRepository.findQueueByCommerceId).mockResolvedValue(
        queueMock
      );
      vi.mocked(commerceRepository.canManageCommerce).mockResolvedValue(true);
      vi.mocked(commerceRepository.getCommerceById).mockResolvedValue(
        commerceMock
      );
      vi.mocked(
        participantsQueueRepository.softDeleteNextNParticipants
      ).mockResolvedValue([
        {
          id: "entry-1",
          person_id: "customer-1",
          anonymous_id: null,
        },
      ]);

      await controller.removeNextN(req, res as unknown as ServerResponse);

      expect(commerceRepository.canManageCommerce).toHaveBeenCalledWith(
        "admin-1",
        commerceId
      );
      expect(
        participantsQueueRepository.softDeleteNextNParticipants
      ).toHaveBeenCalledWith(queueMock.id, 2);
      expect(
        notificationsRepository.notifyParticipantCalled
      ).toHaveBeenCalledWith("customer-1", null, "Padaria Central");
      expect(res.code).toHaveBeenCalledWith(200);
    });

    it("returns 403 when canManageCommerce is false", async () => {
      const req = {
        user: {
          id: "stranger-id",
          name: "Stranger",
          email: "stranger@example.com",
          role: "CUSTOMER",
        },
        params: { commerce_id: commerceId, count: 2 },
        log: { error: vi.fn() },
      } as unknown as ServerRequest;

      vi.mocked(queueRepository.findQueueByCommerceId).mockResolvedValue(
        queueMock
      );
      vi.mocked(commerceRepository.canManageCommerce).mockResolvedValue(false);
      vi.mocked(commerceRepository.getCommerceById).mockResolvedValue(
        commerceMock
      );

      await controller.removeNextN(req, res as unknown as ServerResponse);

      expect(
        participantsQueueRepository.softDeleteNextNParticipants
      ).not.toHaveBeenCalled();
      expect(res.code).toHaveBeenCalledWith(403);
    });
  });

  describe("revertLast", () => {
    it("reverts last dequeued participants when canManageCommerce is true", async () => {
      const req = {
        user: {
          id: "admin-1",
          name: "Admin",
          email: "admin@example.com",
          role: "CUSTOMER",
        },
        params: { commerce_id: commerceId, count: 1 },
        log: { error: vi.fn() },
      } as unknown as ServerRequest;

      vi.mocked(queueRepository.findQueueByCommerceId).mockResolvedValue(
        queueMock
      );
      vi.mocked(commerceRepository.canManageCommerce).mockResolvedValue(true);
      vi.mocked(commerceRepository.getCommerceById).mockResolvedValue(
        commerceMock
      );
      vi.mocked(
        participantsQueueRepository.reactivateLastDequeued
      ).mockResolvedValue([
        {
          id: "entry-1",
          person_id: "customer-1",
        },
      ]);

      await controller.revertLast(req, res as unknown as ServerResponse);

      expect(
        participantsQueueRepository.reactivateLastDequeued
      ).toHaveBeenCalledWith(queueMock.id, 1);
      expect(res.code).toHaveBeenCalledWith(200);
    });
  });
});
