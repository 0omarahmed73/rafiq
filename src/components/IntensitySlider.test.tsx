import { fireEvent, render, screen } from '@testing-library/react';
import { IntensitySlider } from './IntensitySlider';

describe('IntensitySlider', () => {
  it('shows the value in Arabic-Indic digits out of ten', () => {
    render(<IntensitySlider label="شدّة الشعور" value={6} onChange={() => {}} />);
    expect(screen.getByText('٦ / ١٠')).toBeInTheDocument();
  });

  it('is a 0 to 10 range input named by its label', () => {
    render(<IntensitySlider label="شدّة الشعور" value={6} onChange={() => {}} />);
    const input = screen.getByLabelText('شدّة الشعور');
    expect(input).toHaveAttribute('type', 'range');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '10');
  });

  it('reports a new whole-number value', () => {
    const onChange = vi.fn();
    render(<IntensitySlider label="شدّة الشعور" value={6} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('شدّة الشعور'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('is at least 44px tall', () => {
    render(<IntensitySlider label="x" value={0} onChange={() => {}} />);
    expect(screen.getByLabelText('x').className).toMatch(/min-h-11/);
  });
});
