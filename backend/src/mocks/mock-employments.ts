import type { Employeev2 } from '@/data-contracts/employee/data-contracts';

// Mock employment data for local/dev use when AUTH_MODE=none.
//
// Three scenarios covered:
//   - Expiring soon: Martin — endDate 14 days out, so the attention list should
//     flag any document where he is the responsible holder.
//   - Already expired: Edwin — endDate 60 days in the past, so any document
//     where he is responsible is overdue for hand-off.
//   - All good: Anna — endDate far in the future, should never raise a flag.
//
// Shape mirrors the upstream `/employee/2.0/{municipalityId}/employments`
// response: an array of persons, each with an `employments[]` array. See
// backend/src/data-contracts/employee/data-contracts.ts (Employeev2).
//
// This mock exists only for local development. In production the controller
// bypasses this and hits the real upstream via `ApiService`.

const daysFromNow = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  // Upstream uses ISO with no "Z" suffix; match that format.
  return `${d.toISOString().slice(0, 19)}`;
};

const MARTIN_ID = '97edca90-7fa8-457e-8223-aa078055465c';
const EDWIN_ID = '2ea5ebe4-dc69-497b-89c6-9013724b19b8';
const ANNA_ID = 'f3a19c2e-1d84-4b7c-9c5a-0c21a5b3d8e2';

const mockEmployments: Record<string, Employeev2> = {
  [MARTIN_ID]: {
    personId: MARTIN_ID,
    personNumber: '198203140123',
    isClassified: false,
    givenname: 'Martin',
    middlename: null,
    lastname: 'Hansson',
    accounts: [
      { domain: 'PERSONAL', loginname: 'mar14han', companyId: 1, emailAddress: 'martin.hansson@sundsvall.se' },
    ],
    employments: [
      {
        companyId: 1,
        startDate: '2019-03-01T00:00:00',
        endDate: daysFromNow(14),
        employmentType: 0,
        title: 'Utredare',
        orgId: 2836,
        orgName: 'KSK AVD Digitalisering IT stab',
        topOrgId: 28,
        topOrgName: 'Kommunstyrelsekontoret',
        isManual: false,
        isMainEmployment: true,
        isManager: false,
        employmentId: 100001,
      },
    ],
  },
  [EDWIN_ID]: {
    personId: EDWIN_ID,
    personNumber: '197707250739',
    isClassified: false,
    givenname: 'Edwin',
    middlename: null,
    lastname: 'Molina',
    accounts: [
      { domain: 'PERSONAL', loginname: 'edw25mol', companyId: 1, emailAddress: 'edwin.molina@sundsvall.se' },
    ],
    employments: [
      {
        companyId: 1,
        startDate: '2020-01-15T00:00:00',
        endDate: daysFromNow(-60),
        employmentType: 0,
        title: 'Konsult',
        orgId: 2836,
        orgName: 'KSK AVD Digitalisering IT stab',
        topOrgId: 28,
        topOrgName: 'Kommunstyrelsekontoret',
        isManual: true,
        isMainEmployment: false,
        isManager: false,
        employmentId: 128199,
      },
    ],
  },
  [ANNA_ID]: {
    personId: ANNA_ID,
    personNumber: '198509121234',
    isClassified: false,
    givenname: 'Anna',
    middlename: null,
    lastname: 'Lindqvist',
    accounts: [
      { domain: 'PERSONAL', loginname: 'ann09lin', companyId: 1, emailAddress: 'anna.lindqvist@sundsvall.se' },
    ],
    employments: [
      {
        companyId: 1,
        startDate: '2015-08-10T00:00:00',
        endDate: daysFromNow(3650),
        employmentType: 0,
        title: 'Enhetschef',
        orgId: 2836,
        orgName: 'KSK AVD Digitalisering IT stab',
        topOrgId: 28,
        topOrgName: 'Kommunstyrelsekontoret',
        isManual: false,
        isMainEmployment: true,
        isManager: true,
        employmentId: 100042,
      },
    ],
  },
};

// Upstream returns an array. Unknown personIds return an empty array so the
// frontend's "no data → no warning" path triggers naturally, matching what a
// real 404/no-match response would produce.
export function getMockEmployments(personId: string): Employeev2[] {
  const hit = mockEmployments[personId.toLowerCase()];
  return hit ? [hit] : [];
}
