'use client'

import { ChevronDownIcon, LogOutIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { AuthForm } from './(auth)/auth-form'

const authPages = ['/login', '/forgot-password', '/reset-password']

export function TopBar({
  name,
  activeShowName,
  adminLogoutHref,
  links,
}: {
  name?: string
  activeShowName?: string
  adminLogoutHref?: string
  links: { href: string; label: string; sectionHref?: string }[]
}) {
  const pathname = usePathname()
  const accountButton = useRef<HTMLButtonElement>(null)
  const [logout, setLogout] = useState({ pathname, open: false })
  const initial = Array.from(name ?? '')[0]?.toLocaleUpperCase() || '?'

  if (logout.pathname !== pathname) setLogout({ pathname, open: false })

  if (authPages.includes(pathname)) return null

  return (
    <header className="border-b bg-background">
      <div className="flex w-full flex-col gap-y-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-x-4">
        <div className="flex min-w-0 items-center justify-between gap-2 sm:contents">
          {activeShowName && (
            <span
              className="min-w-0 flex-1 truncate text-sm font-medium sm:order-1 sm:flex-none"
              title={activeShowName}
            >
              {activeShowName}
            </span>
          )}
          {name ? (
            <div className="flex shrink-0 items-center sm:order-3 sm:ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger
                  ref={accountButton}
                  render={<Button variant="ghost" size="lg" className="min-w-0 max-w-full" />}
                >
                  <Avatar aria-hidden="true" size="sm">
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only sm:not-sr-only sm:truncate">{name}</span>
                  <ChevronDownIcon
                    aria-hidden="true"
                    data-icon="inline-end"
                    className="hidden sm:block"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (adminLogoutHref) {
                        window.location.assign(adminLogoutHref)
                        return
                      }
                      setLogout({ pathname, open: true })
                    }}
                  >
                    <LogOutIcon aria-hidden="true" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {!adminLogoutHref && (
                <AuthForm
                  mode="logout"
                  logoutDialog={{
                    open: logout.open,
                    onOpenChange: (open) => setLogout({ pathname, open }),
                    finalFocus: accountButton,
                  }}
                />
              )}
            </div>
          ) : (
            <div className="flex shrink-0 items-center sm:order-3 sm:ml-auto">
              <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
                Log in
              </Link>
            </div>
          )}
        </div>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1 sm:order-2">
          {links.map(({ href, label, sectionHref }) => {
            const current = pathname === href
            const inSection =
              sectionHref && (pathname === sectionHref || pathname.startsWith(`${sectionHref}/`))

            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? 'page' : inSection ? 'location' : undefined}
                className={buttonVariants({
                  variant: current || inSection ? 'secondary' : 'ghost',
                })}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
