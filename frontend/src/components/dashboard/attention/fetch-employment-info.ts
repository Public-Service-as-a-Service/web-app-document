import { apiService, ApiResponse } from '@services/api-service';
import type { Employee } from '@interfaces/employee.interface';
import { summarisePerson } from './build-attention-items';
import type { ResponsiblePersonInfo } from './types';

// Session-level cache keyed by personId. Dedupes concurrent fetches from
// the same render pass, and back-to-back navigations (dashboard → detail)
// that resolve the same holders. The backend itself caches upstream for an
// hour, so stale windows are equivalent; this layer only avoids repeating
// the roundtrip within one browser session.
const cache = new Map<string, Promise<ResponsiblePersonInfo>>();

const fetchOne = (personId: string): Promise<ResponsiblePersonInfo> => {
  const cached = cache.get(personId);
  if (cached) return cached;
  const promise = apiService
    .get<ApiResponse<Employee[]>>(
      `employees/by-personid/${encodeURIComponent(personId)}/employments`
    )
    .then((res) => summarisePerson(res.data.data))
    .catch<ResponsiblePersonInfo>(() => ({ maxEndDate: null, name: '' }));
  cache.set(personId, promise);
  return promise;
};

export const fetchEmploymentInfoMap = async (
  personIds: readonly string[]
): Promise<Map<string, ResponsiblePersonInfo>> => {
  const unique = Array.from(new Set(personIds));
  const entries = await Promise.all(
    unique.map(async (pid): Promise<[string, ResponsiblePersonInfo]> => [
      pid,
      await fetchOne(pid),
    ])
  );
  return new Map(entries);
};
