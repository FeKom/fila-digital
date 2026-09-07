"use client";

import { useSyncExternalStore } from "react";
import { getAnonymousId } from "./anonymousId";

// O ID é gravado uma vez e não muda durante a sessão, então não há o que
// assinar. Referência estável para o React não reassinar a cada render.
const noopSubscribe = () => () => {};

// No servidor não existe localStorage. A string vazia é o mesmo valor que o
// `useState("")` anterior renderizava no SSR, então a hidratação bate.
const getServerSnapshot = () => "";

/**
 * Lê o ID anônimo do localStorage de forma segura para SSR.
 *
 * Substitui o padrão `useState("")` + `useEffect(() => setState(...), [])`,
 * que dispara `react-hooks/set-state-in-effect`: setState síncrono dentro de
 * efeito força um segundo render em cascata. `useSyncExternalStore` é a via
 * que o React oferece para ler store externa sem esse custo.
 */
export const useAnonymousId = (): string =>
  useSyncExternalStore(noopSubscribe, getAnonymousId, getServerSnapshot);
