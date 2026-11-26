import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UndoToast from './UndoToast'

const message = 'Đã xoá “Mua sữa”'

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function renderToast(props: Partial<React.ComponentProps<typeof UndoToast>> = {}) {
  const onUndo = vi.fn()
  const onExpire = vi.fn()
  const all = { message, autoFocusUndo: false, onUndo, onExpire, ...props }
  const view = render(<UndoToast {...all} />)
  return { onUndo, onExpire, view, props: all }
}

const status = () => screen.getByRole('status')
const undoButton = () => screen.getByRole('button', { name: 'Hoàn tác' })

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('UndoToast', () => {
  it('shows the message in full and the Hoàn tác button inside one status', () => {
    const long = 'Đã xoá “' + 'a'.repeat(200) + '”'
    renderToast({ message: long })
    expect(status()).toHaveTextContent(long)
    expect(status()).toContainElement(undoButton())
  })

  it('expires once after 5000 ms, not before', () => {
    const { onExpire } = renderToast()
    advance(4999)
    expect(onExpire).not.toHaveBeenCalled()
    advance(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
    advance(10000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('never expires after it is unmounted', () => {
    const { onExpire, view } = renderToast()
    advance(3000)
    view.unmount()
    advance(10000)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('waits while the pointer is over it and restarts from zero after it leaves', () => {
    const { onExpire } = renderToast()
    advance(3000)
    fireEvent.mouseEnter(status())
    advance(10000)
    expect(onExpire).not.toHaveBeenCalled()
    fireEvent.mouseLeave(status())
    advance(4999)
    expect(onExpire).not.toHaveBeenCalled()
    advance(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('waits while focus is inside it and restarts from zero after focus leaves', () => {
    const { onExpire } = renderToast()
    act(() => undoButton().focus())
    advance(10000)
    expect(onExpire).not.toHaveBeenCalled()
    act(() => undoButton().blur())
    advance(4999)
    expect(onExpire).not.toHaveBeenCalled()
    advance(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('stays while focus remains after the pointer leaves, then counts after focus leaves', () => {
    const { onExpire } = renderToast()
    fireEvent.mouseEnter(status())
    act(() => undoButton().focus())
    fireEvent.mouseLeave(status())
    advance(10000)
    expect(onExpire).not.toHaveBeenCalled()
    act(() => undoButton().blur())
    advance(4999)
    expect(onExpire).not.toHaveBeenCalled()
    advance(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('stays while the pointer remains after focus leaves, then counts after the pointer leaves', () => {
    const { onExpire } = renderToast()
    fireEvent.mouseEnter(status())
    act(() => undoButton().focus())
    act(() => undoButton().blur())
    advance(10000)
    expect(onExpire).not.toHaveBeenCalled()
    fireEvent.mouseLeave(status())
    advance(4999)
    expect(onExpire).not.toHaveBeenCalled()
    advance(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('focuses Hoàn tác with autoFocusUndo and waits until it is blurred', () => {
    const { onExpire } = renderToast({ autoFocusUndo: true })
    expect(undoButton()).toHaveFocus()
    advance(10000)
    expect(onExpire).not.toHaveBeenCalled()
    act(() => undoButton().blur())
    advance(4999)
    expect(onExpire).not.toHaveBeenCalled()
    advance(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('does not move focus without autoFocusUndo', () => {
    render(<button type="button">Khác</button>)
    const other = screen.getByRole('button', { name: 'Khác' })
    other.focus()
    renderToast()
    expect(other).toHaveFocus()
  })

  it('calls onUndo once on click and does not expire', async () => {
    vi.useRealTimers() // user-event awaits real timers; no countdown is advanced here
    const user = userEvent.setup()
    const { onUndo, onExpire } = renderToast()
    await user.click(undoButton())
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('calls onUndo once on Enter', async () => {
    vi.useRealTimers() // user-event awaits real timers; no countdown is advanced here
    const user = userEvent.setup()
    const { onUndo, onExpire } = renderToast({ autoFocusUndo: true })
    await user.keyboard('{Enter}')
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('keeps the countdown on re-render and calls the latest onExpire', () => {
    const first = renderToast()
    advance(3000)
    const nextExpire = vi.fn()
    first.view.rerender(
      <UndoToast message={message} autoFocusUndo={false} onUndo={vi.fn()} onExpire={nextExpire} />,
    )
    advance(1999)
    expect(nextExpire).not.toHaveBeenCalled()
    advance(1)
    expect(nextExpire).toHaveBeenCalledTimes(1)
    expect(first.onExpire).not.toHaveBeenCalled()
  })

  it('gets a fresh 5000 ms when re-rendered with a different key', () => {
    const { view, props, onExpire } = renderToast({ message })
    advance(3000)
    view.rerender(<UndoToast key="newer" {...props} />)
    advance(4999)
    expect(onExpire).not.toHaveBeenCalled()
    advance(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('calls onUndo once on Space', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const { onUndo, onExpire } = renderToast({ autoFocusUndo: true })
    await user.keyboard(' ')
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('calls the latest onUndo after a re-render with new callbacks', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const first = renderToast()
    const nextUndo = vi.fn()
    first.view.rerender(
      <UndoToast message={message} autoFocusUndo={false} onUndo={nextUndo} onExpire={vi.fn()} />,
    )
    await user.click(undoButton())
    expect(nextUndo).toHaveBeenCalledTimes(1)
    expect(first.onUndo).not.toHaveBeenCalled()
  })

  it('calls the latest onExpire when the countdown restarts after a hover and a re-render', () => {
    const first = renderToast()
    fireEvent.mouseEnter(status())
    const nextExpire = vi.fn()
    first.view.rerender(
      <UndoToast message={message} autoFocusUndo={false} onUndo={vi.fn()} onExpire={nextExpire} />,
    )
    fireEvent.mouseLeave(status())
    advance(5000)
    expect(nextExpire).toHaveBeenCalledTimes(1)
    expect(first.onExpire).not.toHaveBeenCalled()
  })

  it('does not call onExpire when unmounted while paused by the pointer', () => {
    const { onExpire, view } = renderToast()
    fireEvent.mouseEnter(status())
    view.unmount()
    advance(10000)
    expect(onExpire).not.toHaveBeenCalled()
  })
})
