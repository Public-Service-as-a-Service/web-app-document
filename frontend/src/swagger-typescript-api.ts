import { exec } from 'child_process';
import path from 'path';
import fs from 'node:fs';
import { config } from 'dotenv';
import { promisify } from 'node:util';
config();

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
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is required to generate backend contracts');
  }

  if (!fs.existsSync(`${PATH_TO_OUTPUT_DIR}/backend`)) {
    fs.mkdirSync(`${PATH_TO_OUTPUT_DIR}/backend`, { recursive: true });
  }
  console.log('Downloading and generating api-docs for backend');
  await run(
    `curl --fail --silent --show-error --location -o ${PATH_TO_OUTPUT_DIR}/backend/swagger.json ${process.env.NEXT_PUBLIC_API_URL}/swagger.json`
  );
  await run(
    `npx swagger-typescript-api generate --path ${PATH_TO_OUTPUT_DIR}/backend/swagger.json -o ${PATH_TO_OUTPUT_DIR}/backend --modular --no-client --clean-output --extract-enums`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
