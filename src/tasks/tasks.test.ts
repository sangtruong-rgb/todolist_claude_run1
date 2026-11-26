import { describe, expect, it } from 'vitest'
import { addTask, orderTasks, toggleTask } from './tasks'
import type { Task } from './tasks'

function task(id: string, done: boolean): Task {
  return { id, title: `Việc ${id}`, done }
}

describe('addTask', () => {
  it('adds an unfinished task with the title trimmed at both ends', () => {
    const result = addTask([], '  Mua sữa  ')
    expect(result).toHaveLength(1)
    expect(result?.[0]).toMatchObject({ title: 'Mua sữa', done: false })
  })

  it('keeps whitespace inside the title', () => {
    expect(addTask([], ' Mua   sữa ')?.[0]?.title).toBe('Mua   sữa')
  })

  it('puts the new task after the existing ones', () => {
    const existing = [task('a', false), task('b', true)]
    const result = addTask(existing, 'Mới')
    expect(result?.slice(0, 2)).toEqual(existing)
    expect(result?.[2]?.title).toBe('Mới')
  })

  it('gives every task a different non-empty id, even for the same title', () => {
    let list: Task[] = []
    for (let i = 0; i < 3; i++) list = addTask(list, 'Giống nhau') ?? list
    const ids = list.map((item) => item.id)
    expect(new Set(ids).size).toBe(3)
    expect(ids.every((id) => id.length > 0)).toBe(true)
  })

  it('refuses a blank title', () => {
    expect(addTask([], '')).toBeNull()
    expect(addTask([], '   ')).toBeNull()
    expect(addTask([], '\t\n ')).toBeNull()
  })

  it('does not change the list it is given', () => {
    const existing = [task('a', false)]
    addTask(existing, 'Mới')
    expect(existing).toEqual([task('a', false)])
  })
})

describe('toggleTask', () => {
  const list = [task('a', false), task('b', true), task('c', false)]

  it('flips only the named task and keeps the order', () => {
    expect(toggleTask(list, 'a')).toEqual([task('a', true), task('b', true), task('c', false)])
  })

  it('toggling twice gives the original list', () => {
    expect(toggleTask(toggleTask(list, 'b'), 'b')).toEqual(list)
  })

  it('leaves the list equal for an unknown id', () => {
    expect(toggleTask(list, 'zzz')).toEqual(list)
  })

  it('does not change the list it is given', () => {
    toggleTask(list, 'a')
    expect(list).toEqual([task('a', false), task('b', true), task('c', false)])
  })
})

describe('orderTasks (C6)', () => {
  const ids = (tasks: Task[]) => tasks.map((item) => item.id)

  it('puts unfinished tasks above finished ones, each group in creation order', () => {
    const list = [
      task('1', false),
      task('2', true),
      task('3', false),
      task('4', true),
      task('5', false),
    ]
    expect(ids(orderTasks(list))).toEqual(['1', '3', '5', '2', '4'])
  })

  it('moves a task marked done to its creation-order place among finished ones', () => {
    const list = [task('1', false), task('2', true), task('3', false), task('4', true)]
    const marked = toggleTask(list, '3')
    expect(ids(orderTasks(marked))).toEqual(['1', '2', '3', '4'])
    const markedFirst = toggleTask(list, '1')
    expect(ids(orderTasks(markedFirst))).toEqual(['3', '1', '2', '4'])
  })

  it('puts an un-marked task back among the unfinished by creation order', () => {
    const list = [task('1', false), task('2', true), task('3', false)]
    expect(ids(orderTasks(toggleTask(list, '2')))).toEqual(['1', '2', '3'])
  })

  it('gives an empty list for an empty list', () => {
    expect(orderTasks([])).toEqual([])
  })

  it('keeps creation order when all or none are done', () => {
    const allDone = [task('1', true), task('2', true)]
    const noneDone = [task('1', false), task('2', false)]
    expect(orderTasks(allDone)).toEqual(allDone)
    expect(orderTasks(noneDone)).toEqual(noneDone)
  })

  it('does not change the list it is given', () => {
    const list = [task('1', true), task('2', false)]
    orderTasks(list)
    expect(ids(list)).toEqual(['1', '2'])
  })
})
