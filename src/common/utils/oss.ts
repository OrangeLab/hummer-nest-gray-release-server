import * as OSS from 'ali-oss'
import config from 'src/config'

const ossConfig = config.ossConfig || {
  // yourregion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
  region: 'YourRegion',
  // 阿里云账号AccessKey拥有所有API的访问权限，风险很高。强烈建议您创建并使用RAM用户进行API访问或日常运维，请登录RAM控制台创建RAM用户。
  accessKeyId: 'AccessKeyId',
  accessKeySecret: 'AccessKeySecret',
  // 填写Bucket名称。关于Bucket名称命名规范的更多信息，请参见Bucket。
  bucket: 'YourBucket',
}

const client = new OSS(ossConfig);

/**
 * 获取有时效的公有读地址 1800s
 * @param urls 
 * @returns
 */
export function getPublicUrls(urls:string[]) {
  return urls.map(url => {
    return client.signatureUrl(url)
  })
}
