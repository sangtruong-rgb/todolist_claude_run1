import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TaskFilter } from '../tasks/taskFilter'
import TaskFilters from './TaskFilters'

const labels: [TaskFilter, string][] = [
  ['all', 'Tất cả'],
  ['active', 'Chưa xong'],
  ['done', 'Đã xong'],
]

const group = () => screen.getByRole('group', { name: 'Lọc việc' })

describe('TaskFilters', () => {
  it('renders the group Lọc việc with three buttons in order', () => {
    render(<TaskFilters filter="all" onChoose={vi.fn()} />)
    const buttons = within(group()).getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual(['Tất cả', 'Chưa xong', 'Đã xong'])
    buttons.forEach((button) => expect(button).toHaveAttribute('type', 'button'))
  })

  it.each(labels)('marks only the button of filter %s as pressed', (filter, label) => {
    render(<TaskFilters filter={filter} onChoose={vi.fn()} />)
    for (const [, other] of labels) {
      expect(screen.getByRole('button', { name: other })).toHaveAttribute(
        'aria-pressed',
        String(other === label),
      )
    }
  })

  it('follows the filter prop and not clicks alone', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<TaskFilters filter="all" onChoose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Đã xong' }))
    expect(screen.getByRole('button', { name: 'Tất cả' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Đã xong' })).toHaveAttribute('aria-pressed', 'false')
    rerender(<TaskFilters filter="done" onChoose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Đã xong' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tất cả' })).toHaveAttribute('aria-pressed', 'false')
  })

  it.each([
    ['all', 'Chưa xong', 'active'],
    ['active', 'Đã xong', 'done'],
    ['done', 'Tất cả', 'all'],
  ] as const)(
    'with %s chosen, clicking %s calls onChoose with %s',
    async (current, label, next) => {
      const user = userEvent.setup()
      const onChoose = vi.fn()
      render(<TaskFilters filter={current} onChoose={onChoose} />)
      await user.click(screen.getByRole('button', { name: label }))
      expect(onChoose).toHaveBeenCalledTimes(1)
      expect(onChoose).toHaveBeenCalledWith(next)
    },
  )

  it.each([['{Enter}'], [' ']])('activates a focused button with the key %j', async (key) => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    render(<TaskFilters filter="all" onChoose={onChoose} />)
    screen.getByRole('button', { name: 'Đã xong' }).focus()
    await user.keyboard(key)
    expect(onChoose).toHaveBeenCalledTimes(1)
    expect(onChoose).toHaveBeenCalledWith('done')
  })
})
