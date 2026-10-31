import { render, screen } from '@testing-library/react';
import { ProgressSegments } from './ProgressSegments';

describe('ProgressSegments', () => {
  it('draws one segment per step and fills the completed ones', () => {
    const { container } = render(<ProgressSegments total={5} current={3} />);
    const segments = container.querySelectorAll('[data-filled]');
    expect(segments).toHaveLength(5);
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(3);
  });

  it('exposes progress to assistive technology', () => {
    render(<ProgressSegments total={7} current={2} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemax', '7');
  });
});
