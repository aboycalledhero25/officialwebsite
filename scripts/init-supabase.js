const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabaseUrl = "https://tqrdgzsuomeezlacjjrl.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmRnenN1b21lZXpsYWNqanJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMTQzNCwiZXhwIjoyMDk0MDk3NDM0fQ.pbMJX7axcuWiiOGn0LDjWCibJQBZyDQ3hfcUiS-NZao";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function init() {
  // Create config bucket for data.json
  const { error: configBucketError } = await supabase.storage.createBucket("config", {
    public: false,
  });
  if (configBucketError && !configBucketError.message.includes("already exists")) {
    console.error("Config bucket error:", configBucketError);
  } else {
    console.log("✅ Config bucket ready");
  }

  // Create website-images bucket for uploads
  const { error: imgBucketError } = await supabase.storage.createBucket("website-images", {
    public: true,
    fileSizeLimit: 10485760, // 10MB
  });
  if (imgBucketError && !imgBucketError.message.includes("already exists")) {
    console.error("Image bucket error:", imgBucketError);
  } else {
    console.log("✅ Website-images bucket ready");
  }

  // Upload current data.json to config bucket
  const dataPath = path.join(__dirname, "..", "lib", "data.json");
  const fileContent = fs.readFileSync(dataPath);

  const { error: uploadError } = await supabase.storage
    .from("config")
    .upload("data.json", fileContent, {
      contentType: "application/json",
      upsert: true,
    });

  if (uploadError) {
    console.error("Failed to upload data.json:", uploadError);
    process.exit(1);
  }

  console.log("✅ data.json synced to Supabase Storage");
  console.log("\nDone! You can now use Supabase for all data and image operations.");
}

init();
