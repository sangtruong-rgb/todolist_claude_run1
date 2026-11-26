/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const THEMES = {
  light: {
    paper: 'rgb(251, 247, 239)',
    ink: 'rgb(46, 42, 36)',
    muted: 'rgb(122, 111, 96)',
    rule: 'rgb(227, 215, 195)',
  },
  dark: {
    paper: 'rgb(34, 31, 26)',
    ink: 'rgb(241, 233, 218)',
    muted: 'rgb(179, 167, 147)',
    rule: 'rgb(58, 53, 45)',
  },
} as const
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

function field(page: Page) {
  return page.getByRole('textbox', { name: 'Việc mới' })
}

function filter(page: Page, name: string) {
  return page.getByRole('group', { name: 'Lọc việc' }).getByRole('button', { name, exact: true })
}

function tick(page: Page, title: string) {
  return page.getByRole('checkbox', { name: 'Đã xong: ' + title })
}

function clearButton(page: Page, count: number) {
  return page.getByRole('button', { name: 'Xoá việc đã xong (' + count + ')' })
}

async function addTask(page: Page, title: string) {
  await field(page).fill(title)
  await page.getByRole('button', { name: 'Thêm' }).click()
}

async function style(locator: Locator, property: string) {
  return locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property)
}

async function box(locator: Locator) {
  const found = await locator.boundingBox()
  if (found === null) throw new Error('element has no box')
  return found
}

async function tickLabels(page: Page) {
  return page
    .getByRole('checkbox')
    .evaluateAll((boxes) => boxes.map((b) => b.getAttribute('aria-label')))
}

function labels(...titles: string[]) {
  return titles.map((title) => 'Đã xong: ' + title)
}

async function recordMotion(page: Page) {
  await page.evaluate(() => {
    const log: { target: string; row: string | null; name: string }[] = []
    ;(window as unknown as { motionLog: typeof log }).motionLog = log
    document.addEventListener(
      'animationstart',
      (event) => {
        const target = event.target as Element
        const rowBox = target.closest('li')?.querySelector('input[data-task-id]')
        log.push({
          target: target.className.toString(),
          row: rowBox?.getAttribute('aria-label') ?? null,
          name: (event as AnimationEvent).animationName,
        })
      },
      true,
    )
  })
}

async function readMotion(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { motionLog: { target: string; row: string | null; name: string }[] })
        .motionLog,
  )
}

// A, B, C added; B finished.
async function addThree(page: Page) {
  for (const title of ['A', 'B', 'C']) await addTask(page, title)
  await tick(page, 'B').check()
}

test('C1 starts on Tất cả after a reload', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'A')
  await filter(page, 'Chưa xong').click()
  await expect(filter(page, 'Chưa xong')).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(filter(page, 'Tất cả')).toHaveAttribute('aria-pressed', 'true')
  await expect(filter(page, 'Chưa xong')).toHaveAttribute('aria-pressed', 'false')
  await expect(filter(page, 'Đã xong')).toHaveAttribute('aria-pressed', 'false')
})

test('C2 each filter shows its rows, and a switch closes a hidden edit', async ({ page }) => {
  await page.goto('/')
  await addThree(page)
  expect(await tickLabels(page)).toEqual(labels('A', 'C', 'B'))
  await filter(page, 'Chưa xong').click()
  expect(await tickLabels(page)).toEqual(labels('A', 'C'))
  await filter(page, 'Đã xong').click()
  expect(await tickLabels(page)).toEqual(labels('B'))
  await filter(page, 'Tất cả').click()
  await page.getByRole('button', { name: 'Sửa: A' }).click()
  await expect(page.getByRole('textbox', { name: 'Tên việc' })).toBeVisible()
  await filter(page, 'Đã xong').click()
  await filter(page, 'Tất cả').click()
  await expect(page.getByRole('textbox', { name: 'Tên việc' })).toHaveCount(0)
  await expect(tick(page, 'A')).toBeVisible()
})

