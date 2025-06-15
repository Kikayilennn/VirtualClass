import { supabase } from '../lib/supabase';
import { OnlineClass } from '../types';

export const onlineClassService = {
  async getOngoingClass() {
    const { data, error } = await supabase
      .from('online_classes')
      .select('*')
      .eq('status', 'ongoing')
      .single();
    if (error && error.code !== 'PGRST116') throw error; // ignore no rows error
    return data;
  },
  async getUpcomingClasses() {
    const { data, error } = await supabase
      .from('online_classes')
      .select('*')
      .eq('status', 'scheduled')
      .order('start_time', { ascending: true });
    if (error) throw error;
    return data;
  }
};
