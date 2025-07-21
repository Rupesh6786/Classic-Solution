
# AC-Solution Firebase Project

## ⭐ New: Supabase for File Uploads!

This project now uses **Supabase Storage** for handling all file and image uploads. Firebase Storage is no longer used.

### How to Configure Supabase for Uploads

You must configure Supabase correctly for image uploads in the admin panel to work.

#### Step 1: Get Supabase Credentials

1.  Go to your Supabase project dashboard.
2.  Navigate to **Project Settings** (the gear icon).
3.  Go to the **API** section.
4.  You will find your **Project URL** and the `service_role` **secret key**.
5.  Create a `.env.local` file in your project's root directory (if it doesn't exist). Add your credentials like this:

    ```
    NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
    ```

    *   Replace `YOUR_PROJECT_URL` and `YOUR_SERVICE_ROLE_KEY` with the actual values from your Supabase dashboard.
    *   **Important**: The `service_role` key grants admin access and should never be exposed on the client side. We only use it securely in our server-side API route.

#### Step 2: Create a Storage Bucket

1.  In your Supabase project, go to the **Storage** section (the folder icon).
2.  Click **"New bucket"**.
3.  Enter the bucket name as `product-images`.
4.  Make sure to check the **"Public bucket"** option. This allows the images to be viewed on your website.
5.  Click **"Create bucket"**.

#### Step 3: Configure Bucket Policies & CORS

For uploads from your website to work, you need to set up permissions (policies) and CORS.

1.  **CORS Configuration**:
    *   In the Storage section, find the **"CORS configuration"** setting for your `product-images` bucket.
    *   Set it to allow your website's domain. For development, you can use `*`, but for production, you should restrict it to your actual domain (e.g., `https://your-app.com`).

2.  **Bucket Policies**:
    *   Navigate to **Authentication -> Policies** in your Supabase dashboard.
    *   Find the policies for your `product-images` bucket.
    *   Create policies to allow authenticated users to perform `insert`, `select`, `update` operations. Here's an example policy for allowing inserts (uploads) for any authenticated user:

        ```sql
        -- Policy to allow authenticated users to upload to product-images
        CREATE POLICY "Allow authenticated uploads"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'product-images');
        ```
    *   Ensure you have policies that allow public read access (`select`) since it's a public bucket. Supabase often creates this for you by default on public buckets.

After these steps, your file uploads from the admin panel should work perfectly!

---

### Project Overview

This is a Next.js application for AC sales and services, using **Firestore** for data and **Supabase Storage** for file uploads.

### Firebase Firestore Rules

Your Firestore rules (located in `firestore.rules`) control access to your database and are separate from Supabase storage. They do not need to be changed for file uploads to work.
