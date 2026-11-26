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

type Hook = ReturnType<typeof renderHook<ReturnType<typeof useTasks>, unknown>>

function addAll(hook: Hook, ...names: string[]) {
  names.forEach((name) => add(hook, name))
}

function idOf(hook: Hook, title: string): string {
  return hook.result.current.tasks.find((task) => task.title === title)!.id
}

function deleteByTitle(hook: Hook, title: string) {
  const id = idOf(hook, title)
  act(() => hook.result.current.deleteTask(id))
}

function reload(hook: Hook): Hook {
  hook.unmount()
  return renderHook(() => useTasks())
}

describe('useTasks rename (C3)', () => {
  it('trims the title and keeps the done state and position of the task', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B', 'C')
    act(() => hook.result.current.toggleTask(idOf(hook, 'B')))
    const before = hook.result.current.tasks
    let renamed = false
    act(() => {
      renamed = hook.result.current.renameTask(idOf(hook, 'B'), '  Bờ mới ')
    })
    expect(renamed).toBe(true)
    expect(hook.result.current.tasks).toEqual(
      before.map((task) => (task.title === 'B' ? { ...task, title: 'Bờ mới' } : task)),
    )
    expect(hook.result.current.tasks[2]).toMatchObject({ title: 'Bờ mới', done: true })
  })

  it('refuses a blank title and changes nothing', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A')
    const before = hook.result.current.tasks
    let renamed = true
    act(() => {
      renamed = hook.result.current.renameTask(before[0]!.id, '   ')
    })
    expect(renamed).toBe(false)
    expect(hook.result.current.tasks).toEqual(before)
  })

  it('keeps the new title after a reload', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A')
    act(() => {
      hook.result.current.renameTask(idOf(hook, 'A'), 'Mới')
    })
    expect(titles(reload(hook))).toEqual(['Mới'])
  })
})

describe('useTasks delete and undo (C8)', () => {
  it('removes the task and remembers it as the last deleted one', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    const target = hook.result.current.tasks[0]!
    deleteByTitle(hook, 'A')
    expect(titles(hook)).toEqual(['B'])
    expect(hook.result.current.lastDeletedTask).toEqual(target)
  })

  it('is gone after a reload when it was not restored, and nothing is left to undo', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    deleteByTitle(hook, 'A')
    const reloaded = reload(hook)
    expect(titles(reloaded)).toEqual(['B'])
    expect(reloaded.result.current.lastDeletedTask).toBeNull()
  })

  it('puts the middle one of three back at the same place, also after a reload', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B', 'C')
    const before = hook.result.current.tasks
    deleteByTitle(hook, 'B')
    act(() => hook.result.current.undoDelete())
    expect(hook.result.current.tasks).toEqual(before)
    expect(hook.result.current.lastDeletedTask).toBeNull()
    expect(reload(hook).result.current.tasks).toEqual(before)
  })

  it('puts a finished task back with its done state in its old place', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B', 'C')
    act(() => hook.result.current.toggleTask(idOf(hook, 'A')))
    const before = hook.result.current.tasks
    deleteByTitle(hook, 'A')
    expect(titles(hook)).toEqual(['B', 'C'])
    act(() => hook.result.current.undoDelete())
    expect(hook.result.current.tasks).toEqual(before)
    expect(titles(hook)).toEqual(['B', 'C', 'A'])
  })

  it('puts a task added after the deletion behind the restored one', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B', 'C')
    deleteByTitle(hook, 'B')
    add(hook, 'D')
    act(() => hook.result.current.undoDelete())
    expect(titles(hook)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('forgets the deletion without changing the tasks, after which undo does nothing', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    deleteByTitle(hook, 'A')
    act(() => hook.result.current.forgetDeletedTask())
    expect(hook.result.current.lastDeletedTask).toBeNull()
    expect(titles(hook)).toEqual(['B'])
    act(() => hook.result.current.undoDelete())
    expect(titles(hook)).toEqual(['B'])
    expect(titles(reload(hook))).toEqual(['B'])
  })

  it('keeps the last deleted task through add, toggle and rename', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    const target = hook.result.current.tasks[0]!
    deleteByTitle(hook, 'A')
    add(hook, 'C')
    act(() => hook.result.current.toggleTask(idOf(hook, 'B')))
    act(() => {
      hook.result.current.renameTask(idOf(hook, 'C'), 'Cờ')
    })
    expect(hook.result.current.lastDeletedTask).toEqual(target)
  })

  it('does nothing on undo with nothing deleted', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A')
    act(() => hook.result.current.undoDelete())
    expect(titles(hook)).toEqual(['A'])
    expect(hook.result.current.lastDeletedTask).toBeNull()
  })

  it('does nothing when deleting an unknown id', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A')
    act(() => hook.result.current.deleteTask('zzz'))
    expect(titles(hook)).toEqual(['A'])
    expect(hook.result.current.lastDeletedTask).toBeNull()
  })
})

