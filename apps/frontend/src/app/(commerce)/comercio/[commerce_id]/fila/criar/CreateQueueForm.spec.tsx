import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateQueueForm from "./CreateQueueForm";

// server actions and router are external — mock them
vi.mock("@/domains/queue/queue.actions", () => ({
  createQueue: vi.fn(),
  createQueueSchedule: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import * as queueActions from "@/domains/queue/queue.actions";

const mockCreateQueue = vi.mocked(queueActions.createQueue);
const mockCreateSchedule = vi.mocked(queueActions.createQueueSchedule);

describe("CreateQueueForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateQueue.mockResolvedValue({
      id: "q-1",
      commerce_id: "c-1",
      name: "Test",
      description: "",
      type: "permanent",
      status: "closed",
      qrcode_token: "tok",
      created_at: "",
    });
    mockCreateSchedule.mockResolvedValue({ data: undefined });
  });

  it("renders all form fields", () => {
    render(<CreateQueueForm commerceId="c-1" />);
    expect(screen.getByLabelText(/nome da fila/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it("renders schedule type toggle buttons", () => {
    render(<CreateQueueForm commerceId="c-1" />);
    expect(
      screen.getByRole("button", { name: /sem agendamento/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /uma vez/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /todo dia/i })
    ).toBeInTheDocument();
  });

  it("shows datetime picker when 'uma vez' is selected", async () => {
    render(<CreateQueueForm commerceId="c-1" />);
    await userEvent.click(screen.getByRole("button", { name: /uma vez/i }));
    expect(screen.getByLabelText(/data e hora/i)).toBeInTheDocument();
  });

  it("hides datetime picker when 'sem agendamento' is selected", async () => {
    render(<CreateQueueForm commerceId="c-1" />);
    await userEvent.click(screen.getByRole("button", { name: /uma vez/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /sem agendamento/i })
    );
    expect(screen.queryByLabelText(/data e hora/i)).not.toBeInTheDocument();
  });

  it("shows commerce open_at hint when 'todo dia' is selected", async () => {
    render(<CreateQueueForm commerceId="c-1" commerceOpenAt="09:00" />);
    await userEvent.click(screen.getByRole("button", { name: /todo dia/i }));
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
  });

  it("calls createQueue on submit without schedule", async () => {
    render(<CreateQueueForm commerceId="c-1" />);
    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: /criar fila/i }).closest("form")!
      );
    });
    await vi.waitFor(() => expect(mockCreateQueue).toHaveBeenCalledOnce());
    expect(mockCreateSchedule).not.toHaveBeenCalled();
  });

  it("calls createQueueSchedule with type='daily' when 'todo dia' is selected", async () => {
    render(<CreateQueueForm commerceId="c-1" />);
    await userEvent.click(screen.getByRole("button", { name: /todo dia/i }));
    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: /criar fila/i }).closest("form")!
      );
    });
    await vi.waitFor(() =>
      expect(mockCreateSchedule).toHaveBeenCalledWith(
        "c-1",
        "q-1",
        expect.objectContaining({ type: "daily" })
      )
    );
  });

  it("calls createQueueSchedule with type='once' and scheduled_at when 'uma vez' is selected", async () => {
    render(<CreateQueueForm commerceId="c-1" />);
    await userEvent.click(screen.getByRole("button", { name: /uma vez/i }));
    await userEvent.type(
      screen.getByLabelText(/data e hora/i),
      "2026-12-01T10:00"
    );
    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: /criar fila/i }).closest("form")!
      );
    });
    await vi.waitFor(() =>
      expect(mockCreateSchedule).toHaveBeenCalledWith(
        "c-1",
        "q-1",
        expect.objectContaining({ type: "once" })
      )
    );
  });

  it("shows error message when createQueue fails", async () => {
    mockCreateQueue.mockResolvedValue(null);
    render(<CreateQueueForm commerceId="c-1" />);
    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: /criar fila/i }).closest("form")!
      );
    });
    await vi.waitFor(() =>
      expect(screen.getByText(/erro ao criar fila/i)).toBeInTheDocument()
    );
  });

  it("shows error message when createQueueSchedule fails", async () => {
    mockCreateSchedule.mockResolvedValue({ error: "Erro no agendamento" });
    render(<CreateQueueForm commerceId="c-1" />);
    await userEvent.click(screen.getByRole("button", { name: /todo dia/i }));
    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: /criar fila/i }).closest("form")!
      );
    });
    await vi.waitFor(() =>
      expect(screen.getByText("Erro no agendamento")).toBeInTheDocument()
    );
  });

  it("disables submit button while loading", async () => {
    mockCreateQueue.mockImplementation(
      () => new Promise((r) => setTimeout(r, 500))
    );
    render(<CreateQueueForm commerceId="c-1" />);
    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: /criar fila/i }).closest("form")!
      );
    });
    expect(screen.getByRole("button", { name: /criando/i })).toBeDisabled();
  });
});
