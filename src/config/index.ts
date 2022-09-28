import { readFileSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml';

type Config = {
  port: number;
  mysql: Mysql;
  ossConfigPath: string;
  ossConfig: object
};

type Mysql = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

type Oss = {
  region: string;
  accessKeyId: string
  accessKeySecret: string
  bucket: string
}

const configPath = join(__dirname, `config.${process.env.NODE_ENV || 'local'}.yml`);
const config = load(readFileSync(configPath, 'utf8')) as Config;

console.log(config)
if (config.ossConfigPath) {
  try {
    config.ossConfig = load(readFileSync(join(__dirname, config.ossConfigPath), 'utf8')) as Oss;
  } catch (error) {
    config.ossConfig = null;
  }
}
export default config;
