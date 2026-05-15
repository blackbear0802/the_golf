// 네이버 밴드 Open API OAuth 2.0 어댑터 — authorize URL, code↔token 교환, refresh.
// 토큰 응답 스키마는 표준 OAuth 2.0 외에 expires_in/refresh_token 유무가 가변적이라
// 모든 값을 optional로 다루고 호출자가 만료 여부를 판단한다.

const AUTH_BASE = "https://auth.band.us";

export type BandTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number; // 초 단위 (있을 때만)
  token_type?: string;
  scope?: string;
  user_key?: string;
};

export class BandOAuthError extends Error {
  constructor(public statusCode: number, public body: string) {
    super(`Band OAuth error (status=${statusCode}): ${body.slice(0, 200)}`);
    this.name = "BandOAuthError";
  }
}

function basicAuth(clientId: string, clientSecret: string): string {
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state?: string;
  scope?: string;
}): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
  });
  if (params.state) q.set("state", params.state);
  if (params.scope) q.set("scope", params.scope);
  return `${AUTH_BASE}/oauth2/authorize?${q.toString()}`;
}

export async function exchangeCodeForToken(args: {
  clientId: string;
  clientSecret: string;
  code: string;
}): Promise<BandTokenResponse> {
  const q = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
  });
  const res = await fetch(`${AUTH_BASE}/oauth2/token?${q.toString()}`, {
    method: "GET",
    headers: { Authorization: basicAuth(args.clientId, args.clientSecret) },
  });
  const text = await res.text();
  if (!res.ok) throw new BandOAuthError(res.status, text);
  return parseTokenResponse(text);
}

export async function refreshAccessToken(args: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<BandTokenResponse> {
  const q = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: args.refreshToken,
  });
  const res = await fetch(`${AUTH_BASE}/oauth2/token?${q.toString()}`, {
    method: "GET",
    headers: { Authorization: basicAuth(args.clientId, args.clientSecret) },
  });
  const text = await res.text();
  if (!res.ok) throw new BandOAuthError(res.status, text);
  return parseTokenResponse(text);
}

function parseTokenResponse(text: string): BandTokenResponse {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BandOAuthError(200, `non-JSON token response: ${text.slice(0, 200)}`);
  }
  const obj = json as Record<string, unknown>;
  const access = obj.access_token;
  if (typeof access !== "string" || !access) {
    throw new BandOAuthError(200, `missing access_token: ${text.slice(0, 200)}`);
  }
  return {
    access_token: access,
    refresh_token: typeof obj.refresh_token === "string" ? obj.refresh_token : undefined,
    expires_in: typeof obj.expires_in === "number" ? obj.expires_in : undefined,
    token_type: typeof obj.token_type === "string" ? obj.token_type : undefined,
    scope: typeof obj.scope === "string" ? obj.scope : undefined,
    user_key: typeof obj.user_key === "string" ? obj.user_key : undefined,
  };
}
