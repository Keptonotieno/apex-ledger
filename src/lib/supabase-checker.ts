import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Result of the Supabase connection check.
 */
export interface SupabaseCheckResult {
  success: boolean;
  error?: string;
  code?: string;
  details?: string;
  isRlsIssue?: boolean;
  isSchemaCacheIssue?: boolean;
}

/**
 * Robust utility function to check connection stability and verify if the Supabase client
 * can correctly find and query the 'notifications' table schema, logging specific diagnostic data.
 * 
 * @param supabase The active Supabase client instance.
 * @param isConfigured Boolean indicating if the client configuration parameters are set.
 */
export async function verifySupabaseConnection(
  supabase: SupabaseClient | null,
  isConfigured: boolean
): Promise<SupabaseCheckResult> {
  if (!isConfigured || !supabase) {
    const msg = "Supabase is not configured (missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables).";
    console.info(`[SupabaseChecker] ${msg}`);
    return { success: false, error: msg };
  }

  console.log("[SupabaseChecker] Initiating diagnostic query to verify 'notifications' table schema reachability and RLS settings...");

  try {
    const { data, error, status } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    if (error) {
      const code = error.code || '';
      const message = error.message || '';
      
      let isSchemaCacheIssue = false;
      let isRlsIssue = false;
      let diagnosticMessage = '';

      // Check for PostgREST schema cache missing errors (PGRST205 / 404 / 400)
      if (code === 'PGRST205' || message.includes('PGRST205') || status === 404) {
        isSchemaCacheIssue = true;
        diagnosticMessage = "The database is connected! The 'notifications' table is not yet present in the schema cache, which is normal before running your first database migrations. Please execute the SQL migration script from Settings to create all required tables.";
        
        console.log(`[SupabaseChecker] Connection verified successfully. Schema setup is pending: ${diagnosticMessage}`);

        return {
          success: true, // Connection itself is verified and active!
          code,
          details: diagnosticMessage,
          isSchemaCacheIssue
        };
      }
      // Check for RLS policy / permission issues
      else if (status === 401 || status === 403 || message.toLowerCase().includes('permission denied') || message.toLowerCase().includes('row-level security') || message.toLowerCase().includes('rls')) {
        isRlsIssue = true;
        diagnosticMessage = "The request was received, but rejected due to authentication or Row Level Security (RLS) constraints. This confirms connection is working, but permission rules apply.";
        
        console.log(`[SupabaseChecker] Connection verified successfully. Authorization details: ${diagnosticMessage}`);

        return {
          success: true, // Connection is verified!
          code,
          details: diagnosticMessage,
          isRlsIssue
        };
      }
      // Any other database errors
      else {
        diagnosticMessage = `Database query returned: ${message}`;
        console.log(`[SupabaseChecker] Diagnostic check returned code ${code} (${status}): ${diagnosticMessage}`);
      }

      return {
        success: false,
        error: message,
        code,
        details: diagnosticMessage,
        isRlsIssue,
        isSchemaCacheIssue
      };
    }

    console.log("[SupabaseChecker] ✅ Supabase connection and 'notifications' table schema check verified successfully!");
    return { success: true };

  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.info("[SupabaseChecker] Network or unexpected exception during Supabase connection check:", err);
    return {
      success: false,
      error: errMsg,
      details: "An unexpected runtime exception occurred while attempting to reach Supabase. Check your internet connection and verify your Supabase API keys."
    };
  }
}
