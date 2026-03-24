import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '../components/ui/Card';

describe('Card component', () => {
  it('should render children', () => {
    const { getByText } = render(
      <Card>
        <Text>카드 내용</Text>
      </Card>
    );
    expect(getByText('카드 내용')).toBeTruthy();
  });

  it('should render with title', () => {
    const { getByText } = render(
      <Card title="카드 제목">
        <Text>내용</Text>
      </Card>
    );
    expect(getByText('카드 제목')).toBeTruthy();
  });

  it('should render with testID', () => {
    const { getByTestId } = render(
      <Card testID="test-card">
        <Text>내용</Text>
      </Card>
    );
    expect(getByTestId('test-card')).toBeTruthy();
  });
});
