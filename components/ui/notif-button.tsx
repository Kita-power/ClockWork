'use client';

import * as React from 'react';
import { Bell, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    const [allNotificationsOpen, setAllNotificationsOpen] = React.useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    const handleClose = (id: string) => {
      onClose?.(id);
    };

    const handleMarkAsRead = (id: string) => {
      onMarkAsRead?.(id);
    };

    const openAllNotifications = () => {
      setOpen(false);
      setAllNotificationsOpen(true);
    };

    return (
      <>
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
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 rounded-lg p-0 shadow-lg"
          >
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Bell className="mb-2 h-10 w-10 opacity-50 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  No notifications
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <div className="sticky top-0 z-10 border-b bg-background p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Notifications</h2>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'group cursor-pointer px-4 py-3 transition-colors hover:bg-accent/50',
                        !notification.read && 'bg-accent/30',
                      )}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        {notification.icon && (
                          <div className="mt-1 flex-shrink-0">
                            {notification.icon}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
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
                              className="rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                              aria-label="Dismiss notification"
                            >
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                          {notification.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {notification.description}
                            </p>
                          )}
                          {notification.timestamp && (
                            <span className="mt-2 block text-xs text-muted-foreground">
                              {formatTime(notification.timestamp)}
                            </span>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="mt-2 flex-shrink-0">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t bg-muted/50 p-3 text-center">
                  <button
                    type="button"
                    onClick={openAllNotifications}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={allNotificationsOpen} onOpenChange={setAllNotificationsOpen}>
          <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>All notifications</DialogTitle>
              <DialogDescription>
                Scroll through all notifications, mark them as read, or dismiss them.
              </DialogDescription>
            </DialogHeader>

            {notifications.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-md border border-dashed bg-muted/20 p-10 text-center">
                <div>
                  <Bell className="mx-auto mb-2 h-10 w-10 opacity-50 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No notifications
                  </p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'group cursor-pointer px-4 py-4 transition-colors hover:bg-accent/50',
                        !notification.read && 'bg-accent/20',
                      )}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        {notification.icon && (
                          <div className="mt-1 flex-shrink-0">
                            {notification.icon}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                'text-sm font-medium leading-tight',
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
                              className="rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                              aria-label="Dismiss notification"
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                          {notification.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {notification.description}
                            </p>
                          )}
                          {notification.timestamp && (
                            <span className="mt-2 block text-xs text-muted-foreground">
                              {formatTime(notification.timestamp)}
                            </span>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="mt-2 flex-shrink-0">
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
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