test.describe('C3 leaving the filtered list', () => {
  test('a ticked row stands until the clock runs, then focus goes below', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    for (const title of ['A', 'B', 'C']) await addTask(page, title)
    await filter(page, 'Chưa xong').click()
    await recordMotion(page)
    await tick(page, 'B').check()
    expect(await tickLabels(page)).toEqual(labels('A', 'B', 'C'))
    await expect(tick(page, 'B')).toBeChecked()
    await expect
      .poll(async () => (await readMotion(page)).filter((entry) => entry.row === 'Đã xong: B'))
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'draw-tick' }),
          expect.objectContaining({ name: 'fade-title' }),
        ]),
      )
    expect(await tickLabels(page)).toEqual(labels('A', 'B', 'C'))
    await page.clock.runFor(400)
    expect(await tickLabels(page)).toEqual(labels('A', 'C'))
    await expect(tick(page, 'C')).toBeFocused()
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('the row is gone at once', async ({ page }) => {
      await page.goto('/')
      for (const title of ['A', 'B', 'C']) await addTask(page, title)
      await filter(page, 'Chưa xong').click()
      await tick(page, 'B').click()
      expect(await tickLabels(page)).toEqual(labels('A', 'C'))
      await expect(tick(page, 'C')).toBeFocused()
    })
  })

  test.describe('with touch', () => {
    test.use({ hasTouch: true })

    test('a tap under Đã xong removes the row and focuses the next box', async ({ page }) => {
      await page.goto('/')
      for (const title of ['A', 'B', 'C']) await addTask(page, title)
      for (const title of ['A', 'B', 'C']) await tick(page, title).check()
      await filter(page, 'Đã xong').tap()
      await tick(page, 'B').tap()
      expect(await tickLabels(page)).toEqual(labels('A', 'C'))
      await expect(tick(page, 'C')).toBeFocused()
    })
  })

  test('adding a task under Đã xong presses Tất cả and shows it', async ({ page }) => {
    await page.goto('/')
    await addThree(page)
    await filter(page, 'Đã xong').click()
    await addTask(page, 'Mới')
    await expect(filter(page, 'Tất cả')).toHaveAttribute('aria-pressed', 'true')
    await expect(tick(page, 'Mới')).toBeVisible()
  })
})

test.describe('C7 clearing', () => {
  test('removes the finished rows with no dialog and focuses the field', async ({ page }) => {
    let dialogs = 0
    page.on('dialog', () => dialogs++)
    await page.goto('/')
    await addThree(page)
    await tick(page, 'C').check()
    await clearButton(page, 2).click()
    expect(dialogs).toBe(0)
    expect(await tickLabels(page)).toEqual(labels('A'))
    await expect(field(page)).toBeFocused()
    await expect(page.getByRole('status')).toHaveText(/Đã xoá 2 việc đã xong/)
  })

  test('the toast slides in over 0.2s and rests at full opacity', async ({ page }) => {
    await page.goto('/')
    await addThree(page)
    await clearButton(page, 1).click()
    const toast = page.getByRole('status')
    expect(await style(toast, 'animation-duration')).toBe('0.2s')
    await expect.poll(() => style(toast, 'opacity')).toBe('1')
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('the toast has no animation', async ({ page }) => {
      await page.goto('/')
      await addThree(page)
      await clearButton(page, 1).click()
      expect(await style(page.getByRole('status'), 'animation-name')).toBe('none')
    })
  })

  test('the toast waits while hovered and goes 5 s after the pointer left', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    await addThree(page)
    await clearButton(page, 1).click()
    const toast = page.getByRole('status')
    await toast.hover()
    await page.clock.runFor(8000)
    await expect(toast).toBeVisible()
    await page.mouse.move(5, 5)
    await page.clock.runFor(4900)
    await expect(toast).toBeVisible()
    await page.clock.runFor(200)
    await expect(toast).toHaveCount(0)
  })

  test('Hoàn tác restores the rows in place, focuses the first, and plays no motion', async ({
    page,
  }) => {
    await page.goto('/')
    for (const title of ['A', 'B', 'C']) await addTask(page, title)
    await tick(page, 'A').check()
    await tick(page, 'C').check()
    await page.waitForTimeout(400)
    await clearButton(page, 2).click()
    await recordMotion(page)
    await page.getByRole('button', { name: 'Hoàn tác' }).click()
    expect(await tickLabels(page)).toEqual(labels('B', 'A', 'C'))
    await expect(tick(page, 'A')).toBeFocused()
    await filter(page, 'Chưa xong').click()
    await filter(page, 'Đã xong').click()
    await filter(page, 'Tất cả').click()
    await page.waitForTimeout(400)
    const rowMotion = (await readMotion(page)).filter(
      (entry) => !entry.target.includes('undo-toast'),
    )
    expect(rowMotion).toEqual([])
  })

  test('a reload right after clearing leaves the rows absent and no Hoàn tác', async ({ page }) => {
    await page.goto('/')
    await addThree(page)
    await clearButton(page, 1).click()
    await page.reload()
    expect(await tickLabels(page)).toEqual(labels('A', 'C'))
    await expect(page.getByRole('button', { name: 'Hoàn tác' })).toHaveCount(0)
  })
})

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const

