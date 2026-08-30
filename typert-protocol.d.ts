/** Build-only identity bridge for the out-of-tree Typert analyzer. */
declare module '@deepseek-ai/dsh-typert-protocol' {
  export type TypertLookup<Host, Wire> =
    import('@deepseek-ai/dsh-typert-protocol-actual').TypertLookup<Host, Wire>
  export type TypertContext<Wire> =
    import('@deepseek-ai/dsh-typert-protocol-actual').TypertContext<Wire>
  export interface TypertLookupMap {}
  export interface TypertContextMap {}
  export interface TypertRemoteMap {}
  export interface TypertRemoteScopeMap {}
  export const Remote: typeof import('@deepseek-ai/dsh-typert-protocol-actual').Remote
  export const bindTypertRemote: typeof import('@deepseek-ai/dsh-typert-protocol-actual').bindTypertRemote
}
