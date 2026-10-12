import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { authenticated, canManageContent } from '@/access/roles'
import { buildBreedStatisticKey, type RelationshipValue } from '@/collections/statisticKey'

const setStatisticKey: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data

  const statistic = { ...originalDoc, ...data }

  const key = buildBreedStatisticKey({
    year: typeof statistic.year === 'number' ? statistic.year : undefined,
    club: statistic.club as RelationshipValue,
    breed: statistic.breed as RelationshipValue,
    region: typeof statistic.region === 'string' ? statistic.region : undefined,
  })

  if (key) data.key = key
  return data
}

export const BreedStatistics: CollectionConfig = {
  slug: 'breed-statistics',
  labels: { singular: 'Štatistika plemena', plural: 'Štatistiky plemien' },
  admin: {
    useAsTitle: 'key',
    defaultColumns: ['year', 'club', 'breed', 'region', 'bornCount', 'importedWcfCount'],
    group: 'Štatistiky',
    description: 'Ročné súhrny narodených, importovaných a registrovaných mačiek podľa klubu a plemena.',
  },
  access: {
    read: authenticated,
    create: canManageContent,
    update: canManageContent,
    delete: canManageContent,
  },
  hooks: { beforeValidate: [setStatisticKey] },
  timestamps: true,
  fields: [
    {
      name: 'key',
      label: 'Unikátny kľúč',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true, description: 'Vytvára sa automaticky z roku, klubu, plemena a regiónu.' },
    },
    { name: 'year', label: 'Rok', type: 'number', required: true, min: 1900, max: 2200, index: true },
    { name: 'club', label: 'Klub', type: 'relationship', relationTo: 'clubs', required: true, index: true },
    { name: 'breed', label: 'Plemeno', type: 'relationship', relationTo: 'breeds', required: true, index: true },
    { name: 'region', label: 'Región', type: 'text', required: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'bornCount', label: 'Narodené mačky', type: 'number', required: true, defaultValue: 0, min: 0 },
        { name: 'importedWcfCount', label: 'Importované z WCF', type: 'number', required: true, defaultValue: 0, min: 0 },
        { name: 'importedNonWcfCount', label: 'Importované mimo WCF', type: 'number', required: true, defaultValue: 0, min: 0 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'registeredLoCount', label: 'Registračná kniha LO', type: 'number', required: true, defaultValue: 0, min: 0 },
        { name: 'registeredRiexCount', label: 'Registračná kniha RIEX', type: 'number', required: true, defaultValue: 0, min: 0 },
      ],
    },
    { name: 'importBatch', label: 'Zdrojový import', type: 'relationship', relationTo: 'import-batches' },
    { name: 'notes', label: 'Poznámka', type: 'textarea' },
  ],
}
