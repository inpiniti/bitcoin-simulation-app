/**
 * AI 채팅 화면
 * 이슈 #9: Gemini 스트리밍 채팅 UI
 * 이슈 #10: 시장 컨텍스트 연동
 * 이슈 #11: 추천 질문 칩 UI
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { askGemini } from '../../lib/geminiApi';
import { useStore } from '../../store/useStore';

const SUGGESTED_QUESTIONS = [
  '현재 백엔드 서버 상태는?',
  '자동매매 설정 요약해줘',
  '최근 매매 결과는?',
  '딥러닝 모델 성능은?',
];

/**
 * 타이핑 인디케이터 컴포넌트 (점 3개 애니메이션)
 */
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );

    const anim = Animated.parallel([
      createDotAnimation(dot1, 0),
      createDotAnimation(dot2, 200),
      createDotAnimation(dot3, 400),
    ]);
    anim.start();

    return () => anim.stop();
  }, [dot1, dot2, dot3]);

  const dotStyle = (dot) => ({
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View testID="typing-indicator" style={styles.typingContainer}>
      <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
    </View>
  );
}

export default function AiScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef(null);

  const { serverStatus } = useStore();

  const buildContext = () => {
    const status = serverStatus ?? 'unknown';
    return `현재 백엔드 상태: ${status}`;
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const context = buildContext();
      const response = await askGemini(text, context);
      const aiMessage = { role: 'ai', text: response };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        role: 'ai',
        text: `오류가 발생했습니다: ${error.message}`,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipPress = (question) => {
    setInputText(question);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      {/* 추천 질문 칩 - 이슈 #11 */}
      <ScrollView
        testID="suggested-chips"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        {SUGGESTED_QUESTIONS.map((question) => (
          <TouchableOpacity
            key={question}
            style={styles.chip}
            onPress={() => handleChipPress(question)}
          >
            <Text style={styles.chipText}>{question}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 메시지 목록 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text testID="empty-hint" style={styles.emptyHint}>
              무엇이든 물어보세요
            </Text>
          </View>
        )}

        {messages.map((msg, index) => {
          // pairIndex: user-0/ai-0, user-1/ai-1 형태로 쌍 번호 부여
          const pairIndex = Math.floor(index / 2);

          return (
            <View
              key={index}
              testID={msg.role === 'user' ? `bubble-user-${pairIndex}` : `bubble-ai-${pairIndex}`}
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  msg.isError && styles.bubbleErrorText,
                ]}
              >
                {msg.text}
              </Text>
            </View>
          );
        })}

        {isLoading && <TypingIndicator />}
      </ScrollView>

      {/* 입력창 */}
      <View style={styles.inputRow}>
        <TextInput
          testID="message-input"
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor="#666"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          testID="send-button"
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  chipsScroll: {
    flexGrow: 0,
    backgroundColor: '#252525',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  chipsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  chipText: {
    color: '#cccccc',
    fontSize: 13,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyHint: {
    color: '#666',
    fontSize: 16,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  bubbleUser: {
    backgroundColor: '#007acc',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#2d2d2d',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleErrorText: {
    color: '#ff6b6b',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    alignSelf: 'flex-start',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cccccc',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#252525',
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#cccccc',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#444',
  },
  sendButton: {
    backgroundColor: '#007acc',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#444',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
