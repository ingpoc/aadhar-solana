import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{t('home.greeting')}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.identityStatus')}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Aadhaar:</Text>
          <Text style={styles.statusVerified}>Verified ✓</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>PAN:</Text>
          <Text style={styles.statusPending}>Pending</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.reputationScore')}</Text>
        <Text style={styles.scoreValue}>750</Text>
        <Text style={styles.scoreTier}>Gold Tier</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.quickActions')}</Text>
        <Text style={styles.actionItem}>• Share Credentials</Text>
        <Text style={styles.actionItem}>• Request Verification</Text>
        <Text style={styles.actionItem}>• View Activity</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#000000',
  },
  statusVerified: {
    fontSize: 16,
    color: '#138808',
    fontWeight: '600',
  },
  statusPending: {
    fontSize: 16,
    color: '#F57C00',
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
  },
  scoreTier: {
    fontSize: 18,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
  },
  actionItem: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 12,
  },
});
