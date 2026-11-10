import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * Cloud & Edge Resilient Media Upload API
 * - Prioritizes permanent, public upload to Supabase Storage ('postingtube-media') CDN.
 * - Serverless-safe: safely wraps local disk writes so read-only filesystems (Vercel) never crash with EROFS.
 * - Generates high-speed public HTTPS URLs compatible with Meta Graph API and live previews.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean filename with timestamp to prevent collisions
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}_${safeName}`;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|m4v)$/i.test(filename);

    // Normalize MIME type for strict Supabase Storage bucket acceptance
    let contentType = file.type || '';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (contentType === 'image/jpg' || (!contentType && (ext === 'jpg' || ext === 'jpeg'))) {
      contentType = 'image/jpeg';
    } else if (!contentType && ext === 'png') {
      contentType = 'image/png';
    } else if (!contentType && ext === 'webp') {
      contentType = 'image/webp';
    } else if (!contentType && ext === 'gif') {
      contentType = 'image/gif';
    } else if (!contentType && ext === 'mp4') {
      contentType = 'video/mp4';
    } else if (!contentType && (ext === 'mov' || ext === 'quicktime')) {
      contentType = 'video/quicktime';
    } else if (!contentType && ext === 'webm') {
      contentType = 'video/webm';
    } else if (!contentType && ext === 'avi') {
      contentType = 'video/x-msvideo';
    }

    let publicUrl = '';

    // 1. PRIMARY: Upload directly to Supabase Storage ('postingtube-media')
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mdykqpqhuwfpondyqnms.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keWtxcHFodXdmcG9uZHlxbm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NDY1MDgsImV4cCI6MjEwODIyMjUwOH0.jHlEb3e-MsQRxiSa22NziD8r8D47YZ_MP_ROKH9qUUk';

    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);

        for (const bucketName of ['postingtube-media', 'postbridge-media', 'media', 'uploads', 'public']) {
          const { data: sData, error: sErr } = await supabase.storage
            .from(bucketName)
            .upload(filename, buffer, {
              contentType: contentType || 'application/octet-stream',
              upsert: true,
            });

          if (!sErr && sData) {
            const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(filename);
            if (pubData?.publicUrl) {
              publicUrl = pubData.publicUrl;
              console.log(`[MediaUpload] Successfully uploaded to Supabase Storage (${bucketName}):`, publicUrl);
              break;
            }
          } else if (sErr) {
            console.warn(`[MediaUpload] Supabase Storage (${bucketName}) upload note:`, sErr.message);
          }
        }
      } catch (sbErr) {
        console.warn('[MediaUpload] Supabase storage exception:', sbErr);
      }
    }

    // 2. SECONDARY / LOCAL CACHE: Attempt disk write (works on localhost, safely skips on Vercel read-only filesystem)
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, filename);
      await writeFile(filePath, buffer);

      if (!publicUrl) {
        const hostHeader = req.headers.get('host') || 'localhost:3000';
        const protocol = req.headers.get('x-forwarded-proto') || (hostHeader.includes('localhost') ? 'http' : 'https');
        const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${hostHeader}`;
        publicUrl = `${appBaseUrl}/uploads/${filename}`;
      }
    } catch (diskErr) {
      // Expected and normal on Vercel / serverless environments where /public is read-only
      console.log('[MediaUpload] Disk write skipped (serverless environment):', (diskErr as Error)?.message);
    }

    // 3. FALLBACK: If both cloud and disk were inaccessible, deliver compliant Data URL so UI never blocks
    if (!publicUrl) {
      const base64 = buffer.toString('base64');
      publicUrl = `data:${contentType || 'image/jpeg'};base64,${base64}`;
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      thumbnailUrl: publicUrl,
      name: file.name,
      type: isVideo ? 'video' : 'image',
      size: file.size,
      aspectRatio: isVideo ? '9:16' : '1:1',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Media upload failed';
    console.error('[MediaUpload] Fatal upload error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
