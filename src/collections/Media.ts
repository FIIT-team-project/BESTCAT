import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { CollectionConfig } from 'payload'

import { authenticated, canManageContent } from '@/access/roles'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Súbor', plural: 'Súbory' },
  admin: { useAsTitle: 'alt', group: 'Obsah' },
  access: { read: authenticated, create: canManageContent, update: canManageContent, delete: canManageContent },
  upload: {
    staticDir: path.resolve(dirname, '../../media'),
    mimeTypes: ['image/*', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  fields: [
    { name: 'alt', label: 'Popis', type: 'text', required: true },
    { name: 'documentType', label: 'Typ dokumentu', type: 'select', options: [
      { label: 'Katalóg', value: 'catalog' },
      { label: 'Import', value: 'import' },
      { label: 'Report', value: 'report' },
      { label: 'Obrázok', value: 'image' },
      { label: 'Iné', value: 'other' },
    ] },
  ],
}
