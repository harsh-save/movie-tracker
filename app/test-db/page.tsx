import { supabase } from "@/lib/supabase";

export default async function TestDatabase() {
  const { data, error } = await supabase
    .from("media")
    .select("*");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">
        Database Test
      </h1>

      <pre className="mt-4">
        {JSON.stringify({ data, error }, null, 2)}
      </pre>
    </main>
  );
}