import { createClient } from "@libsql/client/web";

const TURSO_URL =
  process.env.NEXT_PUBLIC_TURSO_DATABASE_URL ||
  "libsql://levelup-duokarma.aws-ap-south-1.turso.io";

const TURSO_AUTH_TOKEN =
  process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI3MzI2MjYsImlkIjoiMDFhMTY3MzAtYmEwMS03YTlmLWExNDItYjg3NWI3N2JiMDM2Iiwia2lkIjoiU3U0NU9Ibmh4Y3lLTVF6RFphcWNJOGNiRVNyNFFYVmt1d2V5a3VnUWpPdyIsInJpZCI6IjQwYjc1NGU4LTYxYzAtNGVlMC05NGE0LTllZmJmMzQzMjg5NSJ9.TLGvtl1n1OSX81WXhu0MjMoW6jv9Xw9baG66yusOs08G7xNDTwzZ5VMGyHpeyQQnMpLAT9isUsTlP-Vk50njCg";

let clientInstance: ReturnType<typeof createClient> | null = null;

export function getTursoClient() {
  if (!clientInstance) {
    clientInstance = createClient({
      url: TURSO_URL,
      authToken: TURSO_AUTH_TOKEN,
    });
  }
  return clientInstance;
}
