import { Controller, Get, Param, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { Response } from 'express';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import { serviceApiURL } from '@/utils/util';
import { AUTH_MODE } from '@config';
import authMiddleware from '@middlewares/auth.middleware';
import type { Account, Employeev2, PortalPersonData } from '@/data-contracts/employee/data-contracts';
import { PortalPersonDto } from '@/responses/employee.response';
import { mapPortalPersonDataToDto } from '@/utils/portal-person-mapping';
import { getMockEmployments } from '@/mocks/mock-employments';

const employeeURL = (...parts: string[]) => serviceApiURL('employee', ...parts);

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// Strip any domain prefix ("PERSONAL\\TEST" → "TEST") and uppercase.
// Upstream expects the bare loginName segment.
const normalizeLoginName = (raw: string): string => {
  const stripped = raw.includes('\\') ? raw.split('\\').pop() || '' : raw;
  return stripped.trim().toUpperCase();
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();

// RFC 4122 — accept any version. The lookup itself is the real gate against
// bogus input since upstream will 404, but this filters out obvious garbage.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalizePersonId = (raw: string): string => raw.trim().toLowerCase();

// Upstream accounts can include multiple domains (PERSONAL, external, ...).
// Prefer PERSONAL since that is what portalpersondata keys on.
const pickPersonalAccount = (accounts: Account[]): Account | undefined =>
  accounts.find((a) => (a.domain || '').toUpperCase().includes('PERSONAL')) ?? accounts[0];

@Controller()
@UseBefore(authMiddleware)
export class EmployeeController {
  private apiService = new ApiService();

  @Get('/employees/by-email/:email')
  @OpenAPI({ summary: 'Get employee portal data by email address' })
  @ResponseSchema(PortalPersonDto)
  async getEmployeeByEmail(@Param('email') email: string, @Res() response: Response) {
    const normalized = normalizeEmail(email);
    if (!normalized || !EMAIL_RE.test(normalized)) {
      throw new HttpException(400, 'Invalid email');
    }

    try {
      const cacheKey = `employee:email:${normalized}`;
      const cached = getCached<PortalPersonDto>(cacheKey);
      if (cached) {
        return response.status(200).json({ data: cached, message: 'success' });
      }

      const res = await this.apiService.get<PortalPersonData>({
        url: employeeURL('portalpersondata', encodeURIComponent(normalized)),
      });

      const dto = mapPortalPersonDataToDto(res.data);
      setCache(cacheKey, dto);
      if (dto.loginName) {
        setCache(`employee:${dto.loginName.toUpperCase()}`, dto);
      }

      return response.status(200).json({
        data: dto,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch employee by email ${normalized}: ${error}`);
      throw error;
    }
  }

  // Raw employment history for a person. Used by the dashboard attention list
  // to detect documents whose current responsible holder is about to leave
  // (employment `endDate` within the notification window).
  //
  // Temporary in scope: long-term, the review workflow in api-service-document
  // should compose this signal upstream and emit actionable events directly.
  @Get('/employees/by-personid/:personId/employments')
  @OpenAPI({ summary: 'Get employment records by personId' })
  async getEmployments(@Param('personId') personId: string, @Res() response: Response) {
    const normalized = normalizePersonId(personId);
    if (!normalized || !UUID_RE.test(normalized)) {
      throw new HttpException(400, 'Invalid personId');
    }

    try {
      const cacheKey = `employments:${normalized}`;
      const cached = getCached<Employeev2[]>(cacheKey);
      if (cached) {
        return response.status(200).json({ data: cached, message: 'success' });
      }

      // In local/dev AUTH_MODE=none there is no real upstream to reach. Serve
      // the mock fixture so the attention-list behaviour can be exercised
      // end-to-end without network access. Production (AUTH_MODE=oauth2)
      // always goes upstream.
      if (AUTH_MODE === 'none') {
        const mock = getMockEmployments(normalized);
        setCache(cacheKey, mock);
        return response.status(200).json({ data: mock, message: 'success' });
      }

      // Upstream expects `?PersonId=<uuid>`; response is an array of Employeev2,
      // typically with 0..N entries in `employments[]` per person.
      const res = await this.apiService.get<Employeev2[]>({
        url: employeeURL('employments'),
        params: { PersonId: normalized },
      });

      setCache(cacheKey, res.data);
      return response.status(200).json({ data: res.data, message: 'success' });
    } catch (error) {
      logger.error(`Failed to fetch employments for personId ${normalized}: ${error}`);
      throw error;
    }
  }

  @Get('/employees/by-personid/:personId')
  @OpenAPI({ summary: 'Get employee portal data by personId' })
  @ResponseSchema(PortalPersonDto)
  async getEmployeeByPersonId(@Param('personId') personId: string, @Res() response: Response) {
    const normalized = normalizePersonId(personId);
    if (!normalized || !UUID_RE.test(normalized)) {
      throw new HttpException(400, 'Invalid personId');
    }

    try {
      const cacheKey = `employee:personid:${normalized}`;
      const cached = getCached<PortalPersonDto>(cacheKey);
      if (cached) {
        return response.status(200).json({ data: cached, message: 'success' });
      }

      // Chain: personId -> accounts (upstream) -> loginName -> portalpersondata.
      // Two upstream calls, both cached for an hour, so repeat lookups are free.
      const accountsRes = await this.apiService.get<Account[]>({
        url: employeeURL('employed', normalized, 'accounts'),
      });
      const personal = pickPersonalAccount(accountsRes.data || []);
      const loginName = personal?.loginname?.trim();
      if (!loginName) {
        throw new HttpException(404, 'Not Found');
      }

      const upperLoginName = loginName.toUpperCase();
      const portalRes = await this.apiService.get<PortalPersonData>({
        url: employeeURL('portalpersondata', 'personal', upperLoginName),
      });

      const dto = mapPortalPersonDataToDto(portalRes.data);
      setCache(cacheKey, dto);
      setCache(`employee:${upperLoginName}`, dto);

      return response.status(200).json({ data: dto, message: 'success' });
    } catch (error) {
      logger.error(`Failed to fetch employee by personId ${normalized}: ${error}`);
      throw error;
    }
  }

  @Get('/employees/:loginName')
  @OpenAPI({ summary: 'Get employee portal data by loginName' })
  @ResponseSchema(PortalPersonDto)
  async getEmployee(@Param('loginName') loginName: string, @Res() response: Response) {
    const normalized = normalizeLoginName(loginName);
    if (!normalized) {
      throw new HttpException(400, 'Invalid loginName');
    }

    try {
      const cacheKey = `employee:${normalized}`;
      const cached = getCached<PortalPersonDto>(cacheKey);
      if (cached) {
        return response.status(200).json({ data: cached, message: 'success' });
      }

      const res = await this.apiService.get<PortalPersonData>({
        url: employeeURL('portalpersondata', 'personal', normalized),
      });

      const dto = mapPortalPersonDataToDto(res.data);
      setCache(cacheKey, dto);

      return response.status(200).json({
        data: dto,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch employee ${normalized}: ${error}`);
      throw error;
    }
  }
}
