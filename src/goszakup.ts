const BASE = "https://ows.goszakup.gov.kz";

export interface SearchLotsParams {
  query?: string;
  status?: string[];
  region?: string[];
  category?: string[];
  amountMin?: number;
  amountMax?: number;
  sortBy?: "tender_publish_date" | "lot_amount" | "tender_end_date";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(`${BASE}/app/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL error: ${res.status}`);
  const data = await res.json() as { data?: unknown; errors?: unknown[] };
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data.data;
}

export async function searchLots(params: SearchLotsParams = {}) {
  const {
    query,
    status = ["PUBLISHED"],
    region,
    amountMin,
    amountMax,
    sortBy = "PUBLISH_DATE",
    sortOrder = "DESC",
    limit = 20,
    offset = 0,
  } = params;

  const filter: Record<string, unknown> = { lotStatusList: status };
  if (query) filter["lotName"] = query;
  if (region?.length) filter["lotRegions"] = region;
  if (amountMin) filter["sumFrom"] = amountMin;
  if (amountMax) filter["sumTo"] = amountMax;

  const q = `
    query SearchLots($filter: LotFilter, $limit: Int, $offset: Int, $sortBy: String, $sortOrder: String) {
      Lots(filter: $filter, limit: $limit, offset: $offset, sortBy: $sortBy, sortOrder: $sortOrder) {
        total
        items {
          id
          nameRu
          descriptionRu
          amount
          trdBuyLotStatusNameRu
          trdBuyNumberAnno
          lotRegion { nameRu }
          refTrdBuyTypeDetailList { nameRu }
          trdBuy {
            id
            numberAnno
            publishDate
            endDate
            organizer { nameRu bin }
          }
        }
      }
    }
  `;

  const data = await gql(q, { filter, limit, offset, sortBy, sortOrder }) as any;
  return data?.Lots ?? { total: 0, items: [] };
}

export async function getLot(id: number) {
  const q = `
    query GetLot($id: Int!) {
      Lot(id: $id) {
        id
        nameRu
        descriptionRu
        amount
        count
        trdBuyLotStatusNameRu
        trdBuyNumberAnno
        lotRegion { nameRu }
        trdBuy {
          id
          numberAnno
          publishDate
          endDate
          finishDate
          totalSum
          organizer { nameRu bin kato { nameRu } }
          trdBuyForms { nameRu }
          files { nameRu filePath }
        }
        trdBuyLots {
          nameRu
          amount
          count
          unitNameRu
        }
      }
    }
  `;
  const data = await gql(q, { id }) as any;
  return data?.Lot;
}

export async function getFilters() {
  const q = `
    query {
      RefRegions { id nameRu }
      RefLotStatuses { id nameRu }
      RefTrdBuyTypeDetails { id nameRu }
    }
  `;
  const data = await gql(q) as any;
  return data;
}
