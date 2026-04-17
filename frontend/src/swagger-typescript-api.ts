import { exec } from 'child_process';
import path from 'path';
import fs from 'node:fs';
import { config } from 'dotenv';
import { promisify } from 'node:util';
config();

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), './src/data-contracts');
const OUTPUT_DIR = `${PATH_TO_OUTPUT_DIR}/backend`;
const SWAGGER_TMP = path.resolve(process.cwd(), '.swagger-tmp.json');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3010';
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
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  console.log(`Downloading and generating api-docs from ${BACKEND_URL}/api/swagger.json`);
  fs.rmSync(SWAGGER_TMP, { force: true });
  try {
    await run(
      `curl --fail --silent --show-error --location -o ${SWAGGER_TMP} ${BACKEND_URL}/api/swagger.json`
    );
    await run(
      `npx swagger-typescript-api generate --path ${SWAGGER_TMP} -o ${OUTPUT_DIR} --modular --no-client --clean-output --extract-enums`
    );
  } finally {
    fs.rmSync(SWAGGER_TMP, { force: true });
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
