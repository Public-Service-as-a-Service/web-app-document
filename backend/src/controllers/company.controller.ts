import { Controller, Get, Param, Req, Res, UseBefore } from 'routing-controllers';
import { Request, Response } from 'express';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import { serviceApiURL } from '@/utils/util';
import authMiddleware from '@middlewares/auth.middleware';
import type {
  CompanyId,
  LegalEntityId,
  OrgNode,
  OrgTree,
  DepartmentTeam,
} from '@/interfaces/company.interface';

const companyURL = (...parts: string[]) => serviceApiURL('company', ...parts);

@Controller()
@UseBefore(authMiddleware)
export class CompanyController {
  private apiService = new ApiService();

  @Get('/company/:orgId/companyid')
  async getCompanyId(@Param('orgId') orgId: string, @Res() response: Response) {
    try {
      const res = await this.apiService.get<CompanyId>({
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
  async getLegalEntityId(@Param('companyId') companyId: string, @Res() response: Response) {
    try {
      const res = await this.apiService.get<LegalEntityId>({
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
  async getOrgNodesRoot(@Res() response: Response) {
    try {
      const res = await this.apiService.get<OrgNode[]>({
        url: companyURL('orgnodesroot'),
      });

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
  async getOrgNodes(@Param('companyId') companyId: string, @Res() response: Response) {
    try {
      const res = await this.apiService.get<OrgNode[]>({
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
  async getOrgTree(@Param('orgId') orgId: string, @Res() response: Response) {
    try {
      const res = await this.apiService.get<OrgTree>({
        url: companyURL(orgId, 'orgtree'),
      });

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

  @Get('/company/departmentteams')
  async getDepartmentTeams(@Req() req: Request, @Res() response: Response) {
    try {
      const res = await this.apiService.get<DepartmentTeam[]>({
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
