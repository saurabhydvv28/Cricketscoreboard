'use client'

import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react'

import { logout } from '@/lib/actions/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface UserMenuProps {
  fullName: string
  playerId: string
  isAdmin: boolean
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function UserMenu({ fullName, playerId, isAdmin }: UserMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {fullName.split(' ')[0]}
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 rounded-md border border-border bg-surface-raised p-1.5 text-foreground shadow-lg animate-fade-in"
        >
          <div className="px-2.5 py-2">
            <p className="text-sm font-semibold">{fullName}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {playerId}
            </p>
            {isAdmin && (
              <Badge variant="live" className="mt-1.5">
                Admin
              </Badge>
            )}
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-sm outline-none transition-colors hover:bg-surface focus:bg-surface"
            >
              <UserIcon className="h-4 w-4" />
              My profile
            </Link>
          </DropdownMenu.Item>

          {isAdmin && (
            <DropdownMenu.Item asChild>
              <Link
                href="/admin"
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-sm outline-none transition-colors hover:bg-surface focus:bg-surface"
              >
                <LayoutDashboard className="h-4 w-4" />
                Admin dashboard
              </Link>
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item asChild>
            <form action={logout} className="w-full">
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm text-boundary outline-none transition-colors hover:bg-surface focus:bg-surface"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
