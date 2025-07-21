
# AC-Solution Firebase Project

## ⭐ New: Supabase for File Uploads!

This project now uses **Supabase Storage** for handling all file and image uploads. Firebase Storage is no longer used.

### How to Configure Supabase for Uploads

You must configure Supabase correctly for image uploads in the admin panel to work.

#### Step 1: Get Supabase Credentials

1.  Go to your Supabase project dashboard.
2.  Navigate to **Project Settings** (the gear icon).
3.  Go to the **API** section.
4.  You will find your **Project URL** and the `anon` **public key**.
5.  Create a `.env` file in your project's root directory (if it doesn't exist). Add your credentials like this:

    ```
    NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
    ```

    *   Replace `YOUR_PROJECT_URL` and `YOUR_ANON_KEY` with the actual values from your Supabase dashboard.
    *   **Important**: The `anon` key is public and safe to use in the browser, but it only works if you set up the correct policies (see Step 3).

#### Step 2: Create a Storage Bucket

1.  In your Supabase project, go to the **Storage** section (the folder icon).
2.  Click **"New bucket"**.
3.  Enter the bucket name as `product-images`.
4.  Make sure to check the **"Public bucket"** option. This allows the images to be viewed on your website.
5.  Click **"Create bucket"**.

#### Step 3: Configure Bucket Policies & CORS (Crucial for Fixing Upload Errors!)

For uploads from your website to work, you need to set up permissions (policies) and CORS. **An empty upload error almost always means this step was missed.**

1.  **CORS Configuration**:
    *   Go to **Storage** -> **Configuration**.
    *   Scroll down to **Bucket CORS configuration**.
    *   For the `product-images` bucket, set the **Allowed origins** to `*` for development, or your website's specific domain for production (e.g., `https://your-app.com`).
    *   Set the **Allowed methods** to include `GET`, `POST`, `PUT`.
    *   Click **Save**.

2.  **Bucket Policies**:
    *   Navigate to **Authentication -> Policies** in your Supabase dashboard.
    *   Click **"New policy"** and select **"From scratch"**.
    *   **Policy Name**: Give it a descriptive name, like `Allow authenticated uploads to product-images`.
    *   **Allowed operation**: Check the **INSERT** box.
    *   **Target roles**: Select the **authenticated** role.
    *   **USING expression**: Leave this as the default `true`.
    *   **WITH CHECK expression**: Set this to: `bucket_id = 'product-images'`
    *   Click **"Review"** and then **"Save policy"**.
    *   You will also need a policy for viewing images. Create another policy:
        *   **Policy Name**: `Allow public read access to product-images`.
        *   **Allowed operation**: Check the **SELECT** box.
        *   **Target roles**: Select **anon** and **authenticated**.
        *   **USING expression**: Set this to: `bucket_id = 'product-images'`
        *   Click **"Review"** and **"Save policy"**.


After these steps, your file uploads from the admin panel should work perfectly!

---

### Project Overview

This is a Next.js application for AC sales and services, using **Firestore** for data and **Supabase Storage** for file uploads.

### Firebase Firestore Rules

Your Firestore rules (located in `firestore.rules`) control access to your database and are separate from Supabase storage. They do not need to be changed for file uploads to work.
