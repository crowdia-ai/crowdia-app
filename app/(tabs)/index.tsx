import { TouchableOpacity, StyleSheet, View } from 'react-native';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const { user, userProfile, organizerProfile, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      alert('Logout failed');
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.headerTitle}>Crowdia</ThemedText>
        </View>
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">
          {user ? `Welcome, ${userProfile?.display_name || 'User'}!` : 'Welcome to Crowdia'}
        </ThemedText>
      </ThemedView>

      {user && (
        <ThemedView style={styles.userInfoContainer}>
          <ThemedText type="subtitle">Your Profile</ThemedText>
          <ThemedText>
            <ThemedText type="defaultSemiBold">Username:</ThemedText> {userProfile?.username}
          </ThemedText>
          <ThemedText>
            <ThemedText type="defaultSemiBold">Points:</ThemedText> {userProfile?.points || 0}
          </ThemedText>
          <ThemedText>
            <ThemedText type="defaultSemiBold">Check-ins:</ThemedText> {userProfile?.check_ins_count || 0}
          </ThemedText>

          {organizerProfile && (
            <ThemedView style={styles.organizerInfo}>
              <ThemedText type="subtitle">Organization</ThemedText>
              <ThemedText>
                <ThemedText type="defaultSemiBold">Name:</ThemedText> {organizerProfile.organization_name}
              </ThemedText>
              <ThemedText>
                <ThemedText type="defaultSemiBold">Status:</ThemedText>{' '}
                {organizerProfile.is_verified ? '✅ Verified' : '⏳ Pending Verification'}
              </ThemedText>
            </ThemedView>
          )}

          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <ThemedText style={styles.buttonText}>Logout</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}

      {!user && (
        <ThemedView style={styles.authContainer}>
          <ThemedText type="subtitle">Get Started</ThemedText>
          <ThemedText style={styles.description}>
            Join Crowdia to discover and attend amazing events in your community.
          </ThemedText>

          <TouchableOpacity style={styles.button} onPress={() => router.push('/auth/signup')}>
            <ThemedText style={styles.buttonText}>Sign Up</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/auth/login')}>
            <ThemedText style={styles.secondaryButtonText}>Already have an account? Login</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}

      <ThemedView style={styles.featureContainer}>
        <ThemedText type="subtitle">Current Features</ThemedText>
        <ThemedText>✅ User Authentication (Email/Password)</ThemedText>
        <ThemedText>✅ User Profiles with Points System</ThemedText>
        <ThemedText>✅ Organizer Registration & Verification</ThemedText>
        <ThemedText>✅ Session Management</ThemedText>
        <ThemedText>🔄 Event Feed (Coming Soon)</ThemedText>
        <ThemedText>🔄 Event Check-in System (Coming Soon)</ThemedText>
        <ThemedText>🔄 Admin Panel (Coming Soon)</ThemedText>
      </ThemedView>

      <ThemedView style={styles.statusContainer}>
        <ThemedText type="subtitle">App Status</ThemedText>
        <ThemedText>
          Phase 1 Development - Authentication & User Management Complete
        </ThemedText>
        <ThemedText style={styles.smallText}>
          Database: Connected | Auth: Active | Tests: Included
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  titleContainer: {
    marginBottom: 16,
  },
  userInfoContainer: {
    gap: 12,
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  organizerInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 122, 255, 0.3)',
    gap: 8,
  },
  authContainer: {
    gap: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  description: {
    marginBottom: 8,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  featureContainer: {
    gap: 8,
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  statusContainer: {
    gap: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  smallText: {
    fontSize: 12,
    opacity: 0.7,
  },
});
