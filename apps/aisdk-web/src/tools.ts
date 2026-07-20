// Browser-safe demo tools for the AI SDK harness. They auto-execute inside the
// streamText agent loop, so a prompt like "what's 21*2 and the weather in Tokyo?"
// makes the model open real tool cards in the thread. Schemas use the AI SDK's
// jsonSchema() helper so there's no zod dependency; getWeather is a live,
// key-less, CORS-open fetch to open-meteo.
import { jsonSchema, tool, type ToolSet } from "ai";

interface GeoResult {
  readonly results?: readonly { readonly name: string; readonly country_code?: string; readonly latitude: number; readonly longitude: number }[];
}
interface ForecastResult {
  readonly current?: { readonly temperature_2m?: number; readonly wind_speed_10m?: number };
}

export const demoTools: ToolSet = {
  calculator: tool({
    description: "Compute a basic arithmetic operation on two numbers.",
    inputSchema: jsonSchema<{ a: number; b: number; op: "add" | "subtract" | "multiply" | "divide" }>({
      type: "object",
      properties: {
        a: { type: "number" },
        b: { type: "number" },
        op: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
      },
      required: ["a", "b", "op"],
      additionalProperties: false,
    }),
    execute: async ({ a, b, op }) => {
      const result = op === "add" ? a + b : op === "subtract" ? a - b : op === "multiply" ? a * b : b === 0 ? Number.NaN : a / b;
      return { a, b, op, result };
    },
  }),
  getCurrentTime: tool({
    description: "Get the current date and time in a given IANA timezone (defaults to UTC).",
    inputSchema: jsonSchema<{ timezone?: string }>({
      type: "object",
      properties: { timezone: { type: "string", description: "IANA name, e.g. America/New_York" } },
      additionalProperties: false,
    }),
    execute: async ({ timezone }) => {
      const zone = timezone && timezone.length > 0 ? timezone : "UTC";
      try {
        return { timezone: zone, now: new Date().toLocaleString("en-US", { timeZone: zone }) };
      } catch {
        return { error: `Unknown timezone "${zone}".` };
      }
    },
  }),
  getWeather: tool({
    description: "Get the live current temperature and wind for a city.",
    inputSchema: jsonSchema<{ city: string }>({
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
      additionalProperties: false,
    }),
    execute: async ({ city }) => {
      const geo = (await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
      ).then((r) => r.json())) as GeoResult;
      const place = geo.results?.[0];
      if (!place) return { error: `No location found for "${city}".` };
      const wx = (await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m`,
      ).then((r) => r.json())) as ForecastResult;
      return {
        location: place.country_code ? `${place.name}, ${place.country_code}` : place.name,
        temperatureC: wx.current?.temperature_2m,
        windSpeedKph: wx.current?.wind_speed_10m,
      };
    },
  }),
};
