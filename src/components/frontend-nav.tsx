'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'

export function FrontendNav({
  links,
  label = 'Main navigation',
}: {
  links: { href: string; label: string; exact?: boolean }[]
  label?: string
}) {
  const pathname = usePathname()

  if (links.length === 0) return null

  return (
    <NavigationMenu aria-label={label}>
      <NavigationMenuList className="flex-wrap justify-start">
        {links.map(({ href, label, exact }) => (
          <NavigationMenuItem key={href}>
            <NavigationMenuLink
              active={pathname === href || (!exact && pathname.startsWith(`${href}/`))}
              render={<Link href={href} />}
            >
              {label}
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
