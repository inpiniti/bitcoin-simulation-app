import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

/**
 * 공통 카드 컴포넌트
 */
export function Card({ children, title, testID, style }) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginVertical: 6,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
});

export default Card;
