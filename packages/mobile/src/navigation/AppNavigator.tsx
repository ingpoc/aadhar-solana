import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import PhoneVerificationScreen from '../screens/auth/PhoneVerificationScreen';
import AadhaarVerificationScreen from '../screens/auth/AadhaarVerificationScreen';
import BiometricSetupScreen from '../screens/auth/BiometricSetupScreen';

import HomeScreen from '../screens/main/HomeScreen';
import CredentialsScreen from '../screens/main/CredentialsScreen';
import ReputationScreen from '../screens/main/ReputationScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

import MainTabNavigator from './MainTabNavigator';

export type RootStackParamList = {
  Welcome: undefined;
  PhoneVerification: undefined;
  AadhaarVerification: undefined;
  BiometricSetup: undefined;
  MainTabs: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
          <Stack.Screen name="AadhaarVerification" component={AadhaarVerificationScreen} />
          <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
        </>
      ) : (
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}
