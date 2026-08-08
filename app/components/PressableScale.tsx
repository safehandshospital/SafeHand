import { type ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { hapticLight } from "@/lib/haptics";
import { pressScale as defaultScale, spring } from "@/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  scale?: number;
  accessibilityLabel?: string;
  hitSlop?:
    | number
    | { top?: number; bottom?: number; left?: number; right?: number };
};

export function PressableScale({
  children,
  onPress,
  onLongPress,
  delayLongPress,
  disabled,
  style,
  haptic = true,
  scale: pressedScale = defaultScale,
  accessibilityLabel,
  hitSlop,
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        scale.value = withSpring(pressedScale, spring.press);
        if (haptic) void hapticLight();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, spring.settle);
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
