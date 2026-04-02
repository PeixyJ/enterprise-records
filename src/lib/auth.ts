import SparkMD5 from "spark-md5"
import authConfig from "../../auth.json"

/** 将明文密码按 base64 + md5 生成哈希 */
export function hashPassword(plain: string): string {
  const base64 = btoa(plain)
  return SparkMD5.hash(base64)
}

/** 校验账户密码 */
export function verifyLogin(account: string, password: string): boolean {
  return account === authConfig.account && hashPassword(password) === authConfig.password
}
