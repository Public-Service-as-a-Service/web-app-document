export const apiURL = (...parts: string[]): string => {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const urlParts = [basePath, 'api', ...parts];
  return (
    '/' +
    urlParts
      .map((pathPart) => pathPart?.replace(/(^\/|\/+$)/g, ''))
      .filter(Boolean)
      .join('/')
  );
};
