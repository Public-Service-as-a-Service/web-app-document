import { Controller, Get, Param, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { Request, Response } from 'express';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import { serviceApiURL } from '@/utils/util';
import authMiddleware from '@middlewares/auth.middleware';
import {
  CompanyIdDto,
  DepartmentTeamDto,
  LegalEntityIdDto,
  OrgNodeDto,
  OrgTreeDto,
} from '@/responses/company.response';

const companyURL = (...parts: string[]) => serviceApiURL('company', ...parts);

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

/**
 * Remove padding nodes that the upstream API inserts to fill 6 levels.
 *
 * A child with the same orgName as its parent is a padding duplicate:
 *   - If it has its own unique children → promote them to the parent
 *   - If it has no children (or only more same-name dupes) → drop it
 *
 * Processes bottom-up so deeply nested chains collapse fully.
 */
function deduplicateTree(node: OrgTreeDto): OrgTreeDto {
  if (!node.organizations || node.organizations.length === 0) {
    return node;
  }

  // Recurse into children first (bottom-up)
  let children = node.organizations.map((child) => deduplicateTree(child));

  // Collapse same-name children — loop because promoting can introduce new dupes
  let changed = true;
  while (changed) {
    changed = false;
    const next: OrgTreeDto[] = [];

    for (const child of children) {
      if (child.orgName === node.orgName) {
        // Padding node — promote its children or drop it
        if (child.organizations && child.organizations.length > 0) {
          next.push(...child.organizations);
        }
        changed = true;
      } else {
        next.push(child);
      }
    }

    children = next;
  }

  return {
    ...node,
    organizations: children.length > 0 ? children : undefined,
  };
}

@Controller()
@UseBefore(authMiddleware)
export class CompanyController {
  private apiService = new ApiService();

  @Get('/company/:orgId/companyid')
  @OpenAPI({ summary: 'Get company ID for an organization' })
  @ResponseSchema(CompanyIdDto)
  async getCompanyId(@Param('orgId') orgId: string, @Res() response: Response) {
    try {
      const res = await this.apiService.get<CompanyIdDto>({
        url: companyURL(orgId, 'companyid'),
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to get company ID for org ${orgId}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to get company ID');
    }
  }

  @Get('/company/:companyId/legalentityid')
  @OpenAPI({ summary: 'Get legal entity ID for a company' })
  @ResponseSchema(LegalEntityIdDto)
  async getLegalEntityId(@Param('companyId') companyId: string, @Res() response: Response) {
    try {
      const res = await this.apiService.get<LegalEntityIdDto>({
        url: companyURL(companyId, 'legalentityid'),
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to get legal entity ID for company ${companyId}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to get legal entity ID');
    }
  }

  @Get('/company/orgnodesroot')
  @OpenAPI({ summary: 'List root-level organization nodes' })
  @ResponseSchema(OrgNodeDto, { isArray: true })
  async getOrgNodesRoot(@Res() response: Response) {
    try {
      const cacheKey = 'orgnodesroot';
      const cached = getCached<OrgNodeDto[]>(cacheKey);
      if (cached) {
        return response.status(200).json({ data: cached, message: 'success' });
      }

      const res = await this.apiService.get<OrgNodeDto[]>({
        url: companyURL('orgnodesroot'),
      });

      setCache(cacheKey, res.data);
      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to get org root nodes: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to get org root nodes');
    }
  }

  @Get('/company/:companyId/orgnodes')
  @OpenAPI({ summary: 'List organization nodes under a company' })
  @ResponseSchema(OrgNodeDto, { isArray: true })
  async getOrgNodes(@Param('companyId') companyId: string, @Res() response: Response) {
    try {
      const res = await this.apiService.get<OrgNodeDto[]>({
        url: companyURL(companyId, 'orgnodes'),
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to get org nodes for company ${companyId}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to get org nodes');
    }
  }

  @Get('/company/:orgId/orgtree')
  @OpenAPI({ summary: 'Get full organization tree rooted at orgId' })
  @ResponseSchema(OrgTreeDto)
  async getOrgTree(@Param('orgId') orgId: string, @Res() response: Response) {
    try {
      const cacheKey = `orgtree:${orgId}`;
      const cached = getCached<OrgTreeDto>(cacheKey);
      if (cached) {
        return response.status(200).json({ data: cached, message: 'success' });
      }

      const res = await this.apiService.get<OrgTreeDto>({
        url: companyURL(orgId, 'orgtree'),
      });

      setCache(cacheKey, res.data);
      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to get org tree for org ${orgId}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to get org tree');
    }
  }

  @Get('/company/orgtrees')
  @OpenAPI({ summary: 'List all org trees, padding-deduplicated' })
  @ResponseSchema(OrgTreeDto, { isArray: true })
  async getAllOrgTrees(@Res() response: Response) {
    try {
      const cacheKey = 'orgtrees:all';
      const cached = getCached<OrgTreeDto[]>(cacheKey);
      if (cached) {
        return response.status(200).json({ data: cached, message: 'success' });
      }

      const rootRes = await this.apiService.get<OrgNodeDto[]>({
        url: companyURL('orgnodesroot'),
      });
      const roots = rootRes.data || [];

      const treeResults = await Promise.all(
        roots.map((root) =>
          this.apiService
            .get<OrgTreeDto>({ url: companyURL(String(root.orgId), 'orgtree') })
            .then((res) => res.data)
            .catch(() => null)
        )
      );

      const trees = treeResults
        .filter((t): t is OrgTreeDto => t !== null)
        .map((tree) => deduplicateTree(tree));
      setCache(cacheKey, trees);

      return response.status(200).json({
        data: trees,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to get all org trees: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to get org trees');
    }
  }

  @Get('/company/departmentteams')
  @OpenAPI({ summary: 'List department teams (optionally filtered via query params)' })
  @ResponseSchema(DepartmentTeamDto, { isArray: true })
  async getDepartmentTeams(@Req() req: Request, @Res() response: Response) {
    try {
      const res = await this.apiService.get<DepartmentTeamDto[]>({
        url: companyURL('departmentteams'),
        params: req.query,
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to get department teams: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to get department teams');
    }
  }
}
