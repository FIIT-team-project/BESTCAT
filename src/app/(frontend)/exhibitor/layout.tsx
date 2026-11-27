export default function ExhibitorLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-6 p-4">{children}</div>
}
