/** Typed dictionary namespace registered with the DSH locale service. */
import { zh } from './zh.ts'
import { en } from './en.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    branchmark: keyof typeof zh
  }
}

export const branchmarkDictionaries = { zh, en }