describe('useTasks second deletion (C9)', () => {
  it('replaces the last deleted task, and undo brings back only the newer one', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B', 'C')
    const second = hook.result.current.tasks[1]!
    deleteByTitle(hook, 'A')
    deleteByTitle(hook, 'B')
    expect(hook.result.current.lastDeletedTask).toEqual(second)
    act(() => hook.result.current.undoDelete())
    expect(titles(hook)).toEqual(['B', 'C'])
    expect(hook.result.current.lastDeletedTask).toBeNull()
    expect(titles(reload(hook))).toEqual(['B', 'C'])
  })
})

describe('useTasks rename, delete and undo when the browser refuses to save (C11)', () => {
  it('works in memory with writes refused from the start', () => {
    refuseWrites()
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    expect(hook.result.current.storageBlocked).toBe(true)
    act(() => {
      hook.result.current.renameTask(idOf(hook, 'A'), 'Á')
    })
    expect(titles(hook)).toEqual(['Á', 'B'])
    deleteByTitle(hook, 'Á')
    expect(titles(hook)).toEqual(['B'])
    expect(hook.result.current.storageBlocked).toBe(true)
    act(() => hook.result.current.undoDelete())
    expect(titles(hook)).toEqual(['Á', 'B'])
    expect(hook.result.current.storageBlocked).toBe(true)
  })

  it.each([
    ['rename', (hook: Hook) => hook.result.current.renameTask(idOf(hook, 'A'), 'Á')],
    ['delete', (hook: Hook) => hook.result.current.deleteTask(idOf(hook, 'A'))],
  ])('a refused %s sets the block and the next accepted save clears it', (_, change) => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    refuseWrites()
    act(() => {
      change(hook)
    })
    expect(hook.result.current.storageBlocked).toBe(true)
    vi.restoreAllMocks()
    add(hook, 'C')
    expect(hook.result.current.storageBlocked).toBe(false)
  })

  it('a refused undo sets the block and the next accepted save clears it', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    deleteByTitle(hook, 'A')
    refuseWrites()
    act(() => hook.result.current.undoDelete())
    expect(hook.result.current.storageBlocked).toBe(true)
    expect(titles(hook)).toEqual(['A', 'B'])
    vi.restoreAllMocks()
    add(hook, 'C')
    expect(hook.result.current.storageBlocked).toBe(false)
  })

  it('a blank rename, forgetting and an empty undo make no save attempt', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    deleteByTitle(hook, 'A')
    refuseWrites()
    act(() => {
      hook.result.current.renameTask(idOf(hook, 'B'), '  ')
    })
    act(() => hook.result.current.forgetDeletedTask())
    act(() => hook.result.current.undoDelete())
    vi.restoreAllMocks()
    expect(hook.result.current.storageBlocked).toBe(false)
  })
})

