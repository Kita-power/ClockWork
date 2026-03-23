import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return JSON.stringify(data.claims, null, 2);
}

export default function ProtectedPage() {
  return (
    <div className="flex w-full flex-1 flex-col gap-8">
      <Card>
        <CardContent className="flex items-center gap-3 pt-6 text-sm">
          <InfoIcon />
          This is a protected page that you can only see as an authenticated
          user.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your user details</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-100 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
            <Suspense>
              <UserDetails />
            </Suspense>
          </pre>
        </CardContent>
      </Card>

      <Separator />

      <section className="flex flex-col gap-4">
        <Badge variant="secondary" className="w-fit">
          Next steps
        </Badge>
        <FetchDataSteps />
      </section>
    </div>
  );
}
