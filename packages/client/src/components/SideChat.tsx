import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import {
  IconCheckOutline16, IconChevronDownOutline14, IconCloseOutline16, IconFolderOpenOutline16,
  IconGlobeOutline14, IconPlusOutline16, IconSearchOutline16, IconSparkle16, MarkdownText,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  SideChatId, SideChatMessageSnapshot, SideChatModelOption, SideChatModelSelection,
  SideChatSnapshot, SideChatToolSnapshot,
} from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../domain/client.ts'
import type { BranchMarkUiController } from '../domain/controller.ts'
import { useBranchMarkUi } from '../domain/controller.ts'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

interface SideChatPrimaryActionProps {
  readonly mode: 'send' | 'stop'
  readonly disabled?: boolean
  readonly onClick: () => void
}

/** Render the Side Chat send/stop action with the DSH Composer primary-button states.
 * @param props - Current action mode, disabled state, and click handler.
 * @returns An accessible icon-only primary action.
 */
export function SideChatPrimaryAction({ mode, disabled = false, onClick }: SideChatPrimaryActionProps) {
  const label = mode === 'stop' ? '停止生成' : '发送消息'
  return (
    <button
      type="button"
      className="dbm-side-primary"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
        {mode === 'stop'
          ? <rect x="3" y="3" width="10" height="10" rx="3" fill="currentColor" />
          : <path d="M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 1.85793 6.51277 1.61297 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z" fill="currentColor" />}
      </svg>
    </button>
  )
}

function messageSelection(
  event: PointerEvent<HTMLDivElement>,
  tab: SideChatSnapshot,
  message: SideChatMessageSnapshot,
  controller: BranchMarkUiController,
): void {
  if (message.role !== 'assistant') return
  const selection = window.getSelection()
  if (selection === null || selection.isCollapsed || selection.rangeCount !== 1) return
  const range = selection.getRangeAt(0)
  if (!event.currentTarget.contains(range.commonAncestorContainer)) return
  const excerpt = selection.toString()
  if (excerpt.trim() === '') return
  const rect = range.getBoundingClientRect()
  controller.setSelection([{
    workspaceId: tab.workspaceId,
    ownerSessionId: tab.ownerSessionId,
    source: { kind: 'temporary-answer', role: 'assistant' },
    excerpt,
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
  }])
}

function toolLabel(name: string): string {
  switch (name) {
    case 'project_read': return 'Read'
    case 'project_list': return 'List'
    case 'project_search': return 'Search'
    case 'web_search': return 'Web Search'
    case 'web_fetch': return 'Fetch'
    default: return name
  }
}

function toolSummary(tool: SideChatToolSnapshot): string {
  try {
    const args: unknown = JSON.parse(tool.arguments)
    if (args !== null && typeof args === 'object' && !Array.isArray(args)) {
      const fields = args as Record<string, unknown>
      for (const key of ['query', 'path', 'url']) {
        if (typeof fields[key] === 'string') return fields[key]
      }
    }
  } catch {
    // The model's raw arguments remain available in the expanded body.
  }
  return tool.arguments
}

function ToolActivity({ tool }: { readonly tool: SideChatToolSnapshot }) {
  const icon = tool.name === 'web_search' || tool.name === 'web_fetch'
    ? <IconGlobeOutline14 />
    : tool.name === 'project_search'
      ? <IconSearchOutline16 size={14} />
      : <IconFolderOpenOutline16 size={14} />
  return (
    <details className="dbm-side-tool" data-status={tool.status}>
      <summary>
        {icon}
        <strong>{toolLabel(tool.name)}</strong>
        <i aria-hidden />
        <span>{toolSummary(tool)}</span>
        <small>{tool.status === 'running' ? '运行中' : tool.status === 'error' ? '失败' : '完成'}</small>
      </summary>
      <div>
        <label>输入</label>
        <pre>{tool.arguments}</pre>
        {tool.output !== undefined && <><label>输出</label><pre>{tool.output}</pre></>}
      </div>
    </details>
  )
}

function selectedOption(tab: SideChatSnapshot): SideChatModelOption | undefined {
  return tab.modelGroups.find(group => group.id === tab.model.provider)?.models
    .find(model => model.id === tab.model.model)
}

