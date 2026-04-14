import { exec } from 'child_process';
import { ExecException } from 'node:child_process';
import path from 'path';
import fs from 'node:fs';

import { APIS, API_BASE_URL } from './config/index';

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), './src/data-contracts');

const callback = (error: ExecException | null, stdout: string, stderr: string) => {
  if (error) {
    console.log(`error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.log(`stderr: ${stderr}`);
    return;
  }
  console.log(`Data-contract-generator: ${stdout}`);
};

const main = async () => {
  console.log('Downloading and generating api-docs..');
  APIS.forEach(async (api) => {
    if (!fs.existsSync(`${PATH_TO_OUTPUT_DIR}/${api.name}`)) {
      fs.mkdirSync(`${PATH_TO_OUTPUT_DIR}/${api.name}`, { recursive: true });
    }

    await exec(
      `curl -o ${PATH_TO_OUTPUT_DIR}/${api.name}/swagger.json ${API_BASE_URL}/${api.name}/${api.version}/api-docs`,
      () => console.log(`- ${api.name} ${api.version}`)
    );
    await exec(
      `npx swagger-typescript-api generate --path ${PATH_TO_OUTPUT_DIR}/${api.name}/swagger.json -o ${PATH_TO_OUTPUT_DIR}/${api.name} --modular --no-client --extract-enums`,
      callback
    );
  });
};

main();
