import { describe, expect, it } from 'vitest'
import type { Task } from './tasks'
import { filterTasks } from './taskFilter'

function task(id: string, done: boolean): Task {
  return { id, title: 'Việc ' + id, done }
}

const a = task('a', false)
const b = task('b', false)
const c = task('c', false)
const x = task('x', true)
const y = task('y', true)
const tasks = [a, b, c, x, y]
const ids = (list: Task[]) => list.map((item) => item.id)

describe('filterTasks', () => {
  it('shows every task in order under all', () => {
    expect(ids(filterTasks(tasks, 'all'))).toEqual(['a', 'b', 'c', 'x', 'y'])
  })

  it('shows only unfinished tasks under active', () => {
    expect(ids(filterTasks(tasks, 'active'))).toEqual(['a', 'b', 'c'])
  })

  it('shows only finished tasks under done', () => {
    expect(ids(filterTasks(tasks, 'done'))).toEqual(['x', 'y'])
  })

  it.each(['all', 'active', 'done'] as const)(
    'gives nothing for an empty list under %s',
    (filter) => {
      expect(filterTasks([], filter)).toEqual([])
    },
  )

  it('gives nothing under active when all are finished', () => {
    expect(filterTasks([x, y], 'active')).toEqual([])
  })

  it('gives nothing under done when none is finished', () => {
    expect(filterTasks([a, b], 'done')).toEqual([])
  })

  describe('held task under active', () => {
    it('stands at the given index', () => {
      expect(ids(filterTasks(tasks, 'active', { id: 'x', index: 1 }))).toEqual(['a', 'x', 'b', 'c'])
    })

    it('stands first at index 0', () => {
      expect(ids(filterTasks(tasks, 'active', { id: 'x', index: 0 }))).toEqual(['x', 'a', 'b', 'c'])
    })

    it('stands last at index 3', () => {
      expect(ids(filterTasks(tasks, 'active', { id: 'x', index: 3 }))).toEqual(['a', 'b', 'c', 'x'])
    })

    it('stands last when the index is past the end', () => {
      expect(ids(filterTasks(tasks, 'active', { id: 'x', index: 99 }))).toEqual([
        'a',
        'b',
        'c',
        'x',
      ])
    })

    it('stands first when the index is negative', () => {
      expect(ids(filterTasks(tasks, 'active', { id: 'x', index: -5 }))).toEqual([
        'x',
        'a',
        'b',
        'c',
      ])
    })

    it('stands first when the index is -1', () => {
      expect(ids(filterTasks(tasks, 'active', { id: 'x', index: -1 }))).toEqual([
        'x',
        'a',
        'b',
        'c',
      ])
    })

    it('is ignored when it names an unknown task', () => {
      expect(ids(filterTasks(tasks, 'active', { id: 'zzz', index: 1 }))).toEqual(['a', 'b', 'c'])
    })

    it('is ignored when it names an unfinished task', () => {
      expect(ids(filterTasks(tasks, 'active', { id: 'b', index: 0 }))).toEqual(['a', 'b', 'c'])
    })

    it('is ignored when null or omitted', () => {
      expect(ids(filterTasks(tasks, 'active', null))).toEqual(['a', 'b', 'c'])
      expect(ids(filterTasks(tasks, 'active', undefined))).toEqual(['a', 'b', 'c'])
    })

    it('is ignored under all and done', () => {
      const held = { id: 'x', index: 0 }
      expect(ids(filterTasks(tasks, 'all', held))).toEqual(['a', 'b', 'c', 'x', 'y'])
      expect(ids(filterTasks(tasks, 'done', held))).toEqual(['x', 'y'])
    })
  })

  it('returns the same task objects in a new array and leaves the argument alone', () => {
    const input = [...tasks]
    const result = filterTasks(input, 'all')
    expect(result).not.toBe(input)
    result.forEach((item, position) => expect(item).toBe(input[position]))
    const held = filterTasks(input, 'active', { id: 'x', index: 1 })
    expect(held[1]).toBe(x)
    expect(input).toEqual(tasks)
    expect(input).toHaveLength(5)
  })
})
