import type { CollectionConfig } from 'payload'

export const Cats: CollectionConfig = {
  slug: 'cats',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['catalog_number', 'name', 'breed', 'owner', 'wcf_id'],
  },
  fields: [
    // name, birthday, owner and wcf_id are temporarily optional because the show import
    // spreadsheet does not contain them yet. See docs/show-import.md.
    {
      name: 'name',
      type: 'text',
      required: false,
    },
    {
      name: 'breed',
      type: 'text',
      required: true,
    },
    {
      name: 'color',
      type: 'text',
      required: true,
    },
    {
      name: 'sex',
      type: 'text',
      required: true,
    },
    {
      name: 'birthday',
      type: 'date',
      required: false,
      admin: {
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      index: true,
    },
    {
      name: 'wcf_id',
      label: 'WCF ID',
      type: 'text',
      required: false,
    },
    {
      name: 'catalog_number',
      label: 'Catalog number',
      type: 'number',
      required: true,
      min: 1,
      admin: {
        description: 'Number of the cat in the catalog of the current show.',
      },
    },
    {
      name: 'show_class',
      label: 'Show class',
      type: 'text',
      admin: {
        description: 'Show class in the current show, e.g. CACIB or P.H. - WC.',
      },
    },
    {
      name: 'wcf_group',
      label: 'WCF group',
      type: 'text',
      admin: {
        description: 'WCF group in the current show, e.g. Adult or Junior (6–10 months).',
      },
    },
    {
      name: 'category',
      type: 'number',
      min: 1,
      admin: {
        description: 'WCF breed category (1–5) of the cat.',
      },
    },
  ],
}