function SideChatModelPicker({ tab, client, controller }: {
  readonly tab: SideChatSnapshot
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
}) {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selected = selectedOption(tab)
  const effectiveEffort = tab.model.reasoningEffort ?? selected?.reasoning?.defaultEffort
  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => { document.removeEventListener('mousedown', outside) }
  }, [open])
  const choose = async (selection: SideChatModelSelection): Promise<void> => {
    setSelecting(true)
    try {
      controller.upsertSideChat(await client.selectSideChatModel(tab.id, selection), true)
      setOpen(false)
    } catch (error) {
      controller.notify('error', errorText(error))
    } finally {
      setSelecting(false)
    }
  }
  return (
    <div className="dbm-side-model" ref={rootRef}>
      <button
        type="button"
        className="dbm-side-model-trigger"
        disabled={tab.status === 'running' || selecting}
        aria-expanded={open}
        onClick={() => { setOpen(value => !value) }}
      >
        <span>{selected?.name ?? tab.model.model}</span>
        {effectiveEffort !== undefined && <small>{selected?.reasoning?.efforts.find(item => item.id === effectiveEffort)?.name ?? effectiveEffort}</small>}
        <IconChevronDownOutline14 />
      </button>
      {open && (
        <div className="dbm-side-model-menu" role="menu" aria-label="Side Chat 模型">
          {tab.modelCatalogStatus === 'loading' && <div className="dbm-side-model-state">正在读取 DSH 模型目录…</div>}
          {tab.modelGroups.map(group => (
            <section key={group.id}>
              <header>{group.name}</header>
              {group.models.map(model => {
                const active = group.id === tab.model.provider && model.id === tab.model.model
                const reasoningEffort = active ? tab.model.reasoningEffort : model.reasoning?.defaultEffort
                return (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    key={model.id}
                    disabled={selecting}
                    onClick={() => { void choose({
                      provider: group.id,
                      model: model.id,
                      ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
                    }) }}
                  >
                    <span><strong>{model.name}</strong>{model.description !== undefined && <small>{model.description}</small>}</span>
                    {active && <IconCheckOutline16 />}
                  </button>
                )
              })}
            </section>
          ))}
          {selected?.reasoning !== undefined && (
            <section className="dbm-side-efforts">
              <header>思考强度</header>
              <div>
                {selected.reasoning.efforts.map(effort => (
                  <button
                    type="button"
                    data-active={effectiveEffort === effort.id}
                    key={effort.id}
                    disabled={selecting}
                    title={effort.description}
                    onClick={() => { void choose({ ...tab.model, reasoningEffort: effort.id }) }}
                  >{effort.name}</button>
                ))}
              </div>
            </section>
          )}
          {tab.modelFailures.map(failure => <div className="dbm-side-model-warning" key={failure.id}>{failure.name} · {failure.message}</div>)}
          {tab.modelCatalogStatus === 'ready' && tab.modelGroups.length === 0 && <div className="dbm-side-model-state">没有模型公布可选目录</div>}
        </div>
      )}
    </div>
  )
}

function SideChatMessage({ tab, message, client, controller }: {
  readonly tab: SideChatSnapshot
  readonly message: SideChatMessageSnapshot
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
}) {
  const save = async (): Promise<void> => {
    try {
      await client.create({
        workspaceId: tab.workspaceId,
        ownerSessionId: tab.ownerSessionId,
        source: { kind: 'temporary-answer', role: 'assistant' },
        excerpt: message.text,
        scope: 'session',
      })
      controller.clipsChanged()
      controller.notify('success', 'Side Chat 回答已保存为来源会话枝签')
    } catch (error) {
      controller.notify('error', errorText(error))
    }
  }
  return (
    <div
      className="dbm-side-message"
      data-role={message.role}
      onPointerUp={event => { messageSelection(event, tab, message, controller) }}
    >
      {message.reasoning !== undefined && message.reasoning !== '' && (
        <details className="dbm-side-reasoning">
          <summary><IconSparkle16 size={13} /><strong>Think</strong><i aria-hidden /><span>{message.reasoning.split('\n')[0]}</span></summary>
          <div><MarkdownText text={message.reasoning} /></div>
        </details>
      )}
      {message.role === 'assistant'
        ? <MarkdownText text={message.text} />
        : <p className="dbm-side-user-text">{message.text}</p>}
      {message.tools?.map(tool => <ToolActivity tool={tool} key={tool.callId} />)}
      {message.role === 'assistant' && message.text !== '' && (
        <button type="button" className="dbm-button dbm-side-save" onClick={() => { void save() }}>
          保存整段回答
        </button>
      )}
    </div>
  )
}

