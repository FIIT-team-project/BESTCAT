import { type CollectionConfig, validations } from 'payload'

import { exportShowCatsEndpoint } from './endpoints/exportShowCatsEndpoint'
import { importShowEndpoint } from './endpoints/importShowEndpoint'

export const Shows: CollectionConfig = {
  slug: 'shows',
  admin: {
    useAsTitle: 'show_name',
    defaultColumns: ['show_name', 'city', 'country', 'is_active'],
  },
  endpoints: [importShowEndpoint, exportShowCatsEndpoint],
  fields: [
    {
      name: 'chief_steward',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'organization',
      type: 'text',
      required: true,
    },
    {
      name: 'show_name',
      type: 'text',
      required: true,
    },
    {
      name: 'city',
      type: 'text',
      required: true,
    },
    {
      name: 'country',
      type: 'text',
      required: true,
    },
    {
      name: 'license_number',
      type: 'text',
      required: true,
    },
    {
      name: 'is_active',
      type: 'checkbox',
      defaultValue: false,
      required: true,
      admin: {
        description:
          'Only one show can be active. Deactivate the current show before activating another.',
      },
      validate: async (value, options) => {
        const result = await validations.checkbox(value, options)
        if (result !== true) return result
        if (!value) return true

        const { id, req } = options
        const { totalDocs } = await req.payload.count({
          collection: 'shows',
          where: {
            and: [
              { is_active: { equals: true } },
              ...(id == null ? [] : [{ id: { not_equals: id } }]),
            ],
          },
          // This is a global invariant, including shows the caller cannot read.
          overrideAccess: true,
          req,
        })

        return totalDocs === 0 || 'Another show is already active. Deactivate it first.'
      },
    },
    {
      name: 'import',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/admin/ShowImport#ShowImport',
        },
      },
    },
    {
      name: 'export',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/admin/ShowCatExport#ShowCatExport',
        },
      },
    },
  ],
}
