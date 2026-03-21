-- First check if profiles table exists and if armandino is there
SELECT * FROM profiles WHERE username = 'armandino';

-- If no results, check all admin/moderator profiles
SELECT id, email, username, role, status FROM profiles WHERE role IN ('admin', 'moderator');

-- If the table exists but armandino is missing, you need to:
-- 1. Find your Supabase auth user ID (check auth.users for your admin email)
-- 2. Insert the profile row

-- Check auth.users for your admin email
SELECT id, email, raw_user_meta_data->>'role' as role FROM auth.users WHERE email LIKE '%armand%' OR raw_user_meta_data->>'username' = 'armandino';

-- If found, insert the profile (replace YOUR_AUTH_USER_ID and YOUR_EMAIL with actual values):
-- INSERT INTO profiles (id, email, username, role, status, full_name)
-- VALUES ('YOUR_AUTH_USER_ID', 'YOUR_EMAIL', 'armandino', 'admin', 'active', 'Arman');
