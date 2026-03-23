import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function AdminConfigurationPage() {
  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle>Configuration</CardTitle>
        <CardDescription>
          Define deadlines and reminder schedules across roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Weekly consultant submission deadline
          </p>
          <Input type="text" defaultValue="Friday, 5:00 PM" />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reminder schedule
          </p>
          <Select defaultValue="24h">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="24h">Email reminder 24 hours before deadline</SelectItem>
                <SelectItem value="48h">Email reminder 48 hours before deadline</SelectItem>
                <SelectItem value="daily">Daily reminders in final 3 days</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="rounded-md border bg-muted/30 p-4">
          <p className="font-semibold">Derived approval windows (read-only)</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Manager approval deadline: consultant deadline + 2 business days
          </p>
          <p className="text-sm text-muted-foreground">
            Finance processing deadline: consultant deadline + 4 business days
          </p>
        </div>

        <Button type="button" className="w-full">
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}
