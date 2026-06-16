import React, { ReactNode, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  View,
  ScrollViewProps,
  LayoutChangeEvent,
} from 'react-native';

interface KeyboardAvoidingContainerProps extends ScrollViewProps {
  children: ReactNode;
  extraKeyboardOffset?: number;
  noDismissOnTap?: boolean;
  scrollEnabled?: boolean;
}

export function KeyboardAvoidingContainer({
  children,
  extraKeyboardOffset = 0,
  noDismissOnTap = false,
  scrollEnabled = true,
  ...scrollViewProps
}: KeyboardAvoidingContainerProps) {
  const scrollRef = useRef<ScrollView>(null);

  const handleContentTouch = () => {
    if (!noDismissOnTap) {
      Keyboard.dismiss();
    }
  };

  const handleInputFocus = (y: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
    }, 100);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    if (y > 200) {
      handleInputFocus(y);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? extraKeyboardOffset + 88 : extraKeyboardOffset + 25}
    >
      <TouchableWithoutFeedback onPress={handleContentTouch}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
          bounces={false}
          {...scrollViewProps}
        >
          <View onLayout={handleLayout}>{children}</View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
