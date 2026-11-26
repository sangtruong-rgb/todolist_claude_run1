import { describe, expect, it } from 'vitest'
import {
  addTask,
  clearDoneTasks,
  deleteTask,
  orderTasks,
  renameTask,
  restoreTask,
  restoreTasks,
  toggleTask,
} from './tasks'
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

describe('renameTask', () => {
  const list = [task('a', false), task('b', true), task('c', false)]

  it('replaces the title with the trimmed one and keeps id, done and position of every task', () => {
    expect(renameTask(list, 'b', '  Tên mới  ')).toEqual([
      task('a', false),
      { id: 'b', title: 'Tên mới', done: true },
      task('c', false),
    ])
  })

  it('keeps whitespace inside the title', () => {
    expect(renameTask(list, 'a', ' Mua   sữa ')?.[0]?.title).toBe('Mua   sữa')
  })

  it('refuses a blank title', () => {
    expect(renameTask(list, 'a', '')).toBeNull()
    expect(renameTask(list, 'a', '   ')).toBeNull()
    expect(renameTask(list, 'a', '\t\n ')).toBeNull()
  })

  it('leaves the list equal for an unknown id', () => {
    expect(renameTask(list, 'zzz', 'Tên mới')).toEqual(list)
  })

  it('does not shorten a 250-character title', () => {
    const long = 'x'.repeat(250)
    expect(renameTask(list, 'a', long)?.[0]?.title).toBe(long)
  })

  it('does not change the list it is given', () => {
    renameTask(list, 'a', 'Tên mới')
    expect(list).toEqual([task('a', false), task('b', true), task('c', false)])
  })
})

describe('deleteTask', () => {
  const list = [task('a', false), task('b', true), task('c', false)]

  it.each([
    ['first', 'a', 0, ['b', 'c']],
    ['middle', 'b', 1, ['a', 'c']],
    ['last', 'c', 2, ['a', 'b']],
  ])(
    'removes the %s task, keeps the others in order and remembers its index',
    (_, id, index, rest) => {
      const result = deleteTask(list, id)
      expect(result?.tasks.map((item) => item.id)).toEqual(rest)
      expect(result?.deleted).toEqual({ task: list[index], index })
    },
  )

  it('returns null for an unknown id', () => {
    expect(deleteTask(list, 'zzz')).toBeNull()
  })

  it('does not change the list it is given', () => {
    deleteTask(list, 'b')
    expect(list).toEqual([task('a', false), task('b', true), task('c', false)])
  })
})

describe('restoreTask', () => {
  const list = [task('a', false), task('b', true), task('c', false)]

  it.each(['a', 'b', 'c'])('gives back the original list after deleting %s', (id) => {
    const result = deleteTask(list, id)
    expect(result).not.toBeNull()
    expect(restoreTask(result!.tasks, result!.deleted)).toEqual(list)
  })

  it('keeps a task appended after the deletion after the restored one', () => {
    const result = deleteTask(list, 'b')!
    const appended = [...result.tasks, task('d', false)]
    expect(restoreTask(appended, result.deleted).map((item) => item.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  it('appends when the index is beyond the end', () => {
    expect(restoreTask([task('a', false)], { task: task('z', true), index: 5 })).toEqual([
      task('a', false),
      task('z', true),
    ])
  })

  it('does not change the list it is given', () => {
    const rest = [task('a', false), task('c', false)]
    restoreTask(rest, { task: task('b', true), index: 1 })
    expect(rest).toEqual([task('a', false), task('c', false)])
  })
})

describe('clearDoneTasks', () => {
  it('removes every finished task and keeps the unfinished ones in order', () => {
    const list = [task('a', true), task('b', false), task('c', true), task('d', false)]
    const result = clearDoneTasks(list)
    expect(result?.tasks).toEqual([task('b', false), task('d', false)])
    expect(result?.deleted).toEqual([
      { task: task('a', true), index: 0 },
      { task: task('c', true), index: 2 },
    ])
  })

  it('returns null when nothing is finished, also for an empty list', () => {
    expect(clearDoneTasks([task('a', false), task('b', false)])).toBeNull()
    expect(clearDoneTasks([])).toBeNull()
  })

  it('removes everything when all are finished', () => {
    const list = [task('a', true), task('b', true)]
    const result = clearDoneTasks(list)
    expect(result?.tasks).toEqual([])
    expect(result?.deleted).toEqual([
      { task: task('a', true), index: 0 },
      { task: task('b', true), index: 1 },
    ])
  })

  it('does not change the list it is given', () => {
    const list = [task('a', true), task('b', false)]
    clearDoneTasks(list)
    expect(list).toEqual([task('a', true), task('b', false)])
  })
})

describe('restoreTasks', () => {
  const patterns: [string, Task[]][] = [
    ['finished first', [task('a', true), task('b', true), task('c', false), task('d', false)]],
    ['finished last', [task('a', false), task('b', false), task('c', true), task('d', true)]],
    ['adjacent', [task('a', false), task('b', true), task('c', true), task('d', false)]],
    ['alternating', [task('a', true), task('b', false), task('c', true), task('d', false)]],
    ['all finished', [task('a', true), task('b', true), task('c', true)]],
  ]

  it.each(patterns)('gives back the original list after a clear (%s)', (_, list) => {
    const cleared = clearDoneTasks(list)!
    expect(restoreTasks(cleared.tasks, cleared.deleted)).toEqual(list)
  })

  it('puts a task appended after the clear behind the restored ones', () => {
    const cleared = clearDoneTasks([task('a', true), task('b', false), task('c', true)])!
    const appended = [...cleared.tasks, task('d', false)]
    expect(restoreTasks(appended, cleared.deleted).map((item) => item.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  it('gives the same result when deleted is in descending index order', () => {
    const list = [task('a', true), task('b', false), task('c', true), task('d', false)]
    const cleared = clearDoneTasks(list)!
    expect(restoreTasks(cleared.tasks, [...cleared.deleted].reverse())).toEqual(list)
  })

  it('appends entries whose index is beyond the end, in ascending index order', () => {
    const result = restoreTasks(
      [task('a', false)],
      [
        { task: task('y', true), index: 9 },
        { task: task('x', true), index: 5 },
      ],
    )
    expect(result.map((item) => item.id)).toEqual(['a', 'x', 'y'])
  })

  it('returns an equal list for an empty deleted', () => {
    const list = [task('a', false)]
    expect(restoreTasks(list, [])).toEqual(list)
  })

  it('mutates neither argument', () => {
    const list = [task('b', false)]
    const deleted = [
      { task: task('c', true), index: 1 },
      { task: task('a', true), index: 0 },
    ]
    restoreTasks(list, deleted)
    expect(list).toEqual([task('b', false)])
    expect(deleted.map((entry) => entry.index)).toEqual([1, 0])
  })
})
