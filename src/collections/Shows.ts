import { type CollectionConfig, ValidationError, validations } from 'payload'

import { exportShowCatsEndpoint } from './endpoints/exportShowCatsEndpoint'
import { importShowEndpoint } from './endpoints/importShowEndpoint'

const millisecondsPerDay = 24 * 60 * 60 * 1000

export const Shows: CollectionConfig = {
  slug: 'shows',
  admin: {
    useAsTitle: 'show_name',
    defaultColumns: ['show_name', 'city', 'country', 'is_active'],
  },
  hooks: {
    beforeValidate: [
      ({ data, operation, originalDoc }) => {
        const start = data?.start_date === undefined ? originalDoc?.start_date : data.start_date
        const end = data?.end_date === undefined ? originalDoc?.end_date : data.end_date

        // Existing shows with no dates can be edited before their dates are known.
        if (
          operation === 'update' &&
          !start &&
          !end &&
          !originalDoc?.start_date &&
          !originalDoc?.end_date
        ) {
          return data
        }

        const errors = []
        if (!start) errors.push({ path: 'start_date', message: 'Enter the start date.' })
        if (!end) errors.push({ path: 'end_date', message: 'Enter the end date.' })
        if (
          start &&
          end &&
          Math.floor(Date.parse(start) / millisecondsPerDay) >
            Math.floor(Date.parse(end) / millisecondsPerDay)
        ) {
          errors.push({
            path: 'end_date',
            message: 'The end date must be on or after the start date.',
          })
        }
        if (errors.length) throw new ValidationError({ errors })

        return data
      },
    ],
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
      name: 'start_date',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'end_date',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
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
      name: 'date_from',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'date_to',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayOnly' },
      },
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