/** Main-conversation-like temporary chat rendered inside the shared BranchMark Dock. */
export function SideChatView({ client, controller }: {
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
}) {
  const { sideChats } = useBranchMarkUi(controller)
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const active = useMemo(
    () => sideChats.tabs.find(tab => tab.id === sideChats.activeId) ?? sideChats.tabs.at(-1),
    [sideChats.activeId, sideChats.tabs],
  )

  useEffect(() => {
    if (sideChats.tabs.length === 0) return
    let stopped = false
    let polling = false
    const poll = async (): Promise<void> => {
      if (polling || stopped) return
      polling = true
      try {
        const results = await Promise.allSettled(sideChats.tabs.map(tab => client.getSideChat(tab.id)))
        if (stopped) return
        results.forEach((result, index) => {
          const id = sideChats.tabs[index]?.id
          if (id === undefined) return
          if (result.status === 'fulfilled') controller.upsertSideChat(result.value)
          else if (result.reason instanceof Error && result.reason.message.includes('已关闭')) controller.removeSideChat(id)
        })
      } finally {
        polling = false
      }
    }
    void poll()
    const timer = window.setInterval(() => { void poll() }, 500)
    return () => { stopped = true; window.clearInterval(timer) }
  }, [client, controller, sideChats.tabs.map(tab => tab.id).join('|')])

  useEffect(() => {
    const container = scrollRef.current
    if (container !== null) container.scrollTop = container.scrollHeight
  }, [active?.messages.length, active?.partialText, active?.partialReasoning])

  const close = async (id: SideChatId): Promise<void> => {
    controller.removeSideChat(id)
    try {
      await client.closeSideChat(id)
    } catch (error) {
      controller.notify('error', errorText(error))
    }
  }
  const send = async (): Promise<void> => {
    const text = question.trim()
    if (active === undefined || text === '' || active.status === 'running') return
    setSending(true)
    try {
      const snapshot = await client.sendSideChat(active.id, text)
      controller.upsertSideChat(snapshot, true)
      setQuestion('')
    } catch (error) {
      controller.notify('error', errorText(error))
    } finally {
      setSending(false)
    }
  }
  const cancel = async (): Promise<void> => {
    if (active === undefined) return
    try {
      controller.upsertSideChat(await client.cancelSideChat(active.id), true)
    } catch (error) {
      controller.notify('error', errorText(error))
    }
  }

  if (active === undefined) {
    return (
      <div className="dbm-empty dbm-side-empty">
        <div>
          <div className="dbm-empty-orb"><IconPlusOutline16 /></div>
          <strong>还没有临时 Side Chat</strong>
          <p>从任意枝签卡片点击“Side Chat”开始。它不会写入主会话，关闭标签后立即销毁。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dbm-side-view">
      <div className="dbm-side-tabs" aria-label="临时 Side Chat 标签">
        {sideChats.tabs.map((tab, index) => (
          <div className="dbm-side-tab" data-active={tab.id === active.id} key={tab.id}>
            <button type="button" onClick={() => { controller.activateSideChat(tab.id) }}>
              {(tab.status === 'running' || tab.status === 'preparing') && <i className="dbm-running-dot" />}
              Side Chat {String(index + 1)}
            </button>
            <button type="button" aria-label="关闭并销毁 Side Chat" onClick={() => { void close(tab.id) }}>
              <IconCloseOutline16 size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="dbm-side-context" aria-label="Side Chat 引用的枝签">
        {active.clips.map(clip => <span key={clip.id}>枝签 · {clip.excerpt}</span>)}
      </div>
      <div className="dbm-side-scroll" ref={scrollRef}>
        {active.contextWarning !== undefined && <div className="dbm-warning">{active.contextWarning}</div>}
        {active.messages.length === 0 && active.status === 'preparing' && (
          <div className="dbm-thinking-line"><span className="dbm-thinking-dots"><i /><i /><i /></span><span>正在生成来源摘要并恢复上下文…</span></div>
        )}
        {active.messages.length === 0 && active.status !== 'preparing' && (
          <div className="dbm-empty dbm-side-empty"><div><strong>沿着枝签继续问</strong><p>临时 · 只读工具 · 关闭标签立即销毁</p></div></div>
        )}
        {active.messages.map(message => (
          <SideChatMessage key={message.messageId} tab={active} message={message} client={client} controller={controller} />
        ))}
        {active.status === 'running' && active.partialReasoning === '' && active.partialText === '' && (
          <div className="dbm-thinking-line"><span className="dbm-thinking-dots"><i /><i /><i /></span><span>{active.contextWarning === undefined ? '正在恢复来源上下文并等待模型…' : '已跳过摘要，正在等待模型回答…'}</span></div>
        )}
        {(active.partialReasoning !== '' || active.partialText !== '') && (
          <div className="dbm-side-message" data-role="assistant" data-streaming="true">
            {active.partialReasoning !== '' && (
              <details className="dbm-side-reasoning" open>
                <summary><IconSparkle16 size={13} /><strong>Think</strong><i aria-hidden /><span>正在思考…</span></summary>
                <div><MarkdownText text={active.partialReasoning} streaming /></div>
              </details>
            )}
            {active.partialText !== '' && <MarkdownText text={active.partialText} streaming />}
            <span className="dbm-caret">▍</span>
          </div>
        )}
        {active.error !== undefined && <div className="dbm-error">{active.error}</div>}
      </div>
      <div className="dbm-side-composer">
        <textarea
          rows={3}
          value={question}
          placeholder="在 Side Chat 中快问快答…"
          onChange={event => { setQuestion(event.target.value) }}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void send()
            }
          }}
        />
        <div className="dbm-side-composer-footer">
          <SideChatModelPicker tab={active} client={client} controller={controller} />
          <span>只读工具 · Enter 发送</span>
          {active.status === 'running'
            ? (
              <SideChatPrimaryAction mode="stop" onClick={() => { void cancel() }} />
            )
            : (
              <SideChatPrimaryAction
                mode="send"
                disabled={sending || question.trim() === '' || active.status === 'preparing'}
                onClick={() => { void send() }}
              />
            )}
        </div>
      </div>
    </div>
  )
}
