/**
 * Estado de encerramento do processo.
 *
 * Módulo separado de propósito: `server.ts` precisa escrever a flag e
 * `infra/routes/health.ts` precisa lê-la. Se a flag morasse em `server.ts`,
 * o health importaria dele enquanto ele já importa `registerHealthRoute` —
 * dependência circular, que em ESM resolve com live binding mas é frágil
 * e sensível à ordem de avaliação.
 */

let shuttingDown = false;

/** Chamado no início do graceful shutdown, antes de fechar qualquer conexão. */
export const markShuttingDown = (): void => {
  shuttingDown = true;
};

/**
 * Consultado pela readiness probe. Durante o dreno o pod ainda atende o que
 * está em voo, mas precisa sair dos Endpoints do Service para não receber
 * requisição nova.
 */
export const isShuttingDown = (): boolean => shuttingDown;
