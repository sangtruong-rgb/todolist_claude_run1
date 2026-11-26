import { afterEach, describe, expect, it, vi } from 'vitest'
import { TASKS_STORAGE_KEY, loadTasks, saveTasks } from './taskStorage'
import type { Task } from './tasks'

const list: Task[] = [
  { id: 'a', title: 'Mua sữa đậu nành', done: true },
  { id: 'b', title: 'Gọi điện cho bà', done: false },
]

function refuseWrites() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('refused', 'QuotaExceededError')
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('C7 saving and loading', () => {
  it('opens empty and able to save when nothing was saved', () => {
    expect(loadTasks()).toEqual({ tasks: [], canSave: true })
  })

  it('brings back the saved list with order, ids, titles and done states', () => {
    expect(saveTasks(list)).toBe(true)
    expect(loadTasks().tasks).toEqual(list)
  })

  it('replaces the earlier save on a second save', () => {
    saveTasks(list)
    const other: Task[] = [{ id: 'z', title: 'Khác', done: false }]
    saveTasks(other)
    expect(loadTasks().tasks).toEqual(other)
  })

  it('loading does not change the saved tasks', () => {
    saveTasks(list)
    loadTasks()
    loadTasks()
    expect(loadTasks().tasks).toEqual(list)
  })
})

describe('unreadable saved data', () => {
  it.each(['not json', '42', '{"a":1}', '[{"id":1}]', '[{"id":"a","title":"x","done":"no"}]'])(
    'treats %s as no saved tasks',
    (text) => {
      localStorage.setItem(TASKS_STORAGE_KEY, text)
      expect(loadTasks().tasks).toEqual([])
    },
  )
})

describe('C8 refused write', () => {
  it('reports the refusal and still returns what was saved before', () => {
    saveTasks(list)
    refuseWrites()
    const other: Task[] = [{ id: 'z', title: 'Khác', done: false }]
    expect(saveTasks(other)).toBe(false)
    expect(loadTasks()).toEqual({ tasks: list, canSave: false })
  })

  it('can save again once the browser accepts writes', () => {
    saveTasks(list)
    refuseWrites()
    vi.restoreAllMocks()
    expect(saveTasks(list)).toBe(true)
    expect(loadTasks().canSave).toBe(true)
  })
})

describe('C8 storage denied', () => {
  it('opens empty, cannot save, and does not throw', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(loadTasks()).toEqual({ tasks: [], canSave: false })
    expect(saveTasks(list)).toBe(false)
  })
})
