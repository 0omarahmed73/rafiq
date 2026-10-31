import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Prompt } from '../../../content/schema';
import { ChipsPrompt } from './ChipsPrompt';
import { EmotionPrompt } from './EmotionPrompt';
import { ListPrompt } from './ListPrompt';

function Harness({
  prompt,
  Component,
  initial,
  onValue,
}: {
  prompt: Prompt;
  Component: (p: { prompt: Prompt; value: unknown; onChange: (v: unknown) => void }) => JSX.Element;
  initial?: unknown;
  onValue?: (v: unknown) => void;
}) {
  const [value, setValue] = useState<unknown>(initial);
  return (
    <Component
      prompt={prompt}
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

describe('ListPrompt', () => {
  const prompt: Prompt = { id: 'l', kind: 'list', label: 'الأسباب' };

  it('adds an item and removes it', async () => {
    const user = userEvent.setup();
    render(<Harness prompt={prompt} Component={ListPrompt} />);
    await user.type(screen.getByRole('textbox', { name: 'إضافة' }), 'سبب أول');
    await user.click(screen.getByRole('button', { name: 'إضافة' }));
    expect(screen.getByText('سبب أول')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'حذف: سبب أول' }));
    expect(screen.queryByText('سبب أول')).not.toBeInTheDocument();
  });

  it('ignores blank input', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness prompt={prompt} Component={ListPrompt} onValue={onValue} />);
    await user.type(screen.getByRole('textbox', { name: 'إضافة' }), '   ');
    await user.click(screen.getByRole('button', { name: 'إضافة' }));
    expect(onValue).not.toHaveBeenCalled();
  });
});

describe('ChipsPrompt', () => {
  const prompt: Prompt = {
    id: 'c',
    kind: 'chips',
    label: 'ما يؤلمني',
    multi: false,
    options: [
      { value: 'ignored', label: 'أن أُهمَل' },
      { value: 'rejected', label: 'أن أُرفَض' },
    ],
    template: 'طبعًا يؤلمني هذا، لأنني أخاف {label}.',
  };

  it('fills the editable sentence from the chosen chip', async () => {
    const user = userEvent.setup();
    render(<Harness prompt={prompt} Component={ChipsPrompt} />);
    await user.click(screen.getByRole('button', { name: 'أن أُهمَل' }));
    expect(screen.getByRole('textbox')).toHaveValue('طبعًا يؤلمني هذا، لأنني أخاف أن أُهمَل.');
  });

  it('replaces the choice in single-select mode', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness prompt={prompt} Component={ChipsPrompt} onValue={onValue} />);
    await user.click(screen.getByRole('button', { name: 'أن أُهمَل' }));
    await user.click(screen.getByRole('button', { name: 'أن أُرفَض' }));
    expect(onValue).toHaveBeenLastCalledWith(
      expect.objectContaining({ values: ['rejected'] }),
    );
  });

  it('keeps the sentence the user edited when the same chip set is unchanged', async () => {
    const user = userEvent.setup();
    render(<Harness prompt={prompt} Component={ChipsPrompt} />);
    await user.click(screen.getByRole('button', { name: 'أن أُهمَل' }));
    const box = screen.getByRole('textbox');
    await user.clear(box);
    await user.type(box, 'جملتي');
    expect(box).toHaveValue('جملتي');
  });
});

describe('EmotionPrompt', () => {
  const prompt: Prompt = { id: 'e', kind: 'emotion', label: 'ما الذي تشعر به؟' };

  it('shows an intensity slider (default 5) for the chosen emotion', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness prompt={prompt} Component={EmotionPrompt} onValue={onValue} />);
    await user.click(screen.getByRole('button', { name: 'حزن' }));
    expect(onValue).toHaveBeenLastCalledWith([{ id: 'sadness', intensity: 5 }]);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('allows only one emotion unless multi is set', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness prompt={prompt} Component={EmotionPrompt} onValue={onValue} />);
    await user.click(screen.getByRole('button', { name: 'حزن' }));
    await user.click(screen.getByRole('button', { name: 'غضب' }));
    expect(onValue).toHaveBeenLastCalledWith([{ id: 'anger', intensity: 5 }]);
  });

  it('allows several emotions when multi is set', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness prompt={{ ...prompt, multi: true }} Component={EmotionPrompt} onValue={onValue} />);
    await user.click(screen.getByRole('button', { name: 'حزن' }));
    await user.click(screen.getByRole('button', { name: 'غضب' }));
    expect(onValue).toHaveBeenLastCalledWith([
      { id: 'sadness', intensity: 5 },
      { id: 'anger', intensity: 5 },
    ]);
  });
});
