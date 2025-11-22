import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function Spinner({ size = 'md', color = '#FF6B00' }: SpinnerProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizes = {
    sm: 20,
    md: 32,
    lg: 48,
  };

  return (
    <Animated.View
      style={[
        styles.spinner,
        {
          width: sizes[size],
          height: sizes[size],
          borderColor: color,
          transform: [{ rotate: spin }],
        },
      ]}
    />
  );
}

// Full screen loading
interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View style={styles.loadingScreen}>
      <Spinner size="lg" />
      <Text style={styles.loadingMessage}>{message}</Text>
    </View>
  );
}

// Inline loading with text
interface LoadingInlineProps {
  message?: string;
  style?: ViewStyle;
}

export function LoadingInline({ message = 'Loading...', style }: LoadingInlineProps) {
  return (
    <View style={[styles.loadingInline, style]}>
      <Spinner size="sm" />
      <Text style={styles.loadingInlineText}>{message}</Text>
    </View>
  );
}

// Skeleton loading
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Card Skeleton
export function CardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <Skeleton width={48} height={48} borderRadius={12} />
      <View style={styles.cardSkeletonContent}>
        <Skeleton width="60%" height={16} style={styles.skeletonMargin} />
        <Skeleton width="40%" height={14} />
      </View>
    </View>
  );
}

// List Skeleton
interface ListSkeletonProps {
  count?: number;
}

export function ListSkeleton({ count = 3 }: ListSkeletonProps) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </View>
  );
}

// Progress indicator
interface ProgressProps {
  progress: number; // 0-100
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export function Progress({
  progress,
  color = '#FF6B00',
  height = 8,
  showLabel = false,
}: ProgressProps) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress, width]);

  const animatedWidth = width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View>
      <View style={[styles.progressTrack, { height }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: color,
              width: animatedWidth,
            },
          ]}
        />
      </View>
      {showLabel && <Text style={styles.progressLabel}>{Math.round(progress)}%</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: {
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderRadius: 50,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingMessage: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingInlineText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  cardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardSkeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonMargin: {
    marginBottom: 8,
  },
  progressTrack: {
    backgroundColor: '#E5E7EB',
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 100,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },
});
