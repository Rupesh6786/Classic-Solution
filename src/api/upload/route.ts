
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename for the uploaded file
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // The path within the bucket should not contain the bucket name itself.
    const uniqueFilePath = `${Date.now()}_${sanitizedFilename}`;
    
    // The bucket name must match the one you created in your Supabase project.
    const BUCKET_NAME = 'product-images';

    // Upload the file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(uniqueFilePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      // Check for specific Supabase errors if needed
      console.error('Error uploading to Supabase Storage:', uploadError);
      let errorMessage = uploadError.message;
      if (uploadError.message.includes("Invalid JWT")) {
        errorMessage = 'Authentication error with Supabase. Check your Service Role Key.'
      } else if (uploadError.message.includes("Bucket not found")) {
        errorMessage = `Supabase bucket '${BUCKET_NAME}' not found. Please ensure it exists and is public.`
      }
      return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }

    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);
      
    if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("Could not get public URL for the uploaded file.");
    }
    
    // Return the public URL
    return NextResponse.json({ success: true, path: publicUrlData.publicUrl });

  } catch (error) {
    console.error('Error in upload route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file due to an unknown error.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
