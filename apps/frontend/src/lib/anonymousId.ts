import { uuidv7 } from "uuidv7";

const STORAGE_KEY = "fd:anonymous_id";

// Cache em memória. Existe por dois motivos:
//   1. Torna o retorno estável dentro da sessão — `useSyncExternalStore` chama
//      getSnapshot a cada render e entra em loop infinito se o valor mudar.
//   2. Evita ler o localStorage repetidamente.
let cached: string | null = null;

export const getAnonymousId = (): string => {
  if (cached) return cached;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
    const id = uuidv7();
    // Era `setItemtem` — método inexistente, lançava TypeError e caía no catch
    // abaixo. O ID nunca era persistido, então cada chamada devolvia um UUID
    // novo e o usuário anônimo perdia a identidade a cada carregamento.
    localStorage.setItem(STORAGE_KEY, id);
    cached = id;
    return id;
  } catch {
    // localStorage indisponível (modo privado, cookies bloqueados). Mantém um
    // ID só para a vida da aba, em vez de gerar um novo a cada chamada.
    cached = uuidv7();
    return cached;
  }
};

export const clearAnonymousId = (): void => {
  cached = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};
