import { supabase } from '@/lib/supabase';

const BUCKET_NAME = 'postingtube-media';

/**
 * Downloads a temporary external avatar (e.g. from Meta Graph API, Instagram CDN, Google)
 * and uploads it to permanent, non-expiring Supabase Storage.
 *
 * Returns the permanent Supabase public URL.
 */
export async function mirrorAvatarToPermanentStorage(
  accountId: string,
  rawAvatarUrl: string
): Promise<string> {
  if (!rawAvatarUrl || !accountId) return rawAvatarUrl;

  // Already hosted on permanent Supabase Storage
  if (rawAvatarUrl.includes('supabase.co/storage')) {
    return rawAvatarUrl;
  }

  // Must have Supabase client
  if (!supabase) {
    return rawAvatarUrl;
  }

  try {
    const res = await fetch(rawAvatarUrl);
    if (!res.ok) {
      console.warn(`[AvatarStorage] Failed to download avatar from ${rawAvatarUrl}: status ${res.status}`);
      // If download failed because of 403, check if a permanent one already exists
      const fallbackFilename = `avatars/${accountId}.jpg`;
      const { data: pubData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fallbackFilename);
      return pubData?.publicUrl || rawAvatarUrl;
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 100) {
      console.warn('[AvatarStorage] Downloaded avatar buffer is suspiciously small, skipping storage');
      return rawAvatarUrl;
    }

    const filename = `avatars/${accountId}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadErr) {
      console.warn('[AvatarStorage] Failed to upload avatar to Supabase Storage:', uploadErr.message);
      return rawAvatarUrl;
    }

    const { data: pubData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
    const permanentUrl = pubData?.publicUrl;

    if (permanentUrl) {
      // Update database row with permanent URL
      try {
        await supabase
          .from('connected_accounts')
          .update({
            avatar_url: permanentUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId);
        console.log(`[AvatarStorage] Updated connected_accounts for ${accountId} with permanent avatar:`, permanentUrl);
      } catch (e) {
        console.warn('[AvatarStorage] Database avatar update warning:', e);
      }

      return permanentUrl;
    }

    return rawAvatarUrl;
  } catch (err) {
    console.warn('[AvatarStorage] Error mirroring avatar to permanent storage:', err);
    return rawAvatarUrl;
  }
}
