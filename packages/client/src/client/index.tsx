/** Browser assembly for every additive BranchMark surface. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-api-gateway/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InputTriggerServiceContract } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import branchmarkRemote from 'dsh-branchmark-host/remote'
import { installBranchMarkStyles } from './styles.ts'
import { BranchMarkShell } from '../components/BranchMarkShell.tsx'
import {
  BranchMarkDrawerButton, BranchMarkLineageAction, BranchMarkSidebarButton,
} from '../components/EntryButtons.tsx'
import { ForkDivider, forkDividerDefinition } from '../components/ForkDivider.tsx'
import { BranchMarkClient } from '../domain/client.ts'
import { createBranchMarkInputTriggerSource } from '../domain/composer-reference.ts'
import { browserBranchMarkUiPreferenceStore, BranchMarkUiController } from '../domain/controller.ts'

/** Required DSH services and additive UI seats. */
export const inject = [
  'slots', 'sessions', 'workspaces', 'remote', 'conversationEvents', 'conversation', 'inputTriggers',
]

/** Mount the generated Remote contribution and every BranchMark UI entry. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => installBranchMarkStyles(), 'branchmark: styles')
  ctx.effect(async () => await ctx.remote.$mount(branchmarkRemote), 'branchmark: Remote namespace')
  ctx.inject(['remote.branchmark'], (scope: ClientContext) => {
    const controller = new BranchMarkUiController(browserBranchMarkUiPreferenceStore(window.localStorage))
    const client = new BranchMarkClient(scope)
    const inputTriggers = scope.get('inputTriggers') as InputTriggerServiceContract
    scope.effect(
      () => inputTriggers.registerSource(createBranchMarkInputTriggerSource(client)),
      'branchmark: Composer reference codec',
    )
    const ForkDividerEntry = (props: PropsRuntime<'conversation.chat.node', 'clip-fork-divider'>) => (
      <ForkDivider {...props} client={client} />
    )
    scope.conversationEvents.register(forkDividerDefinition)

    scope.slots.inject('shell.overlay', () => scope.slots.register({
      name: 'shell.overlay', id: 'branchmark', order: 40,
      inject: () => ({ controller, client }),
    }, BranchMarkShell))

    scope.slots.inject('sidebar.footer.action', () => scope.slots.register({
      name: 'sidebar.footer.action', id: 'branchmark', order: 30,
      inject: () => ({ controller, client }),
    }, BranchMarkSidebarButton))

    scope.slots.inject('conversation.input.left', () => scope.slots.register({
      name: 'conversation.input.left', id: 'branchmark', order: 40,
      inject: () => ({ controller, client }),
    }, BranchMarkDrawerButton))

    scope.slots.inject('conversation.session.header.actions', () => scope.slots.register({
      name: 'conversation.session.header.actions', id: 'branchmark-lineage', order: -10,
      inject: () => ({ controller, client }),
    }, BranchMarkLineageAction))

    scope.slots.inject('conversation.chat.node', () => scope.slots.register({
      name: 'conversation.chat.node', key: 'clip-fork-divider',
    }, ForkDividerEntry))
  })
}
