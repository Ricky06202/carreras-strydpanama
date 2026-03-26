import { expect, test, describe, spyOn } from "bun:test";
import { api } from "./api";

describe("api.ts - registerParticipant", () => {
  const mockEnv = {
    SONICJS_API_URL: "https://api.test.com",
    SONICJS_API_EMAIL: "test@test.com",
    SONICJS_API_PASSWORD: "password123"
  };

  test("should call /api/content with correct payload", async () => {
    const participantData = {
      firstName: "Juan",
      lastName: "Perez",
      email: "juan@test.com"
    };

    // Mock global fetch
    global.fetch = (async (url: any, options: any) => {
      // Mock login response
      if (url.includes("/auth/login")) {
        return new Response(JSON.stringify({ token: "fake-token" }), { status: 200 });
      }
      // Mock creation response
      if (url.includes("/api/content")) {
        const body = JSON.parse(options.body);
        expect(body.collectionId).toBe("col-participants-93d1ac21");
        expect(body.title).toBe("Juan Perez");
        expect(body.data.email).toBe("juan@test.com");
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(null, { status: 404 });
    }) as any;

    try {
      const result = await api.registerParticipant(mockEnv, participantData);
      expect(result.success).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("should handle error if API fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (url: any) => {
      if (url.includes("/auth/login")) {
        return new Response(JSON.stringify({ token: "fake-token" }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "Failed" }), { status: 500 });
    }) as any;

    try {
        await expect(api.registerParticipant(mockEnv, {})).rejects.toThrow(/API Error/);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
