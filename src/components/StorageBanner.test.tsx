import { render, screen } from '@testing-library/react';
import { Banner } from './Banner';
import { StorageBanner } from './StorageBanner';

describe('Banner', () => {
  it('shows its message', () => {
    render(<Banner>رسالة</Banner>);
    expect(screen.getByRole('status')).toHaveTextContent('رسالة');
  });
});

describe('StorageBanner', () => {
  it('warns that data will not be saved when storage is not persistent', () => {
    render(<StorageBanner persistent={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('لن تُحفظ بياناتك');
  });

  it('renders nothing when storage is persistent', () => {
    const { container } = render(<StorageBanner persistent />);
    expect(container).toBeEmptyDOMElement();
  });
});
