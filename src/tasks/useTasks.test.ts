import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TASKS_STORAGE_KEY } from './taskStorage'
import { useTasks } from './useTasks'

function refuseWrites() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('refused', 'QuotaExceededError')
  })
}

function add(
  hook: ReturnType<typeof renderHook<ReturnType<typeof useTasks>, unknown>>,
  title: string,
) {
  let added = false
  act(() => {
    added = hook.result.current.addTask(title)
  })
  return added
}

const titles = (hook: { result: { current: ReturnType<typeof useTasks> } }) =>
  hook.result.current.tasks.map((task) => task.title)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useTasks', () => {
  it('starts empty and not blocked in an empty browser', () => {
    const hook = renderHook(() => useTasks())
    expect(hook.result.current.tasks).toEqual([])
    expect(hook.result.current.storageBlocked).toBe(false)
  })

  it('adds a trimmed task and refuses a blank one', () => {
    const hook = renderHook(() => useTasks())
    expect(add(hook, '  Mua sữa ')).toBe(true)
    expect(hook.result.current.tasks).toMatchObject([{ title: 'Mua sữa', done: false }])
    expect(add(hook, '   ')).toBe(false)
    expect(titles(hook)).toEqual(['Mua sữa'])
  })

  it('C6 moves a done task below the unfinished ones and back', () => {
    const hook = renderHook(() => useTasks())
    add(hook, 'A')
    add(hook, 'B')
    add(hook, 'C')
    const idOfA = hook.result.current.tasks[0]!.id
    act(() => hook.result.current.toggleTask(idOfA))
    expect(titles(hook)).toEqual(['B', 'C', 'A'])
    expect(hook.result.current.tasks[2]?.done).toBe(true)
    act(() => hook.result.current.toggleTask(idOfA))
    expect(titles(hook)).toEqual(['A', 'B', 'C'])
    expect(hook.result.current.tasks.some((task) => task.done)).toBe(false)
  })

  it('C7 brings the same tasks back after a reload', () => {
    const first = renderHook(() => useTasks())
    add(first, 'A')
    add(first, 'B')
    act(() => first.result.current.toggleTask(first.result.current.tasks[0]!.id))
    const before = first.result.current.tasks
    first.unmount()
    const second = renderHook(() => useTasks())
    expect(second.result.current.tasks).toEqual(before)
    expect(titles(second)).toEqual(['B', 'A'])
  })

  it('C8 keeps working in memory when the browser refuses from the start', () => {
    refuseWrites()
    const hook = renderHook(() => useTasks())
    expect(hook.result.current.storageBlocked).toBe(true)
    expect(add(hook, 'A')).toBe(true)
    expect(titles(hook)).toEqual(['A'])
    act(() => hook.result.current.toggleTask(hook.result.current.tasks[0]!.id))
    expect(hook.result.current.tasks[0]?.done).toBe(true)
    expect(hook.result.current.storageBlocked).toBe(true)
  })

  it('C8 shows the block after a refused save and clears it after an accepted one', () => {
    const hook = renderHook(() => useTasks())
    expect(hook.result.current.storageBlocked).toBe(false)
    refuseWrites()
    add(hook, 'A')
    expect(hook.result.current.storageBlocked).toBe(true)
    expect(titles(hook)).toEqual(['A'])
    vi.restoreAllMocks()
    add(hook, 'B')
    expect(hook.result.current.storageBlocked).toBe(false)
    hook.unmount()
    const reloaded = renderHook(() => useTasks())
    expect(titles(reloaded)).toEqual(['A', 'B'])
  })

  it('C8 keeps the block on a blank add, which makes no save attempt', () => {
    const hook = renderHook(() => useTasks())
    refuseWrites()
    add(hook, 'A')
    vi.restoreAllMocks()
    expect(add(hook, '  ')).toBe(false)
    expect(hook.result.current.storageBlocked).toBe(true)
  })
})

describe('useTasks, more C8 and C7 cases', () => {
  it('works in memory when the browser denies storage altogether', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const hook = renderHook(() => useTasks())
    expect(hook.result.current.tasks).toEqual([])
    expect(hook.result.current.storageBlocked).toBe(true)
    expect(add(hook, 'A')).toBe(true)
    expect(titles(hook)).toEqual(['A'])
    expect(hook.result.current.storageBlocked).toBe(true)
  })

  it('shows the block when a toggle save is refused and clears it on the next accepted toggle', () => {
    const hook = renderHook(() => useTasks())
    add(hook, 'A')
    const id = hook.result.current.tasks[0]!.id
    refuseWrites()
    act(() => hook.result.current.toggleTask(id))
    expect(hook.result.current.storageBlocked).toBe(true)
    expect(hook.result.current.tasks[0]?.done).toBe(true)
    vi.restoreAllMocks()
    act(() => hook.result.current.toggleTask(id))
    expect(hook.result.current.storageBlocked).toBe(false)
    hook.unmount()
    const reloaded = renderHook(() => useTasks())
    expect(reloaded.result.current.tasks).toMatchObject([{ title: 'A', done: false }])
  })

  it('opens empty and not blocked when the saved data is damaged', () => {
    localStorage.setItem(TASKS_STORAGE_KEY, 'not json')
    const hook = renderHook(() => useTasks())
    expect(hook.result.current.tasks).toEqual([])
    expect(hook.result.current.storageBlocked).toBe(false)
  })

  it('keeps a title longer than 200 characters whole', () => {
    const hook = renderHook(() => useTasks())
    const long = 'x'.repeat(250)
    add(hook, long)
    expect(titles(hook)).toEqual([long])
  })
})