describe('useTasks, QA additions', () => {
  it('rename returns true and keeps the change in memory when the save is refused', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A')
    const id = idOf(hook, 'A')
    refuseWrites()
    let renamed = false
    act(() => {
      renamed = hook.result.current.renameTask(id, 'Á')
    })
    expect(renamed).toBe(true)
    expect(titles(hook)).toEqual(['Á'])
    expect(hook.result.current.storageBlocked).toBe(true)
  })

  it('deleting an unknown id makes no save attempt', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A')
    refuseWrites()
    act(() => hook.result.current.deleteTask('zzz'))
    vi.restoreAllMocks()
    expect(hook.result.current.storageBlocked).toBe(false)
  })

  it('has nothing to undo after a reload, and the deleted task stays gone', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    deleteByTitle(hook, 'A')
    const reloaded = reload(hook)
    act(() => reloaded.result.current.undoDelete())
    expect(titles(reloaded)).toEqual(['B'])
  })
})

function toggleByTitle(hook: Hook, title: string) {
  const id = idOf(hook, title)
  act(() => hook.result.current.toggleTask(id))
}

function savedTitles(): string[] {
  const saved: unknown = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) ?? '[]')
  return (saved as { title: string }[]).map((task) => task.title)
}

function clearDone(hook: Hook) {
  act(() => hook.result.current.clearDoneTasks())
}

function fourWithTwoDone(): Hook {
  const hook = renderHook(() => useTasks())
  addAll(hook, 'A', 'B', 'C', 'D')
  toggleByTitle(hook, 'A')
  toggleByTitle(hook, 'C')
  return hook
}

