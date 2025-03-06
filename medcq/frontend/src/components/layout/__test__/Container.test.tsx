// src/components/layout/__tests__/Container.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import Container from '../Container/Container';

describe('Container Component', () => {
  test('renders children content', () => {
    render(
      <Container>
        <div data-testid="test-content">Test Content</div>
      </Container>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  test('applies default max width class', () => {
    const { container } = render(<Container>Content</Container>);
    
    expect(container.firstChild).toHaveClass('max-w-7xl');
  });

  test('applies custom max width class', () => {
    const { container } = render(
      <Container maxWidth="max-w-screen-lg">Content</Container>
    );
    
    expect(container.firstChild).toHaveClass('max-w-screen-lg');
  });

  test('applies centered class by default', () => {
    const { container } = render(<Container>Content</Container>);
    
    expect(container.firstChild).toHaveClass('mx-auto');
  });

  test('does not apply centered class when centered is false', () => {
    const { container } = render(
      <Container centered={false}>Content</Container>
    );
    
    expect(container.firstChild).not.toHaveClass('mx-auto');
  });

  test('applies custom padding', () => {
    const { container } = render(
      <Container padding="px-2 py-2">Content</Container>
    );
    
    expect(container.firstChild).toHaveClass('px-2 py-2');
  });

  test('forwards ref to the div element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Container ref={ref}>Content</Container>);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});