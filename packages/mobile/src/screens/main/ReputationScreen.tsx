import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function ReputationScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>{t('reputation.yourScore')}</Text>
        <Text style={styles.scoreValue}>750</Text>
        <Text style={styles.tierBadge}>Gold Tier</Text>
        <Text style={styles.percentile}>Top 25% of users</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('reputation.breakdown')}</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Base Score:</Text>
          <Text style={styles.breakdownValue}>500</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Verification Bonus:</Text>
          <Text style={styles.breakdownValue}>200</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Activity Score:</Text>
          <Text style={styles.breakdownValue}>100</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Penalties:</Text>
          <Text style={styles.breakdownValue}>-50</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('reputation.recentActivity')}</Text>
        <Text style={styles.activityItem}>+ Aadhaar Verification Completed (+100)</Text>
        <Text style={styles.activityItem}>+ Credential Shared (+20)</Text>
        <Text style={styles.activityItem}>+ PAN Verification (+80)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scoreCard: {
    backgroundColor: '#FF6B35',
    padding: 32,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tierBadge: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 8,
  },
  percentile: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000000',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#000000',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  activityItem: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 12,
  },
});
