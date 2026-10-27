const BASE = "https://zakup.sk.kz/api";

export interface SearchSamrukParams {
  query?: string;
  status?: string;
  region?: string;
  amountMin?: number;
  amountMax?: number;
  limit?: number;
  page?: number;
}

export async function searchSamrukLots(params: SearchSamrukParams = {}) {
  const { query, status = "PUBLISHED", region, amountMin, amountMax, limit = 20, page = 1 } = params;

  const body: Record<string, unknown> = {
    filter: {
      ...(query && { searchText: query }),
      lotStatusList: [status],
      ...(region && { customerRegions: [region] }),
      ...(amountMin && { totalPriceFrom: amountMin }),
      ...(amountMax && { totalPriceTo: amountMax }),
    },
    pageSize: limit,
    pageNumber: page,
    sortField: "acceptanceBeginDt",
    sortDirection: "DESC",
  };

  const res = await fetch(`${BASE}/lots/filter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Samruk API error: ${res.status}`);
  const data = await res.json() as { total?: number; content?: unknown[] };
  return {
    total: data.total ?? 0,
    items: data.content ?? [],
  };
}

export async function getSamrukLot(id: number) {
  const res = await fetch(`${BASE}/lots/${id}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Samruk lot error: ${res.status}`);
  return await res.json();
}
