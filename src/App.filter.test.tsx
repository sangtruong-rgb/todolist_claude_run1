import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { TASKS_STORAGE_KEY } from './tasks/taskStorage'

type User = ReturnType<typeof userEvent.setup>

function seed(...tasks: { id: string; title: string; done?: boolean }[]) {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(tasks.map((task) => ({ done: false, ...task }))),
  )
}

function seedFour() {
  seed(
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B', done: true },
    { id: 'c', title: 'C' },
    { id: 'd', title: 'D', done: true },
  )
}

function taskNames() {
  return screen.queryAllByRole('checkbox').map((box) => box.getAttribute('aria-label'))
}

function box(title: string) {
  return screen.getByRole('checkbox', { name: 'Đã xong: ' + title })
}

function filterButton(name: string) {
  return within(screen.getByRole('group', { name: 'Lọc việc' })).getByRole('button', { name })
}

function field() {
  return screen.getByRole('textbox', { name: 'Việc mới' })
}

function countLine(count: number) {
  return screen.getByText(count + ' việc chưa xong')
}

function choose(user: User, name: string) {
  return user.click(filterButton(name))
}

function before(first: HTMLElement, second: HTMLElement) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
}

// Testing Library only advances fake timers by itself when it finds a `jest` global.
function useFakeTimers() {
  vi.useFakeTimers()
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime })
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

