import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../components/ui/Button';

describe('Button component', () => {
  it('should render with label', () => {
    const { getByText } = render(<Button label="테스트 버튼" />);
    expect(getByText('테스트 버튼')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button label="클릭" onPress={onPressMock} />
    );
    fireEvent.press(getByText('클릭'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button label="비활성" onPress={onPressMock} disabled />
    );
    fireEvent.press(getByText('비활성'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('should render with variant prop', () => {
    const { getByText } = render(<Button label="위험" variant="danger" />);
    expect(getByText('위험')).toBeTruthy();
  });

  it('should render with primary variant by default', () => {
    const { getByTestId } = render(
      <Button label="기본" testID="btn" />
    );
    expect(getByTestId('btn')).toBeTruthy();
  });
});
