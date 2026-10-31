import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ReminderTimePicker } from './ReminderTimePicker';

function Harness({ initial = '', spy }: { initial?: string; spy?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <ReminderTimePicker
      value={value}
      onChange={(v) => {
        setValue(v);
        spy?.(v);
      }}
    />
  );
}

describe('ReminderTimePicker', () => {
  it('shows a saved time as Arabic-Indic digits in labelled hour and minute selects', () => {
    render(<Harness initial="20:30" />);
    const group = screen.getByRole('group', { name: 'وقت التذكير اليومي' });
    const hour = within(group).getByLabelText('الساعة') as HTMLSelectElement;
    const minute = within(group).getByLabelText('الدقيقة') as HTMLSelectElement;
    expect(hour.value).toBe('20');
    expect(minute.value).toBe('30');
    expect(hour.selectedOptions[0].textContent).toBe('٢٠');
    expect(minute.selectedOptions[0].textContent).toBe('٣٠');
  });

  it('offers all 24 hours and all 60 minutes, so any minute can be chosen', () => {
    render(<Harness initial="08:00" />);
    const real = (el: HTMLElement) => Array.from((el as HTMLSelectElement).options).filter((o) => o.value !== '');
    expect(real(screen.getByLabelText('الساعة'))).toHaveLength(24);
    expect(real(screen.getByLabelText('الدقيقة'))).toHaveLength(60);
  });

  it('emits ASCII HH:MM when either part changes', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="20:30" spy={spy} />);
    await user.selectOptions(screen.getByLabelText('الساعة'), '07');
    expect(spy).toHaveBeenLastCalledWith('07:30');
    await user.selectOptions(screen.getByLabelText('الدقيقة'), '05');
    expect(spy).toHaveBeenLastCalledWith('07:05');
  });

  it('starts empty with a dash, and choosing one part fills the other with a sensible default', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(<Harness spy={spy} />);
    expect((screen.getByLabelText('الساعة') as HTMLSelectElement).value).toBe('');
    await user.selectOptions(screen.getByLabelText('الساعة'), '09');
    expect(spy).toHaveBeenLastCalledWith('09:00');
    unmount();

    render(<Harness spy={spy} />);
    await user.selectOptions(screen.getByLabelText('الدقيقة'), '45');
    expect(spy).toHaveBeenLastCalledWith('08:45');
  });

  it('keeps hour before minute (left to right) inside the right-to-left page, with 48px controls', () => {
    render(<Harness initial="20:30" />);
    const group = screen.getByRole('group', { name: 'وقت التذكير اليومي' });
    const row = group.querySelector('[dir="ltr"]')!;
    const selects = Array.from(row.querySelectorAll('select'));
    expect(selects.map((s) => s.getAttribute('aria-label') ?? s.id)).toHaveLength(2);
    expect(selects[0]).toBe(screen.getByLabelText('الساعة'));
    expect(selects[1]).toBe(screen.getByLabelText('الدقيقة'));
    for (const s of selects) expect(s.className).toContain('min-h-12');
  });
});
