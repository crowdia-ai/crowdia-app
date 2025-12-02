import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { styles } from '@/styles/auth.styles';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, isSigningUp, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [organizationName, setOrganizationName] = useState('');

  const handleSignup = async () => {
    if (!email || !password || !displayName || !username) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isOrganizer && !organizationName) {
      Alert.alert('Error', 'Please enter your organization name');
      return;
    }

    try {
      await signUp(email, password, displayName, username, isOrganizer, organizationName);
      Alert.alert('Success', 'Please check your email to verify your account');
      if (isOrganizer) {
        router.replace('/onboarding/organizer');
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      Alert.alert('Signup Failed', error || 'An error occurred');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          editable={!isSigningUp}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          editable={!isSigningUp}
        />

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          editable={!isSigningUp}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          editable={!isSigningUp}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.toggleButton, isOrganizer && styles.toggleButtonActive]}
          onPress={() => setIsOrganizer(!isOrganizer)}
          disabled={isSigningUp}
        >
          <Text style={[styles.toggleText, isOrganizer && styles.toggleTextActive]}>
            {isOrganizer ? '✓ ' : ''}Sign up as Organizer
          </Text>
        </TouchableOpacity>

        {isOrganizer && (
          <TextInput
            style={styles.input}
            placeholder="Organization Name"
            value={organizationName}
            onChangeText={setOrganizationName}
            editable={!isSigningUp}
          />
        )}

        <TouchableOpacity
          style={[styles.button, isSigningUp && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isSigningUp}
        >
          {isSigningUp ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/auth/login')}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
