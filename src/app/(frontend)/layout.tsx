import { FrontendNav } from '@/components/frontend-nav'
import { LogoutMenuItem } from '@/components/logout-menu-item'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { getFrontendLinks, getProfileLinks } from '@/lib/getFrontendLinks'
import { CatIcon } from 'lucide-react'
import type { Metadata } from 'next'
import React from 'react'
import './styles.css'
import Link from 'next/link'

export const metadata: Metadata = {
  description: 'BESTCAT cat show management.',
  title: 'BESTCAT',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  const user = await getCurrentUser()
  const [links, profileLinks] = await Promise.all([getFrontendLinks(), getProfileLinks()])

  return (
    <html lang="en">
      <body>
        <header>
          <div className="flex flex-wrap justify-between gap-2 p-2 px-4 items-center">
            <Link href="/" className="font-medium flex gap-2 items-center">
              <CatIcon />
              Bestcat
            </Link>
            <div className="order-last flex w-full sm:order-0 sm:w-auto sm:flex-1 sm:pl-4">
              <FrontendNav links={links} />
            </div>
            {user ? (
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Avatar>
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-64">
                    <div className="flex items-center gap-2 px-2 py-4 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">A</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{user.name}</span>
                        <span className="truncate text-xs">{user.email}</span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {profileLinks.map(({ href, label }) => (
                        <DropdownMenuItem key={href} render={<Link href={href} />}>
                          {label}
                        </DropdownMenuItem>
                      ))}
                      <LogoutMenuItem />
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button render={<Link href="/auth/login" />} nativeButton={false} role="link">
                Login
              </Button>
            )}
          </div>
          <Separator />
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
