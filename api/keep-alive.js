import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.from("profiles").select("id").limit(1);
  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  res.status(200).json({ ok: true, ts: new Date().toISOString() });
}