describe('useTasks clear finished tasks (C7)', () => {
  it('removes every finished task and remembers them in creation order', () => {
    const hook = fourWithTwoDone()
    clearDone(hook)
    expect(titles(hook)).toEqual(['B', 'D'])
    expect(hook.result.current.lastClearedDoneTasks).toEqual([
      expect.objectContaining({ title: 'A', done: true }),
      expect.objectContaining({ title: 'C', done: true }),
    ])
    expect(hook.result.current.lastDeletedTask).toBeNull()
  })

  it('stays removed after a reload, with nothing to undo', () => {
    const hook = fourWithTwoDone()
    clearDone(hook)
    const reloaded = reload(hook)
    expect(titles(reloaded)).toEqual(['B', 'D'])
    expect(reloaded.result.current.lastClearedDoneTasks).toBeNull()
    expect(reloaded.result.current.lastDeletedTask).toBeNull()
    act(() => reloaded.result.current.undoDelete())
    expect(titles(reloaded)).toEqual(['B', 'D'])
  })

  it('undo restores the list as it was, saved too', () => {
    const hook = fourWithTwoDone()
    const before = hook.result.current.tasks
    clearDone(hook)
    act(() => hook.result.current.undoDelete())
    expect(hook.result.current.tasks).toEqual(before)
    expect(hook.result.current.lastClearedDoneTasks).toBeNull()
    expect(hook.result.current.lastDeletedTask).toBeNull()
    expect(reload(hook).result.current.tasks).toEqual(before)
  })

  it('puts a task added after the clear behind the restored ones', () => {
    const hook = fourWithTwoDone()
    clearDone(hook)
    add(hook, 'E')
    act(() => hook.result.current.undoDelete())
    expect(savedTitles()).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('a clear replaces a remembered single deletion', () => {
    const hook = fourWithTwoDone()
    deleteByTitle(hook, 'B')
    clearDone(hook)
    expect(hook.result.current.lastDeletedTask).toBeNull()
    act(() => hook.result.current.undoDelete())
    expect(savedTitles()).toEqual(['A', 'C', 'D'])
    expect(titles(reload(hook))).toEqual(['D', 'A', 'C'])
  })

  it('a single deletion replaces a remembered clear', () => {
    const hook = fourWithTwoDone()
    clearDone(hook)
    const target = hook.result.current.tasks[1]!
    deleteByTitle(hook, 'D')
    expect(hook.result.current.lastClearedDoneTasks).toBeNull()
    expect(hook.result.current.lastDeletedTask).toEqual(target)
    act(() => hook.result.current.undoDelete())
    expect(savedTitles()).toEqual(['B', 'D'])
  })

  it('forgetting after a clear empties both fields and keeps the tasks', () => {
    const hook = fourWithTwoDone()
    clearDone(hook)
    act(() => hook.result.current.forgetDeletedTask())
    expect(hook.result.current.lastClearedDoneTasks).toBeNull()
    expect(hook.result.current.lastDeletedTask).toBeNull()
    act(() => hook.result.current.undoDelete())
    expect(titles(hook)).toEqual(['B', 'D'])
  })

  it('with nothing finished changes nothing, saves nothing and keeps a remembered deletion', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    const target = hook.result.current.tasks[0]!
    deleteByTitle(hook, 'A')
    refuseWrites()
    clearDone(hook)
    vi.restoreAllMocks()
    expect(hook.result.current.storageBlocked).toBe(false)
    expect(titles(hook)).toEqual(['B'])
    expect(hook.result.current.lastDeletedTask).toEqual(target)
    expect(hook.result.current.lastClearedDoneTasks).toBeNull()
  })

  it('add, toggle and rename keep the remembered clear', () => {
    const hook = fourWithTwoDone()
    clearDone(hook)
    const remembered = hook.result.current.lastClearedDoneTasks
    add(hook, 'E')
    toggleByTitle(hook, 'B')
    act(() => {
      hook.result.current.renameTask(idOf(hook, 'D'), 'Đ')
    })
    expect(hook.result.current.lastClearedDoneTasks).toEqual(remembered)
  })

  it('a refused clear sets the block, still removes, and the next accepted save clears it', () => {
    const hook = fourWithTwoDone()
    refuseWrites()
    clearDone(hook)
    expect(hook.result.current.storageBlocked).toBe(true)
    expect(titles(hook)).toEqual(['B', 'D'])
    vi.restoreAllMocks()
    add(hook, 'E')
    expect(hook.result.current.storageBlocked).toBe(false)
  })

  it('a refused undo of a clear sets the block, still restores, and the next save clears it', () => {
    const hook = fourWithTwoDone()
    clearDone(hook)
    refuseWrites()
    act(() => hook.result.current.undoDelete())
    expect(hook.result.current.storageBlocked).toBe(true)
    expect(titles(hook)).toEqual(['B', 'D', 'A', 'C'])
    vi.restoreAllMocks()
    add(hook, 'E')
    expect(hook.result.current.storageBlocked).toBe(false)
  })
})

describe('useTasks clear finished tasks, QA additions', () => {
  it('an unknown id deletion keeps a remembered clear and saves nothing', () => {
    const hook = fourWithTwoDone()
    clearDone(hook)
    const remembered = hook.result.current.lastClearedDoneTasks
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    act(() => hook.result.current.deleteTask('no-such-id'))
    expect(setItem).not.toHaveBeenCalled()
    expect(hook.result.current.lastClearedDoneTasks).toEqual(remembered)
    expect(hook.result.current.lastDeletedTask).toBeNull()
  })

  it('undo with nothing remembered changes nothing and makes no save attempt', () => {
    const hook = renderHook(() => useTasks())
    addAll(hook, 'A', 'B')
    refuseWrites()
    act(() => hook.result.current.undoDelete())
    vi.restoreAllMocks()
    expect(hook.result.current.storageBlocked).toBe(false)
    expect(titles(hook)).toEqual(['A', 'B'])
  })

  it('clear and undo each save exactly once', () => {
    const hook = fourWithTwoDone()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    clearDone(hook)
    expect(setItem).toHaveBeenCalledTimes(1)
    act(() => hook.result.current.undoDelete())
    expect(setItem).toHaveBeenCalledTimes(2)
  })

  it('a second clear replaces the first; undo brings back only the second', () => {
    const hook = fourWithTwoDone()
    clearDone(hook)
    toggleByTitle(hook, 'D')
    clearDone(hook)
    expect(hook.result.current.lastClearedDoneTasks).toEqual([
      expect.objectContaining({ title: 'D', done: true }),
    ])
    act(() => hook.result.current.undoDelete())
    expect(savedTitles()).toEqual(['B', 'D'])
  })

  it('a clear with nothing finished keeps a remembered clear', () => {
    const hook = fourWithTwoDone()
    clearDone(hook)
    const remembered = hook.result.current.lastClearedDoneTasks
    clearDone(hook)
    expect(hook.result.current.lastClearedDoneTasks).toEqual(remembered)
  })
})
