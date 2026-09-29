import type { CareTask } from '@/types';
import { nextCareByPlant, plantCareLabel, tasksForToday } from './careSchedule';

const TODAY = '2026-09-28';

function task(overrides: Partial<CareTask>): CareTask {
  return {
    id: 'task',
    title: 'Regar',
    plantId: 'plant',
    plantName: 'Jiboia',
    plantPhotoUrl: null,
    category: 'watering',
    notes: null,
    dueDate: TODAY,
    recurrenceDays: null,
    reminderHour: 9,
    reminderMinute: 0,
    done: false,
    lastCompletedOccurrence: null,
    ...overrides,
  };
}

describe('nextCareByPlant', () => {
  it('keeps the most urgent pending care for each plant', () => {
    const statuses = nextCareByPlant(
      [
        task({ id: 'a', dueDate: '2026-10-01', category: 'fertilizing' }),
        task({ id: 'b', dueDate: '2026-09-26', category: 'watering' }),
        task({ id: 'c', plantId: 'other', dueDate: '2026-09-29' }),
      ],
      TODAY
    );

    expect(statuses.get('plant')).toEqual({ category: 'watering', daysUntil: -2 });
    expect(statuses.get('other')).toEqual({ category: 'watering', daysUntil: 1 });
  });

  it('moves a completed recurring care to its next occurrence and drops completed one-off care', () => {
    const statuses = nextCareByPlant(
      [
        task({ id: 'weekly', dueDate: TODAY, recurrenceDays: 7, done: true }),
        task({ id: 'once', plantId: 'other', done: true }),
      ],
      TODAY
    );

    expect(statuses.get('plant')?.daysUntil).toBe(7);
    expect(statuses.has('other')).toBe(false);
  });

  it('ignores tasks without a plant', () => {
    expect(nextCareByPlant([task({ plantId: null })], TODAY).size).toBe(0);
  });
});

describe('tasksForToday', () => {
  it('lists overdue and today care with pending items first', () => {
    const result = tasksForToday(
      [
        task({ id: 'late', dueDate: '2026-09-25' }),
        task({ id: 'doneToday', done: true }),
        task({ id: 'today' }),
        task({ id: 'later', dueDate: '2026-09-30' }),
        task({ id: 'doneLastWeek', dueDate: '2026-09-21', done: true, recurrenceDays: 7 }),
      ],
      TODAY,
      new Set()
    );

    expect(result.map((item) => item.id)).toEqual(['late', 'today', 'doneToday']);
  });

  it('keeps an overdue care visible after it is completed on this screen', () => {
    const result = tasksForToday([task({ id: 'late', dueDate: '2026-09-25', done: true })], TODAY, new Set(['late']));

    expect(result.map((item) => item.id)).toEqual(['late']);
  });
});

describe('plantCareLabel', () => {
  const t = (key: string, options?: Record<string, unknown>) => (options ? `${key}:${options.days}` : key);

  it('describes when the next care is due', () => {
    expect(plantCareLabel(null, t)).toBe('plantCareNone');
    expect(plantCareLabel({ category: 'watering', daysUntil: -3 }, t)).toBe('taskOverdueDays:3');
    expect(plantCareLabel({ category: 'watering', daysUntil: -1 }, t)).toBe('taskOverdueOneDay');
    expect(plantCareLabel({ category: 'watering', daysUntil: 0 }, t)).toBe('plantCareToday');
    expect(plantCareLabel({ category: 'watering', daysUntil: 1 }, t)).toBe('plantCareTomorrow');
    expect(plantCareLabel({ category: 'watering', daysUntil: 4 }, t)).toBe('plantCareInDays:4');
  });
});
