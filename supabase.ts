
import { createClient } from '@supabase/supabase-js';
import { GameRecord } from './types';

// Provided by the user for this specific project
const SUPABASE_URL = 'https://fefpadgcylvnavljomdu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mb1algzbd4sx8q5Jbl4jzQ_SUzM__Iw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const fetchBestRecord = async (): Promise<GameRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .order('attempts', { ascending: true })
      .order('time_seconds', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No records found
      throw error;
    }
    return data;
  } catch (e) {
    console.warn('Error fetching best record:', e);
    return null;
  }
};

export const saveRecord = async (record: GameRecord): Promise<void> => {
  try {
    const { error } = await supabase.from('records').insert([record]);
    if (error) throw error;
  } catch (e) {
    console.error('Failed to save record to Supabase:', e);
  }
};
