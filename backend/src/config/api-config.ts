export const APIS = [
  {
    name: 'document',
    version: '3.0',
  },
] as const;

export const getApiBase = (name: string) => {
  const api = APIS.find((api) => api.name === name);
  return `${api?.name}/${api?.version}`;
};
