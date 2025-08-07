import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://udkndilucyxgtinodpai.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVka25kaWx1Y3l4Z3Rpbm9kcGFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU1NTIxOSwiZXhwIjoyMDcwMTMxMjE5fQ.pBh2elJzjSB0p4yuhqaraEb-JC_avX8wINNpyspBBWE';

if (!supabaseKey) {
  console.warn("Supabase service key is not set. Make sure to set SUPABASE_SERVICE_KEY environment variable.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