function preferReducedMotion() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
  }))
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C1 filter buttons', () => {
  it('shows the group between the add field and the list, in order', () => {
    seedFour()
    render(<App />)
    const group = screen.getByRole('group', { name: 'Lọc việc' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Tất cả', 'Chưa xong', 'Đã xong'])
    expect(before(field(), group)).toBe(true)
    expect(before(group, screen.getAllByRole('list')[0])).toBe(true)
  })

  it('is there with no task', () => {
    render(<App />)
    expect(screen.getByRole('group', { name: 'Lọc việc' })).toBeInTheDocument()
  })

  it('presses only the chosen button, and starts on Tất cả after a reload', async () => {
    seedFour()
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    const names = ['Tất cả', 'Chưa xong', 'Đã xong']
    expect(names.map((name) => filterButton(name).getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ])
    for (const [index, name] of names.entries()) {
      await choose(user, name)
      const pressed = names.map((other) => filterButton(other).getAttribute('aria-pressed'))
      expect(pressed).toEqual(names.map((_, at) => String(at === index)))
    }
    unmount()
    render(<App />)
    expect(filterButton('Tất cả')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('C2 filtered list', () => {
  it('shows only the tasks the filter allows', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    expect(taskNames()).toEqual(['A', 'C', 'B', 'D'].map((title) => 'Đã xong: ' + title))
    await choose(user, 'Chưa xong')
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: C'])
    await choose(user, 'Đã xong')
    expect(taskNames()).toEqual(['Đã xong: B', 'Đã xong: D'])
  })

  it('closes edit mode, dropping unsaved text, when a switch hides the edited task', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: A' }))
    await user.type(screen.getByRole('textbox', { name: 'Tên việc' }), ' thêm')
    await choose(user, 'Đã xong')
    expect(screen.queryByRole('textbox', { name: 'Tên việc' })).not.toBeInTheDocument()
    await choose(user, 'Tất cả')
    expect(box('A')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Tên việc' })).not.toBeInTheDocument()
  })

  it('does the same for a finished task hidden by Chưa xong', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.type(screen.getByRole('textbox', { name: 'Tên việc' }), ' thêm')
    await choose(user, 'Chưa xong')
    await choose(user, 'Tất cả')
    expect(box('B')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Tên việc' })).not.toBeInTheDocument()
  })
})

describe('C3 a toggled task leaves the filtered list', () => {
  function threeFinished() {
    seed(
      { id: 'a', title: 'A', done: true },
      { id: 'b', title: 'B', done: true },
      { id: 'c', title: 'C', done: true },
    )
  }

  it('under Đã xong, unticking the middle task focuses the box below', async () => {
    threeFinished()
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Đã xong')
    await user.click(box('B'))
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: C'])
    expect(box('C')).toHaveFocus()
  })

  it('under Đã xong, unticking the last task focuses the box above', async () => {
    threeFinished()
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Đã xong')
    await user.click(box('C'))
    expect(box('B')).toHaveFocus()
  })

  it('under Đã xong, unticking the only task shows the message and focuses the field', async () => {
    seed({ id: 'a', title: 'A', done: true })
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Đã xong')
    await user.click(box('A'))
    expect(screen.getByText('Chưa có việc nào xong.')).toBeInTheDocument()
    expect(field()).toHaveFocus()
  })

  it('moves focus the same way for the keyboard', async () => {
    threeFinished()
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Đã xong')
    box('B').focus()
    await user.keyboard(' ')
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: C'])
    expect(box('C')).toHaveFocus()
  })

  it('skips the row below in edit mode and takes the next one', async () => {
    threeFinished()
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Đã xong')
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.click(box('A'))
    expect(screen.getByRole('textbox', { name: 'Tên việc' })).toBeInTheDocument()
    expect(box('C')).toHaveFocus()
  })

  it('falls back to the row above when the row below is in edit mode', async () => {
    seed(
      { id: 'a', title: 'A', done: true },
      { id: 'b', title: 'B', done: true },
      { id: 'c', title: 'C', done: true },
    )
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Đã xong')
    await user.click(screen.getByRole('button', { name: 'Sửa: C' }))
    await user.click(box('B'))
    expect(box('A')).toHaveFocus()
  })

  it('under Chưa xong, a ticked row stands still for 200 ms and then leaves', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' })
    useFakeTimers()
    const user = setup()
    render(<App />)
    await choose(user, 'Chưa xong')
    await user.click(box('B'))
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B', 'Đã xong: C'])
    expect(box('B')).toBeChecked()
    expect(box('B')).toHaveFocus()
    expect(countLine(2)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xoá việc đã xong (1)' })).toBeInTheDocument()
    advance(100)
    expect(box('B')).toBeInTheDocument()
    advance(300)
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: C'])
    expect(box('C')).toHaveFocus()
  })

  it('focuses the box above after the last row leaves', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' })
    useFakeTimers()
    const user = setup()
    render(<App />)
    await choose(user, 'Chưa xong')
    await user.click(box('B'))
    advance(400)
    expect(box('A')).toHaveFocus()
  })

  it('shows the message and focuses the field after the only task leaves', async () => {
    seed({ id: 'a', title: 'A' })
    useFakeTimers()
    const user = setup()
    render(<App />)
    await choose(user, 'Chưa xong')
    await user.click(box('A'))
    advance(400)
    expect(screen.getByText('Không còn việc nào chưa xong.')).toBeInTheDocument()
    expect(field()).toHaveFocus()
  })

  it('removes the row in the same step under reduced motion', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' })
    preferReducedMotion()
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Chưa xong')
    await user.click(box('B'))
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: C'])
    expect(box('C')).toHaveFocus()
  })

  it('keeps a task shown when it is unticked again before the row left', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' })
    useFakeTimers()
    const user = setup()
    render(<App />)
    await choose(user, 'Chưa xong')
    await user.click(box('B'))
    advance(100)
    await user.click(box('B'))
    advance(400)
    expect(box('B')).not.toBeChecked()
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B'])
  })

  it('switches Đã xong to Tất cả when a task is added', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Đã xong')
    await user.type(field(), 'Mới')
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(filterButton('Tất cả')).toHaveAttribute('aria-pressed', 'true')
    expect(box('Mới')).toBeInTheDocument()
    expect(field()).toHaveFocus()
  })

  it('does not switch on a blank add under Đã xong', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Đã xong')
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(filterButton('Đã xong')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Hãy nhập tên việc.')).toBeInTheDocument()
  })

  it('keeps Chưa xong when a task is added under it', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Chưa xong')
    await user.type(field(), 'Mới')
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(filterButton('Chưa xong')).toHaveAttribute('aria-pressed', 'true')
    expect(box('Mới')).toBeInTheDocument()
  })
})

