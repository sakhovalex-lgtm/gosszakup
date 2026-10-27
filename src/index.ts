import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { z } from "zod";
import { searchLots, getLot, getFilters } from "./goszakup.js";
import { searchSamrukLots, getSamrukLot } from "./samruk.js";

const server = new McpServer({
  name: "goszakup-kz",
  version: "1.0.0",
});

// ─── ГОСЗАКУП ИНСТРУМЕНТЫ ──────────────────────────────────────────────────

server.tool(
  "goszakup_search",
  "Поиск лотов на Госзакупе (goszakup.gov.kz). Возвращает активные тендеры с суммой, заказчиком, регионом, сроками.",
  {
    query: z.string().optional().describe("Ключевые слова для поиска по названию лота"),
    region: z.array(z.string()).optional().describe("Фильтр по регионам (напр. ['Алматы', 'Астана'])"),
    amount_min: z.number().optional().describe("Минимальная сумма лота в тенге"),
    amount_max: z.number().optional().describe("Максимальная сумма лота в тенге"),
    limit: z.number().optional().default(20).describe("Количество результатов (макс 100)"),
    offset: z.number().optional().default(0).describe("Смещение для пагинации"),
    sort_by: z.enum(["tender_publish_date", "lot_amount", "tender_end_date"]).optional().default("tender_publish_date"),
    sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  },
  async ({ query, region, amount_min, amount_max, limit, offset, sort_by, sort_order }) => {
    try {
      const result = await searchLots({
        query,
        region,
        amountMin: amount_min,
        amountMax: amount_max,
        limit: limit ?? 20,
        offset: offset ?? 0,
        sortBy: sort_by as any,
        sortOrder: sort_order,
      });

      const items = (result.items as any[]).map((lot: any) => ({
        id: lot.id,
        name: lot.nameRu,
        description: lot.descriptionRu,
        amount: lot.amount,
        status: lot.trdBuyLotStatusNameRu,
        region: lot.lotRegion?.nameRu,
        tender_id: lot.trdBuy?.id,
        tender_number: lot.trdBuyNumberAnno,
        publish_date: lot.trdBuy?.publishDate,
        end_date: lot.trdBuy?.endDate,
        customer: lot.trdBuy?.organizer?.nameRu,
        customer_bin: lot.trdBuy?.organizer?.bin,
        url: `https://goszakup.gov.kz/ru/announce/index/${lot.trdBuy?.id}`,
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ source: "goszakup", total: result.total, returned: items.length, lots: items }, null, 2),
        }],
      };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Ошибка: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "goszakup_lot_detail",
  "Получить полную информацию по конкретному лоту Госзакупа по его ID, включая документы и характеристики.",
  {
    lot_id: z.number().describe("ID лота из goszakup_search"),
  },
  async ({ lot_id }) => {
    try {
      const lot = await getLot(lot_id);
      return {
        content: [{ type: "text", text: JSON.stringify(lot, null, 2) }],
      };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Ошибка: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "goszakup_filters",
  "Получить доступные фильтры Госзакупа: регионы, статусы лотов, методы закупки.",
  {},
  async () => {
    try {
      const filters = await getFilters();
      return {
        content: [{ type: "text", text: JSON.stringify(filters, null, 2) }],
      };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Ошибка: ${e.message}` }], isError: true };
    }
  }
);

// ─── САМРУК ИНСТРУМЕНТЫ ────────────────────────────────────────────────────

server.tool(
  "samruk_search",
  "Поиск лотов на Самруке (zakup.sk.kz — квазигоссектор: КТЖ, КазМунайГаз, Казпочта и др.).",
  {
    query: z.string().optional().describe("Ключевые слова для поиска"),
    region: z.string().optional().describe("Регион заказчика"),
    amount_min: z.number().optional().describe("Минимальная сумма в тенге"),
    amount_max: z.number().optional().describe("Максимальная сумма в тенге"),
    limit: z.number().optional().default(20).describe("Количество результатов"),
    page: z.number().optional().default(1).describe("Номер страницы"),
  },
  async ({ query, region, amount_min, amount_max, limit, page }) => {
    try {
      const result = await searchSamrukLots({
        query,
        region,
        amountMin: amount_min,
        amountMax: amount_max,
        limit: limit ?? 20,
        page: page ?? 1,
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ source: "samruk", total: result.total, returned: (result.items as any[]).length, lots: result.items }, null, 2),
        }],
      };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Ошибка: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "samruk_lot_detail",
  "Получить полную информацию по конкретному лоту Самрука по его ID.",
  {
    lot_id: z.number().describe("ID лота из samruk_search"),
  },
  async ({ lot_id }) => {
    try {
      const lot = await getSamrukLot(lot_id);
      return {
        content: [{ type: "text", text: JSON.stringify(lot, null, 2) }],
      };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Ошибка: ${e.message}` }], isError: true };
    }
  }
);

// ─── HTTP / SSE СЕРВЕР ────────────────────────────────────────────────────

const app = express();
const transports: Record<string, SSEServerTransport> = {};

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => delete transports[transport.sessionId]);
  await server.connect(transport);
});

app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (!transport) { res.status(404).json({ error: "Session not found" }); return; }
  await transport.handlePostMessage(req, res);
});

app.get("/health", (_req, res) => res.json({ status: "ok", server: "goszakup-mcp" }));

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Goszakup MCP server running on port ${PORT}`));
