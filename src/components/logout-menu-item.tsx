'use client'

import { LogOutIcon } from 'lucide-react'
import { startTransition, useActionState } from 'react'

import { logoutAction } from '@/app/(frontend)/auth/actions'
import { DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function LogoutMenuItem() {
  const [state, logout, isPending] = useActionState(logoutAction, { error: null })

  return (
    <DropdownMenuGroup>
      <DropdownMenuItem
        closeOnClick={false}
        disabled={isPending}
        onClick={() => startTransition(logout)}
      >
        <LogOutIcon />
        {isPending ? 'Logging out…' : 'Logout'}
      </DropdownMenuItem>
      {state.error && <p role="alert">{state.error}</p>}
    </DropdownMenuGroup>
  )
}
