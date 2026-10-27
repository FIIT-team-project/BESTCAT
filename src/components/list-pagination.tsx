import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { pageHref, type SearchParams } from '@/lib/pagination'

export function ListPagination({
  result,
  path,
  search,
  pageKey = 'page',
  label,
}: {
  result: { page?: number; totalPages: number }
  path: string
  search: SearchParams
  pageKey?: string
  label: string
}) {
  const page = result.page ?? 1
  const total = result.totalPages
  if (!(total > 1)) return null
  const pages = [...new Set([1, page - 1, page, page + 1, total])]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b)
  const href = (value: number) => pageHref(path, search, pageKey, value)
  return (
    <Pagination aria-label={`${label} pagination`}>
      <PaginationContent>
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious href={href(page - 1)} />
          </PaginationItem>
        )}
        {pages.map((value, index) => (
          <PaginationItem key={value} className="flex items-center gap-0.5">
            {index > 0 && value > pages[index - 1] + 1 && <PaginationEllipsis />}
            <PaginationLink
              href={href(value)}
              isActive={value === page}
              aria-label={`Page ${value}`}
            >
              {value}
            </PaginationLink>
          </PaginationItem>
        ))}
        {page < total && (
          <PaginationItem>
            <PaginationNext href={href(page + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  )
}