for (const viewport of VIEWPORTS) {
  for (const scheme of ['light', 'dark'] as const) {
    const colours = THEMES[scheme]
    test.describe(`C8 look at ${viewport.name} ${scheme}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto('/')
      })

      async function expectNoHorizontalScroll(page: Page) {
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        expect(scrollWidth).toBeLessThanOrEqual(viewport.width)
      }

      test('count line, filters and clear button', async ({ page }) => {
        await addThree(page)
        const count = page.getByText('2 việc chưa xong')
        const heading = page.getByRole('heading', { name: 'Việc của tôi' })
        expect(await style(count, 'color')).toBe(colours.muted)
        expect(await style(count, 'font-size')).toBe('13px')
        expect(await style(count, 'line-height')).toBe('20px')
        const countBox = await box(count)
        const headingBox = await box(heading)
        const fieldBox = await box(field(page))
        expect(countBox.y).toBeGreaterThanOrEqual(headingBox.y + headingBox.height)
        expect(countBox.y + countBox.height).toBeLessThanOrEqual(fieldBox.y)
        expect(Math.abs(countBox.x - headingBox.x)).toBeLessThanOrEqual(1)

        const group = page.getByRole('group', { name: 'Lọc việc' })
        const groupBox = await box(group)
        const addBox = await box(page.getByRole('button', { name: 'Thêm' }))
        const listBox = await box(page.getByRole('list'))
        expect(groupBox.y).toBeGreaterThanOrEqual(addBox.y + addBox.height)
        expect(groupBox.y + groupBox.height).toBeLessThanOrEqual(listBox.y + 1)
        expect(await style(group, 'border-bottom-color')).toBe(colours.rule)
        expect(await style(group, 'border-bottom-width')).toBe('1px')
        const xs = []
        for (const name of ['Tất cả', 'Chưa xong', 'Đã xong'])
          xs.push((await box(filter(page, name))).x)
        expect(xs).toEqual([...xs].sort((a, b) => a - b))
        const chosen = filter(page, 'Tất cả')
        expect(await style(chosen, 'color')).toBe(colours.ink)
        expect(await style(chosen, 'font-weight')).toBe('600')
        expect(await style(chosen, 'border-bottom-color')).toBe(colours.ink)
        expect(await style(chosen, 'border-bottom-width')).toBe('2px')
        for (const name of ['Chưa xong', 'Đã xong']) {
          const other = filter(page, name)
          expect(await style(other, 'color')).toBe(colours.muted)
          expect(await style(other, 'font-weight')).toBe('400')
          expect(await style(other, 'border-bottom-color')).toBe(TRANSPARENT)
          expect(await style(other, 'background-color')).toBe(TRANSPARENT)
        }

        const clear = clearButton(page, 1)
        const clearBox = await box(clear)
        expect(await style(clear, 'color')).toBe(colours.muted)
        expect(await style(clear, 'font-size')).toBe('14px')
        expect(await style(clear, 'background-color')).toBe(TRANSPARENT)
        expect(clearBox.y).toBeGreaterThanOrEqual(listBox.y + listBox.height)
        expect(
          Math.abs(clearBox.x + clearBox.width - (listBox.x + listBox.width)),
        ).toBeLessThanOrEqual(1)
        await expectNoHorizontalScroll(page)
      })

      test('filter-empty messages', async ({ page }) => {
        await addTask(page, 'A')
        await filter(page, 'Đã xong').click()
        await expectEmptyMessage(page, 'Chưa có việc nào xong.')
        await expectNoHorizontalScroll(page)
      })

      async function expectEmptyMessage(page: Page, text: string) {
        const message = page.getByText(text, { exact: true })
        expect((await style(message, 'font-family')).startsWith('Georgia')).toBe(true)
        expect(await style(message, 'font-style')).toBe('italic')
        expect(await style(message, 'font-size')).toBe('20px')
        expect(await style(message, 'color')).toBe(colours.ink)
        expect(await style(message.locator('..'), 'border-bottom-color')).toBe(colours.rule)
      }

      test('the finished-empty message sits above the clear button', async ({ page }) => {
        await addTask(page, 'A')
        await tick(page, 'A').check()
        await filter(page, 'Chưa xong').click()
        await expectEmptyMessage(page, 'Không còn việc nào chưa xong.')
        const message = await box(page.getByText('Không còn việc nào chưa xong.'))
        const clearBox = await box(clearButton(page, 1))
        expect(clearBox.y).toBeGreaterThanOrEqual(message.y + message.height)
        await expectNoHorizontalScroll(page)
      })

      test('the toast after clearing', async ({ page }) => {
        await addTask(page, 'A')
        await tick(page, 'A').check()
        await clearButton(page, 1).click()
        const toast = page.getByRole('status')
        await expect.poll(() => style(toast, 'opacity')).toBe('1')
        expect(await style(toast, 'background-color')).toBe(colours.ink)
        expect(await style(toast, 'color')).toBe(colours.paper)
        const toastBox = await box(toast)
        expect(Math.abs(toastBox.x + toastBox.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(
          1,
        )
        expect(Math.abs(viewport.height - 24 - (toastBox.y + toastBox.height))).toBeLessThanOrEqual(
          1,
        )
        const undo = page.getByRole('button', { name: 'Hoàn tác' })
        expect(await style(undo, 'font-weight')).toBe('700')
        expect(await style(undo, 'text-decoration-line')).toBe('underline')
        await expectNoHorizontalScroll(page)
      })

      test('all and done screens do not scroll sideways', async ({ page }) => {
        await addTask(page, 'w'.repeat(200))
        await addTask(page, 'B')
        await tick(page, 'B').check()
        await expectNoHorizontalScroll(page)
        await filter(page, 'Đã xong').click()
        await expectNoHorizontalScroll(page)
      })
    })
  }
}
