import config from "../infra/config";

/**
 * `ALLOWED_ORIGIN` carrega DOIS papéis com exigências opostas:
 *
 *   1. CORS  — precisa de TODAS as origens que servem o frontend. O navegador
 *              compara a origem da página com o Access-Control-Allow-Origin de
 *              forma exata: `example.com` e `www.example.com` são distintas, e
 *              autorizar só uma bloqueia a outra em silêncio.
 *
 *   2. QR code — precisa de UMA origem só, porque o valor é interpolado dentro
 *              da URL gravada no código. Uma lista aqui produziria
 *              `https://a.com,https://b.com/entrar-fila?...`, inválida.
 *
 * A convenção: lista separada por vírgula, e a PRIMEIRA é a canônica.
 */

const raw = (): string =>
  config.get<string>("cors.allowedOrigin") || "http://localhost:3000";

/** Todas as origens autorizadas. Use no registro do CORS. */
export const allowedOrigins = (): string[] =>
  raw()
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

/**
 * Origem canônica — a primeira da lista. Use em qualquer URL que será
 * persistida ou impressa (QR code, e-mail), onde só cabe um valor.
 *
 * Trocar a primeira origem invalida QR codes já distribuídos, que apontam
 * para o host vigente no momento da geração. Mude com cuidado.
 */
export const canonicalOrigin = (): string =>
  allowedOrigins()[0] ?? "http://localhost:3000";
