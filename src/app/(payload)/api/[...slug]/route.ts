import config from '@payload-config'
import '@payloadcms/next/css'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

import { withAdminREST } from '@/collections/access/withAdminREST'

export const GET = withAdminREST(REST_GET(config))
export const POST = withAdminREST(REST_POST(config))
export const DELETE = withAdminREST(REST_DELETE(config))
export const PATCH = withAdminREST(REST_PATCH(config))
export const PUT = withAdminREST(REST_PUT(config))
export const OPTIONS = withAdminREST(REST_OPTIONS(config))
