/**
 * Authentication Integration Tests
 * Tests for user registration, login, and organizer verification flows
 */

import { supabase } from '@/lib/supabase';
import { AuthService } from '@/services/auth';

// Test utilities
const generateTestEmail = () => `test-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

describe('Authentication Flow Tests', () => {
  // Cleanup helper
  const cleanupTestUser = async (userId: string) => {
    try {
      await supabase.from('users').delete().eq('id', userId);
      await supabase.auth.admin.deleteUser(userId);
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  };

  describe('User Registration (Phase 1E - Testing)', () => {
    test('User can register with email and password', async () => {
      const email = generateTestEmail();
      const displayName = 'Test User';
      const username = `testuser_${Date.now()}`;

      const result = await AuthService.signUp({
        email,
        password: testPassword,
        displayName,
        username,
      });

      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe(email);

      // Verify user profile was created
      const profile = await AuthService.getUserProfile(result.user!.id);
      expect(profile.display_name).toBe(displayName);
      expect(profile.username).toBe(username);
      expect(profile.points).toBe(0);
      expect(profile.check_ins_count).toBe(0);

      // Cleanup
      await cleanupTestUser(result.user!.id);
    });

    test('User registration fails with invalid email', async () => {
      try {
        await AuthService.signUp({
          email: 'invalid-email',
          password: testPassword,
          displayName: 'Test User',
          username: 'testuser',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('User registration fails with weak password', async () => {
      try {
        await AuthService.signUp({
          email: generateTestEmail(),
          password: 'short',
          displayName: 'Test User',
          username: 'testuser',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('User registration fails with duplicate username', async () => {
      const email1 = generateTestEmail();
      const username = `uniqueuser_${Date.now()}`;

      const result1 = await AuthService.signUp({
        email: email1,
        password: testPassword,
        displayName: 'Test User 1',
        username,
      });

      try {
        await AuthService.signUp({
          email: generateTestEmail(),
          password: testPassword,
          displayName: 'Test User 2',
          username, // Same username
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Cleanup
      await cleanupTestUser(result1.user!.id);
    });
  });

  describe('User Login (Phase 1E - Testing)', () => {
    test('User can login with email and password', async () => {
      const email = generateTestEmail();
      const username = `testuser_${Date.now()}`;

      // Register first
      const registerResult = await AuthService.signUp({
        email,
        password: testPassword,
        displayName: 'Test User',
        username,
      });

      // Logout
      await AuthService.logout();

      // Login
      const loginResult = await AuthService.login({
        email,
        password: testPassword,
      });

      expect(loginResult.user).toBeDefined();
      expect(loginResult.user?.email).toBe(email);
      expect(loginResult.session).toBeDefined();

      // Cleanup
      await AuthService.logout();
      await cleanupTestUser(registerResult.user!.id);
    });

    test('Login fails with incorrect password', async () => {
      const email = generateTestEmail();
      const username = `testuser_${Date.now()}`;

      const result = await AuthService.signUp({
        email,
        password: testPassword,
        displayName: 'Test User',
        username,
      });

      await AuthService.logout();

      try {
        await AuthService.login({
          email,
          password: 'WrongPassword123!',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Cleanup
      await cleanupTestUser(result.user!.id);
    });

    test('Login fails with non-existent email', async () => {
      try {
        await AuthService.login({
          email: 'nonexistent@example.com',
          password: testPassword,
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Organizer Registration (Phase 1E - Testing)', () => {
    test('Organizer can register with organization details', async () => {
      const email = generateTestEmail();
      const username = `orguser_${Date.now()}`;
      const organizationName = `Test Org ${Date.now()}`;

      const result = await AuthService.signUp({
        email,
        password: testPassword,
        displayName: 'Organizer User',
        username,
        isOrganizer: true,
        organizationName,
      });

      expect(result.user).toBeDefined();

      // Verify organizer profile was created
      const organizer = await AuthService.getOrganizerProfile(result.user!.id);
      expect(organizer).toBeDefined();
      expect(organizer?.organization_name).toBe(organizationName);
      expect(organizer?.is_verified).toBe(false);
      expect(organizer?.verified_at).toBeNull();

      // Cleanup
      await cleanupTestUser(result.user!.id);
    });

    test('Organizer profile is not visible when unverified', async () => {
      const email = generateTestEmail();
      const username = `orguser_${Date.now()}`;
      const organizationName = `Test Org ${Date.now()}`;

      const result = await AuthService.signUp({
        email,
        password: testPassword,
        displayName: 'Organizer User',
        username,
        isOrganizer: true,
        organizationName,
      });

      // Query for verified organizers only
      const { data: verifiedOrganizers } = await supabase
        .from('organizers')
        .select('*')
        .eq('is_verified', true);

      // Unverified organizer should not appear
      const isInList = verifiedOrganizers?.some((org) => org.id === result.user!.id);
      expect(isInList).toBeFalsy();

      // Cleanup
      await cleanupTestUser(result.user!.id);
    });

    test('User can check if they are an organizer', async () => {
      const email = generateTestEmail();
      const username = `orguser_${Date.now()}`;

      // Non-organizer user
      const normalUser = await AuthService.signUp({
        email,
        password: testPassword,
        displayName: 'Normal User',
        username,
        isOrganizer: false,
      });

      const normalOrganizerProfile = await AuthService.getOrganizerProfile(normalUser.user!.id);
      expect(normalOrganizerProfile).toBeNull();

      // Organizer user
      const orgEmail = generateTestEmail();
      const orgUsername = `orguser_${Date.now()}`;
      const organizer = await AuthService.signUp({
        email: orgEmail,
        password: testPassword,
        displayName: 'Organizer User',
        username: orgUsername,
        isOrganizer: true,
        organizationName: 'Test Organization',
      });

      const organizerProfile = await AuthService.getOrganizerProfile(organizer.user!.id);
      expect(organizerProfile).toBeDefined();
      expect(organizerProfile?.is_verified).toBe(false);

      // Cleanup
      await cleanupTestUser(normalUser.user!.id);
      await cleanupTestUser(organizer.user!.id);
    });
  });

  describe('Session Management (Phase 1E - Testing)', () => {
    test('User can get current user session', async () => {
      const email = generateTestEmail();
      const username = `testuser_${Date.now()}`;

      const result = await AuthService.signUp({
        email,
        password: testPassword,
        displayName: 'Test User',
        username,
      });

      const currentUser = await AuthService.getCurrentUser();
      expect(currentUser).toBeDefined();
      expect(currentUser?.email).toBe(email);

      // Cleanup
      await AuthService.logout();
      await cleanupTestUser(result.user!.id);
    });

    test('User can logout', async () => {
      const email = generateTestEmail();
      const username = `testuser_${Date.now()}`;

      const result = await AuthService.signUp({
        email,
        password: testPassword,
        displayName: 'Test User',
        username,
      });

      await AuthService.logout();

      const currentUser = await AuthService.getCurrentUser();
      expect(currentUser).toBeNull();

      // Cleanup
      await cleanupTestUser(result.user!.id);
    });
  });

  describe('Error Handling', () => {
    test('Auth errors are properly handled', async () => {
      try {
        await AuthService.signUp({
          email: 'invalid',
          password: 'short',
          displayName: '',
          username: '',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('Database errors are properly handled', async () => {
      const email = generateTestEmail();
      const username = `testuser_${Date.now()}`;

      const result1 = await AuthService.signUp({
        email,
        password: testPassword,
        displayName: 'Test User',
        username,
      });

      try {
        // Try to create duplicate user
        await supabase.from('users').insert({
          id: result1.user!.id,
          username,
          display_name: 'Duplicate',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Cleanup
      await cleanupTestUser(result1.user!.id);
    });
  });
});
