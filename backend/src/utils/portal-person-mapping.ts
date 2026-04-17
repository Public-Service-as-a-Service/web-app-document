import type { PortalPersonData } from '@/data-contracts/employee/data-contracts';
import { PortalPersonDto } from '@/responses/employee.response';

/**
 * Strip upstream fields that should never reach the frontend
 * (home address, referenceNumber, mail-nickname, full org root, aboutMe, …)
 * and normalize `null` → `undefined` so the DTO shape is clean JSON.
 */
export const mapPortalPersonDataToDto = (src: PortalPersonData): PortalPersonDto => {
  const pickString = (value: string | null | undefined): string | undefined =>
    value == null ? undefined : value;

  return {
    personid: pickString(src.personid),
    givenname: pickString(src.givenname),
    lastname: pickString(src.lastname),
    fullname: pickString(src.fullname),
    email: pickString(src.email),
    workPhone: pickString(src.workPhone),
    mobilePhone: pickString(src.mobilePhone),
    company: pickString(src.company),
    companyId: src.companyId ?? undefined,
    orgTree: pickString(src.orgTree),
    isManager: src.isManager ?? undefined,
    loginName: pickString(src.loginName),
  };
};
