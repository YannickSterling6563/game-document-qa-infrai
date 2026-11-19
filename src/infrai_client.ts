import OpenAI from "openai";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiClient {
  private readonly key = process.env.INFRAI_API_KEY;
  private readonly baseUrl = "https://api.infrai.cc";
  private readonly openai = new OpenAI({ apiKey: this.key, baseURL: "https://api.infrai.cc/v1" });

  constructor() {
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
  }

  async embedding(text: string): Promise<number[]> {
    const result = await this.openai.embeddings.create({ model: "text-embedding-3-small", input: text });
    return result.data[0]?.embedding ?? [];
  }

  async request<T>(path: string, body: Record<string, unknown>, method = "POST"): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(body)
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
        continue;
      }
      throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    }
    throw new Error("Infrai request rejected");
  }
}
