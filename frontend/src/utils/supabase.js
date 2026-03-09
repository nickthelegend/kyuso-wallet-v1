import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zapclpctbdbajxdqqcbp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcGNscGN0YmRiYWp4ZHFxY2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTQ0NjIsImV4cCI6MjA4ODYzMDQ2Mn0.PghwEddRVXoaHPxvnEsoL3USRoI1bB-mKuv2ULxoMoM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
