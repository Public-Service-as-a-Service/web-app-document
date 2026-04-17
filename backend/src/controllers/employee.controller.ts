import { Controller, Get, Param, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { Response } from 'express';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import { serviceApiURL } from '@/utils/util';
import authMiddleware from '@middlewares/auth.middleware';
import type { PortalPersonData } from '@/data-contracts/employee/data-contracts';
import { PortalPersonDto } from '@/responses/employee.response';
import { mapPortalPersonDataToDto } from '@/utils/portal-person-mapping';

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
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to fetch employee');
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
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to fetch employee');
    }
  }
}
