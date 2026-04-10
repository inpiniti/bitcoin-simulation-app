import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { useEffect, useRef } from 'react';

export function BottomSheet({ open, onClose, title, children, cta }) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: open ? 0 : 300,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [open]);

  if (!open) return null;

  return (
    <Modal
      transparent
      visible={open}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.dimmer}
        onPress={onClose}
        activeOpacity={1}
      />
      <Animated.View
        style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.handle} />
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.content}>{children}</View>
        {cta && <View style={styles.cta}>{cta}</View>}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dimmer: {
    flex: 1,
    backgroundColor: 'rgba(25,31,40,0.18)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tdsDark.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: tdsDark.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  content: {
    paddingHorizontal: 20,
  },
  cta: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});

export default BottomSheet;
