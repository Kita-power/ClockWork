'use client';

import * as React from 'react';
import { Bell, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Notification {
  id: string;
  title: string;
  description?: string;
  timestamp?: Date;
  read?: boolean;
  icon?: React.ReactNode;
}

interface NotificationButtonProps {
  notifications?: Notification[];
  onClose?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
}

const NotificationButton = React.forwardRef<
  HTMLButtonElement,
  NotificationButtonProps
>(
  (
    {
      notifications = [],
      onClose,
      onMarkAsRead,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    const handleClose = (id: string) => {
      onClose?.(id);
    };

    const handleMarkAsRead = (id: string) => {
      onMarkAsRead?.(id);
    };

    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={ref}
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-80 p-0 rounded-lg shadow-lg"
        >
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">
                No notifications
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 border-b bg-background p-4 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Notifications</h2>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
              </div>

              {/* Notification Items */}
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'group px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer',
                      !notification.read && 'bg-accent/30',
                    )}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      {notification.icon && (
                        <div className="flex-shrink-0 mt-1">
                          {notification.icon}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'text-xs font-medium leading-tight',
                              !notification.read && 'font-semibold',
                            )}
                          >
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClose(notification.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
                            aria-label="Dismiss notification"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        {notification.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.description}
                          </p>
                        )}
                        {notification.timestamp && (
                          <span className="text-xs text-muted-foreground mt-2 block">
                            {formatTime(notification.timestamp)}
                          </span>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0 mt-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t bg-muted/50 p-3 text-center">
                <button className="text-xs font-medium text-primary hover:underline">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);

NotificationButton.displayName = 'NotificationButton';

/**
 * Format timestamp relative to now
 */
function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export { NotificationButton };
