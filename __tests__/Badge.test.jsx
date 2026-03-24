import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '../components/ui/Badge';

describe('Badge component', () => {
  it('should render with label', () => {
    const { getByText } = render(<Badge label="BUY" />);
    expect(getByText('BUY')).toBeTruthy();
  });

  it('should render buy variant', () => {
    const { getByText } = render(<Badge label="매수" variant="buy" />);
    expect(getByText('매수')).toBeTruthy();
  });

  it('should render sell variant', () => {
    const { getByText } = render(<Badge label="매도" variant="sell" />);
    expect(getByText('매도')).toBeTruthy();
  });

  it('should render default variant', () => {
    const { getByText } = render(<Badge label="기본" variant="default" />);
    expect(getByText('기본')).toBeTruthy();
  });

  it('should render with testID', () => {
    const { getByTestId } = render(<Badge label="TEST" testID="test-badge" />);
    expect(getByTestId('test-badge')).toBeTruthy();
  });
});
