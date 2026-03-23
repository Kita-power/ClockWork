import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-b from-background to-foreground/5 p-6">
      <div className="absolute right-4 top-4">
        <ThemeSwitcher />
      </div>

      <Card className="w-full max-w-lg border-foreground/15 bg-background/90 shadow-xl backdrop-blur">
        <CardHeader>
          <CardTitle>ClockWork</CardTitle>
          <CardDescription>
            Choose a role to open its page template.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className="justify-start">
            <Link href="/consultant">Consultant</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/manager">Manager</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/admin">Admin</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/finance">Finance</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
