import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * Real Media Upload API
 * Handles image and video uploads directly to the server's public/uploads directory.
 * Generates lightweight, durable URLs for post attachments (photos and reels).
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

    // Ensure public/uploads exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Clean filename with timestamp to prevent collisions
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}_${safeName}`;
    const filePath = path.join(uploadsDir, filename);

    // Save to disk
    await writeFile(filePath, buffer);

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|m4v)$/i.test(filename);
    let publicUrl = `/uploads/${filename}`;

    // Also attempt uploading to Supabase Storage if configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Try known bucket names
        for (const bucketName of ['postingtube-media', 'postbridge-media', 'media', 'uploads', 'public']) {
          const { data: sData, error: sErr } = await supabase.storage
            .from(bucketName)
            .upload(filename, buffer, { contentType: file.type, upsert: true });

          if (!sErr && sData) {
            const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(filename);
            if (pubData?.publicUrl) {
              publicUrl = pubData.publicUrl;
              break;
            }
          }
        }
      } catch (sbErr) {
        // Fall back gracefully to disk storage
        console.warn('Supabase storage upload note:', sbErr);
      }
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
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
