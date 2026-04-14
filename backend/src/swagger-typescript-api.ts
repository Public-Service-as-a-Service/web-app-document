import { exec } from 'child_process';
import path from 'path';
import fs from 'node:fs';
import { promisify } from 'node:util';

import { APIS, API_BASE_URL } from './config/index';

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), './src/data-contracts');
const execAsync = promisify(exec);

const run = async (command: string) => {
  const { stdout, stderr } = await execAsync(command);
  if (stdout) {
    console.log(`Data-contract-generator: ${stdout}`);
  }
  if (stderr) {
    console.log(`stderr: ${stderr}`);
  }
};

const main = async () => {
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL is required to generate backend service contracts');
  }

  console.log('Downloading and generating api-docs..');
  const failures: string[] = [];

  for (const api of APIS) {
    const outputDir = `${PATH_TO_OUTPUT_DIR}/${api.name}`;
    const swaggerPath = `${outputDir}/swagger.json`;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      fs.rmSync(swaggerPath, { force: true });
      await run(
        `curl --fail --silent --show-error --location -o ${swaggerPath} ${API_BASE_URL}/${api.name}/${api.version}/api-docs`
      );
      console.log(`- ${api.name} ${api.version}`);
      await run(
        `npx swagger-typescript-api generate --path ${swaggerPath} -o ${outputDir} --modular --no-client --extract-enums`
      );
    } catch (error) {
      fs.rmSync(swaggerPath, { force: true });
      failures.push(`${api.name} ${api.version}: ${error instanceof Error ? error.message : error}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Failed to generate contracts:\n${failures.join('\n')}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
