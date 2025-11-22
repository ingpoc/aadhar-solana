import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  label,
  variant = 'default',
  size = 'md',
  icon,
  style,
  textStyle,
}: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], styles[`size_${size}`], style]}>
      {icon && <Text style={[styles.icon, styles[`iconSize_${size}`]]}>{icon}</Text>}
      <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
        {label}
      </Text>
    </View>
  );
}

// Status Badge for verification status
interface StatusBadgeProps {
  status: 'verified' | 'pending' | 'failed' | 'expired' | 'revoked';
  size?: BadgeSize;
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = {
    verified: { label: 'Verified', variant: 'success' as BadgeVariant, icon: '✓' },
    pending: { label: 'Pending', variant: 'warning' as BadgeVariant, icon: '⏳' },
    failed: { label: 'Failed', variant: 'error' as BadgeVariant, icon: '✕' },
    expired: { label: 'Expired', variant: 'warning' as BadgeVariant, icon: '⚠' },
    revoked: { label: 'Revoked', variant: 'error' as BadgeVariant, icon: '⊘' },
  };

  const { label, variant, icon } = config[status];

  return <Badge label={label} variant={variant} size={size} icon={icon} />;
}

// Tier Badge for reputation tiers
interface TierBadgeProps {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  size?: BadgeSize;
  showIcon?: boolean;
}

export function TierBadge({ tier, size = 'md', showIcon = true }: TierBadgeProps) {
  const config = {
    bronze: { label: 'Bronze', color: '#CD7F32', icon: '🥉' },
    silver: { label: 'Silver', color: '#C0C0C0', icon: '🥈' },
    gold: { label: 'Gold', color: '#FFD700', icon: '🥇' },
    platinum: { label: 'Platinum', color: '#E5E4E2', icon: '💎' },
    diamond: { label: 'Diamond', color: '#B9F2FF', icon: '💠' },
  };

  const { label, color, icon } = config[tier];

  return (
    <View style={[styles.tierBadge, styles[`size_${size}`], { backgroundColor: `${color}20` }]}>
      {showIcon && <Text style={[styles.tierIcon, styles[`iconSize_${size}`]]}>{icon}</Text>}
      <Text style={[styles.tierText, styles[`textSize_${size}`], { color }]}>{label}</Text>
    </View>
  );
}

// Notification Badge (dot or count)
interface NotificationBadgeProps {
  count?: number;
  showDot?: boolean;
  color?: string;
  children: React.ReactNode;
}

export function NotificationBadge({
  count,
  showDot = false,
  color = '#EF4444',
  children,
}: NotificationBadgeProps) {
  const hasNotification = (count && count > 0) || showDot;

  return (
    <View style={styles.notificationContainer}>
      {children}
      {hasNotification && (
        <View
          style={[
            styles.notificationBadge,
            showDot ? styles.notificationDot : styles.notificationCount,
            { backgroundColor: color },
          ]}
        >
          {!showDot && count && (
            <Text style={styles.notificationText}>{count > 99 ? '99+' : count}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// Verification Badge for showing verification status
interface VerificationBadgeProps {
  type: string;
  verified: boolean;
  icon: string;
  onPress?: () => void;
}

export function VerificationBadge({ type, verified, icon, onPress }: VerificationBadgeProps) {
  return (
    <View
      style={[
        styles.verificationBadge,
        verified ? styles.verificationVerified : styles.verificationPending,
      ]}
    >
      <Text style={styles.verificationIcon}>{icon}</Text>
      <View style={styles.verificationContent}>
        <Text style={styles.verificationType}>{type}</Text>
        <Text
          style={[
            styles.verificationStatus,
            verified ? styles.verificationStatusVerified : styles.verificationStatusPending,
          ]}
        >
          {verified ? 'Verified ✓' : 'Not verified'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  // Variants
  default: {
    backgroundColor: '#F3F4F6',
  },
  success: {
    backgroundColor: '#D1FAE5',
  },
  warning: {
    backgroundColor: '#FEF3C7',
  },
  error: {
    backgroundColor: '#FEE2E2',
  },
  info: {
    backgroundColor: '#DBEAFE',
  },
  primary: {
    backgroundColor: '#FFF7ED',
  },
  // Sizes
  size_sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  size_md: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
  },
  size_lg: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  // Text
  text: {
    fontWeight: '600',
  },
  text_default: {
    color: '#4B5563',
  },
  text_success: {
    color: '#059669',
  },
  text_warning: {
    color: '#D97706',
  },
  text_error: {
    color: '#DC2626',
  },
  text_info: {
    color: '#2563EB',
  },
  text_primary: {
    color: '#FF6B00',
  },
  textSize_sm: {
    fontSize: 10,
  },
  textSize_md: {
    fontSize: 12,
  },
  textSize_lg: {
    fontSize: 14,
  },
  // Icons
  icon: {},
  iconSize_sm: {
    fontSize: 10,
  },
  iconSize_md: {
    fontSize: 12,
  },
  iconSize_lg: {
    fontSize: 14,
  },
  // Tier Badge
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  tierIcon: {},
  tierText: {
    fontWeight: '700',
  },
  // Notification Badge
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  notificationCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
  },
  notificationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Verification Badge
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  verificationVerified: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  verificationPending: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
  },
  verificationIcon: {
    fontSize: 24,
  },
  verificationContent: {
    flex: 1,
  },
  verificationType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  verificationStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  verificationStatusVerified: {
    color: '#059669',
  },
  verificationStatusPending: {
    color: '#6B7280',
  },
});
