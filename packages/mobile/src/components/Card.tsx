import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
  onPress?: () => void;
}

export function Card({
  children,
  style,
  padding = 'md',
  shadow = true,
  onPress,
}: CardProps) {
  const cardStyles = [
    styles.card,
    styles[`padding_${padding}`],
    shadow && styles.shadow,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyles} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

// Stat Card for displaying metrics
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: string;
  onPress?: () => void;
}

export function StatCard({ label, value, icon, trend, color = '#FF6B00', onPress }: StatCardProps) {
  return (
    <Card style={styles.statCard} onPress={onPress}>
      <View style={styles.statHeader}>
        {icon && <Text style={styles.statIcon}>{icon}</Text>}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {trend && (
        <View style={styles.trendContainer}>
          <Text
            style={[
              styles.trendText,
              trend.direction === 'up' && styles.trendUp,
              trend.direction === 'down' && styles.trendDown,
            ]}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}{' '}
            {Math.abs(trend.value)}%
          </Text>
        </View>
      )}
    </Card>
  );
}

// Info Card with header
interface InfoCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  style?: ViewStyle;
}

export function InfoCard({ title, subtitle, children, headerRight, style }: InfoCardProps) {
  return (
    <Card style={style}>
      <View style={styles.infoHeader}>
        <View style={styles.infoTitleContainer}>
          <Text style={styles.infoTitle}>{title}</Text>
          {subtitle && <Text style={styles.infoSubtitle}>{subtitle}</Text>}
        </View>
        {headerRight}
      </View>
      {children}
    </Card>
  );
}

// Action Card with icon and arrow
interface ActionCardProps {
  icon: string;
  title: string;
  description?: string;
  onPress: () => void;
  badge?: string;
  disabled?: boolean;
}

export function ActionCard({
  icon,
  title,
  description,
  onPress,
  badge,
  disabled = false,
}: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, disabled && styles.actionCardDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.actionIcon}>
        <Text style={styles.actionIconText}>{icon}</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        {description && <Text style={styles.actionDescription}>{description}</Text>}
      </View>
      <View style={styles.actionRight}>
        {badge && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{badge}</Text>
          </View>
        )}
        <Text style={styles.actionArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: 12,
  },
  padding_md: {
    padding: 16,
  },
  padding_lg: {
    padding: 24,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  // Stat Card
  statCard: {
    minWidth: 140,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  trendContainer: {
    marginTop: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  trendUp: {
    color: '#10B981',
  },
  trendDown: {
    color: '#EF4444',
  },
  // Info Card
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoTitleContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  // Action Card
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconText: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  actionArrow: {
    fontSize: 24,
    color: '#9CA3AF',
    fontWeight: '300',
  },
});
