export type CharacterInfo = {
  [key: string]: string | number
}

export class GetConfigDTO {
  uid: string
  appId: string
  appVersion: string
  nativeVersion: string
  sdkId: string
  sdkVersion: string
  bundleVersion: string
  platform: string
  osVersion: string
  model: string
  nativeSdkVersion: string
  characterInfo: CharacterInfo
}

