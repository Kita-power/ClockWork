"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DEADLINE_DAY_OPTIONS,
  DEADLINE_TIME_OPTIONS,
  DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG,
  loadAdminConsultantDeadlineConfig,
  saveAdminConsultantDeadlineConfig,
  type ReminderOption,
} from "@/lib/admin-deadline-config";

export default function AdminConfigurationPage() {
  const currentUser = useUser();
  const [daysFromStartOfWeek, setDaysFromStartOfWeek] = useState<string>(
    DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG.daysFromStartOfWeek.toString(),
  );
  const [timeOfDay, setTimeOfDay] = useState<string>(
    DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG.timeOfDay,
  );
  const [reminderSchedule, setReminderSchedule] = useState<ReminderOption>(
    DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG.reminderSchedule,
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaveMessageVisible, setIsSaveMessageVisible] = useState(false);

  useEffect(() => {
    const savedConfig = loadAdminConsultantDeadlineConfig();
    setDaysFromStartOfWeek(savedConfig.daysFromStartOfWeek.toString());
    setTimeOfDay(savedConfig.timeOfDay);
    setReminderSchedule(savedConfig.reminderSchedule);
  }, []);

  useEffect(() => {
    if (!saveMessage) {
      setIsSaveMessageVisible(false);
      return;
    }

    setIsSaveMessageVisible(true);

    const hideTimer = window.setTimeout(() => {
      setIsSaveMessageVisible(false);
    }, 3000);

    const clearTimer = window.setTimeout(() => {
      setSaveMessage(null);
    }, 3500);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [saveMessage]);

  function handleSaveConfiguration(): void {
    saveAdminConsultantDeadlineConfig({
      daysFromStartOfWeek: Number(daysFromStartOfWeek) as 7 | 8 | 9 | 10,
      timeOfDay: timeOfDay as (typeof DEADLINE_TIME_OPTIONS)[number],
      reminderSchedule,
    });
    setSaveMessage("Configuration saved. This deadline is now stored for reuse.");
  }

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle>Configuration</CardTitle>
        <CardDescription>
          Define deadlines and reminder schedules across roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!currentUser.isLoading && !currentUser.isAuthenticated ? (
          <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            You are not logged in. Please log in to use admin actions.
          </p>
        ) : null}
        {!currentUser.isLoading &&
        currentUser.isAuthenticated &&
        !currentUser.isAdmin ? (
          <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            Your account is not an active admin. Configuration changes are disabled.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Days from the start of the week
          </p>
          <Select value={daysFromStartOfWeek} onValueChange={setDaysFromStartOfWeek}>
            <SelectTrigger>
              <SelectValue placeholder="Select day offset" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {DEADLINE_DAY_OPTIONS.map((dayOffset) => (
                  <SelectItem key={dayOffset} value={dayOffset.toString()}>
                    {dayOffset}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Deadline time
          </p>
          <Select value={timeOfDay} onValueChange={setTimeOfDay}>
            <SelectTrigger>
              <SelectValue placeholder="Select a time" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-56">
              <SelectGroup>
                {DEADLINE_TIME_OPTIONS.map((timeOption) => (
                  <SelectItem key={timeOption} value={timeOption}>
                    {timeOption}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reminder schedule
          </p>
          <Select
            value={reminderSchedule}
            onValueChange={(value) => setReminderSchedule(value as ReminderOption)}
          >
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

        {saveMessage ? (
          <div
            className={cn(
              "overflow-hidden transition-all duration-500 ease-out",
              isSaveMessageVisible
                ? "max-h-20 opacity-100 translate-y-0"
                : "max-h-0 opacity-0 -translate-y-1",
            )}
          >
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
              {saveMessage}
            </p>
          </div>
        ) : null}

        <Button
          type="button"
          className="w-full"
          disabled={!currentUser.isAdmin}
          onClick={handleSaveConfiguration}
        >
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}
