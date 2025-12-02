import { supabase } from '@/lib/supabase';
import { AuthError } from '@supabase/supabase-js';

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  username: string;
  isOrganizer?: boolean;
  organizationName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  static async signUp(input: SignUpInput) {
    const { email, password, displayName, username, isOrganizer, organizationName } = input;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create user profile
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      username,
      display_name: displayName,
      points: 0,
      check_ins_count: 0,
    });

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // If organizer, create organizer profile
    if (isOrganizer && organizationName) {
      const { error: organizerError } = await supabase.from('organizers').insert({
        id: authData.user.id,
        organization_name: organizationName,
        is_verified: false,
      });

      if (organizerError) {
        // Clean up if organizer profile creation fails
        await supabase.from('users').delete().eq('id', authData.user.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw organizerError;
      }
    }

    return authData;
  }

  static async login(input: LoginInput) {
    const { email, password } = input;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  static async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    return user;
  }

  static async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getOrganizerProfile(userId: string) {
    const { data, error } = await supabase
      .from('organizers')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      throw error;
    }
    return data || null;
  }

  static async updateProfile(userId: string, updates: { display_name?: string; bio?: string; profile_image_url?: string }) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single();

    if (error) throw error;
    return data;
  }

  static async verifyOrganizerEmail(token: string, type: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as 'signup' | 'recovery' | 'invite' | 'magiclink',
    });

    if (error) throw error;
    return data;
  }
}