describe('C4 count line', () => {
  it('reads 0 with no task, after the heading and before the field', () => {
    render(<App />)
    const line = countLine(0)
    expect(before(screen.getByRole('heading', { name: 'Việc của tôi' }), line)).toBe(true)
    expect(before(line, field())).toBe(true)
  })

  it('follows add, tick, untick, delete, undo and clear', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B', done: true })
    const user = userEvent.setup()
    render(<App />)
    expect(countLine(1)).toBeInTheDocument()
    await user.type(field(), 'C')
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(countLine(2)).toBeInTheDocument()
    await user.click(box('A'))
    expect(countLine(1)).toBeInTheDocument()
    await user.click(box('A'))
    expect(countLine(2)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Xoá: A' }))
    expect(countLine(1)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(countLine(2)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Xoá: C' }))
    await user.click(screen.getByRole('button', { name: 'Xoá việc đã xong (1)' }))
    expect(countLine(1)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(countLine(1)).toBeInTheDocument()
  })

  it('does not depend on the filter and is no status element', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    for (const name of ['Tất cả', 'Chưa xong', 'Đã xong']) {
      await choose(user, name)
      expect(countLine(2)).toBeInTheDocument()
    }
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('C5 nothing to show', () => {
  it('shows the message of Chưa xong when everything is finished', async () => {
    seed({ id: 'a', title: 'A', done: true })
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Chưa xong')
    expect(screen.getByText('Không còn việc nào chưa xong.')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.queryByText('Trang này còn trống.')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Viết việc đầu tiên vào ô phía trên rồi nhấn Thêm.'),
    ).not.toBeInTheDocument()
  })

  it('shows the message of Đã xong when nothing is finished', async () => {
    seed({ id: 'a', title: 'A' })
    const user = userEvent.setup()
    render(<App />)
    await choose(user, 'Đã xong')
    expect(screen.getByText('Chưa có việc nào xong.')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.queryByText('Trang này còn trống.')).not.toBeInTheDocument()
  })

  it('shows the empty page under every filter when there is no task', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (const name of ['Tất cả', 'Chưa xong', 'Đã xong']) {
      await choose(user, name)
      expect(screen.getByText('Trang này còn trống.')).toBeInTheDocument()
      expect(
        screen.getByText('Viết việc đầu tiên vào ô phía trên rồi nhấn Thêm.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('Không còn việc nào chưa xong.')).not.toBeInTheDocument()
      expect(screen.queryByText('Chưa có việc nào xong.')).not.toBeInTheDocument()
    }
  })
})

describe('C6 clear button', () => {
  it('shows under every filter, after the list, and counts the finished tasks', async () => {
    seed({ id: 'a', title: 'A', done: true }, { id: 'b', title: 'B', done: true })
    const user = userEvent.setup()
    render(<App />)
    for (const name of ['Tất cả', 'Chưa xong', 'Đã xong']) {
      await choose(user, name)
      const clear = screen.getByRole('button', { name: 'Xoá việc đã xong (2)' })
      const content = screen.queryAllByRole('list')[0] ?? screen.getByText(/^Không còn/)
      expect(before(content, clear)).toBe(true)
    }
  })

  it('follows ticking and unticking', async () => {
    seed(
      { id: 'a', title: 'A', done: true },
      { id: 'b', title: 'B', done: true },
      { id: 'c', title: 'C' },
    )
    const user = userEvent.setup()
    render(<App />)
    await user.click(box('C'))
    expect(screen.getByRole('button', { name: 'Xoá việc đã xong (3)' })).toBeInTheDocument()
    await user.click(box('C'))
    expect(screen.getByRole('button', { name: 'Xoá việc đã xong (2)' })).toBeInTheDocument()
  })

  it('is not there with no finished task', () => {
    seed({ id: 'a', title: 'A' })
    render(<App />)
    expect(screen.queryByRole('button', { name: /^Xoá việc đã xong/ })).not.toBeInTheDocument()
  })
})
