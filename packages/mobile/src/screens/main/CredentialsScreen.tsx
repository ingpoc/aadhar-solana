import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';

const mockCredentials = [
  { id: '1', type: 'Aadhaar', status: 'verified', issuedAt: '2024-01-15' },
  { id: '2', type: 'PAN', status: 'verified', issuedAt: '2024-02-20' },
  { id: '3', type: 'Education', status: 'pending', issuedAt: '2024-03-10' },
];

export default function CredentialsScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <FlatList
        data={mockCredentials}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.credentialType}>{item.type}</Text>
            <Text style={styles.status}>
              Status: <Text style={item.status === 'verified' ? styles.verified : styles.pending}>
                {item.status}
              </Text>
            </Text>
            <Text style={styles.issuedAt}>Issued: {item.issuedAt}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  credentialType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 4,
  },
  verified: {
    color: '#138808',
    fontWeight: '600',
  },
  pending: {
    color: '#F57C00',
    fontWeight: '600',
  },
  issuedAt: {
    fontSize: 14,
    color: '#757575',
  },
});
