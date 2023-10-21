import { createClient } from '@supabase/supabase-js';

export const uploadFileToStorage = async (
  bucket: string,
  path: string,
  file: File | Blob,
  contentType: string
): Promise<string> => {
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType });
    if (error) {
      throw error;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    console.log('publicURL', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
