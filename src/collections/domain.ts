import type { CollectionConfig, Field } from 'payload'

import {
  authenticated,
  canManageContent,
  canManageJudging,
  canManageShows,
  publicRead,
} from '@/access/roles'

const timestamps = true
const contentAccess = { read: publicRead, create: canManageContent, update: canManageContent, delete: canManageContent }
const privateContentAccess = { read: authenticated, create: canManageContent, update: canManageContent, delete: canManageContent }
const judgingAccess = { read: publicRead, create: canManageJudging, update: canManageJudging, delete: canManageShows }

const sourceFields: Field[] = [
  { name: 'sourceSystem', label: 'Zdrojový systém', type: 'select', defaultValue: 'bestcat', options: [
    { label: 'BESTCAT', value: 'bestcat' },
    { label: 'WCF', value: 'wcf' },
    { label: 'Mimo WCF', value: 'non-wcf' },
    { label: 'Manuálne', value: 'manual' },
  ] },
]

export const Clubs: CollectionConfig = {
  slug: 'clubs',
  labels: { singular: 'Klub', plural: 'Kluby' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'code', 'country', 'region'], group: 'Register' },
  access: contentAccess,
  timestamps,
  fields: [
    { name: 'name', label: 'Názov', type: 'text', required: true },
    { name: 'code', label: 'Kód', type: 'text', required: true, unique: true, index: true },
    { name: 'federation', label: 'Federácia', type: 'text', defaultValue: 'WCF' },
    { name: 'country', label: 'Krajina', type: 'text', required: true },
    { name: 'city', label: 'Mesto', type: 'text' },
    { name: 'region', label: 'Región', type: 'text', index: true },
    { name: 'active', label: 'Aktívny', type: 'checkbox', defaultValue: true },
  ],
}

export const Exhibitions: CollectionConfig = {
  slug: 'exhibitions',
  labels: { singular: 'Výstava', plural: 'Výstavy' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'startDate', 'city', 'club', 'status'], group: 'Výstavy' },
  access: contentAccess,
  timestamps,
  fields: [
    { name: 'title', label: 'Názov', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'club', label: 'Organizátor', type: 'relationship', relationTo: 'clubs', required: true },
    { name: 'startDate', label: 'Začiatok', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'endDate', label: 'Koniec', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'licenseNumber', label: 'Licencia', type: 'text', index: true },
    { name: 'city', label: 'Mesto', type: 'text', required: true },
    { name: 'country', label: 'Krajina', type: 'text', required: true },
    { name: 'address', label: 'Adresa', type: 'text' },
    { name: 'region', label: 'Región', type: 'text', index: true },
    { name: 'status', label: 'Stav', type: 'select', required: true, defaultValue: 'draft', options: [
      { label: 'Koncept', value: 'draft' }, { label: 'Publikovaná', value: 'published' },
      { label: 'Prebieha', value: 'live' }, { label: 'Ukončená', value: 'completed' },
    ] },
    { name: 'judges', label: 'Posudzovatelia', type: 'relationship', relationTo: 'judges', hasMany: true },
    { name: 'catalog', label: 'PDF katalóg', type: 'relationship', relationTo: 'media' },
  ],
}

export const Judges: CollectionConfig = {
  slug: 'judges',
  labels: { singular: 'Posudzovateľ', plural: 'Posudzovatelia' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'country', 'active'], group: 'Register' },
  access: privateContentAccess,
  timestamps,
  fields: [
    { name: 'name', label: 'Meno', type: 'text', required: true, index: true },
    { name: 'country', label: 'Krajina', type: 'text' },
    { name: 'email', label: 'E-mail', type: 'email' },
    { name: 'phone', label: 'Telefón', type: 'text' },
    { name: 'user', label: 'Používateľský účet', type: 'relationship', relationTo: 'users' },
    { name: 'qualifications', label: 'Oprávnenia', type: 'array', fields: [{ name: 'value', label: 'Skupina alebo plemeno', type: 'text', required: true }] },
    { name: 'active', label: 'Aktívny', type: 'checkbox', defaultValue: true },
  ],
}

export const Owners: CollectionConfig = {
  slug: 'owners',
  labels: { singular: 'Majiteľ', plural: 'Majitelia' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'country', 'club'], group: 'Register' },
  access: privateContentAccess,
  timestamps,
  fields: [
    { name: 'name', label: 'Meno', type: 'text', required: true, index: true },
    { name: 'country', label: 'Krajina', type: 'text' },
    { name: 'email', label: 'E-mail', type: 'email' },
    { name: 'phone', label: 'Telefón', type: 'text' },
    { name: 'club', label: 'Klub', type: 'relationship', relationTo: 'clubs' },
    { name: 'user', label: 'Účet vystavovateľa', type: 'relationship', relationTo: 'users' },
  ],
}

export const BreedGroups: CollectionConfig = {
  slug: 'breed-groups',
  labels: { singular: 'Skupina plemien', plural: 'Skupiny plemien' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'sortOrder'], group: 'Register' },
  access: contentAccess,
  timestamps,
  fields: [
    { name: 'name', label: 'Názov', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'sortOrder', label: 'Poradie', type: 'number', required: true, defaultValue: 0 },
  ],
}

export const Breeds: CollectionConfig = {
  slug: 'breeds',
  labels: { singular: 'Plemeno', plural: 'Plemená' },
  admin: { useAsTitle: 'name', defaultColumns: ['code', 'name', 'group', 'recognizedByWcf'], group: 'Register' },
  access: contentAccess,
  timestamps,
  fields: [
    { name: 'code', label: 'EMS kód', type: 'text', required: true, unique: true, index: true },
    { name: 'name', label: 'Názov', type: 'text', required: true },
    { name: 'group', label: 'Skupina', type: 'relationship', relationTo: 'breed-groups', required: true },
    { name: 'recognizedByWcf', label: 'Uznané WCF', type: 'checkbox', defaultValue: true },
  ],
}

export const Cats: CollectionConfig = {
  slug: 'cats',
  labels: { singular: 'Mačka', plural: 'Mačky' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'wcfId', 'breed', 'sex', 'owner'], group: 'Register' },
  access: privateContentAccess,
  timestamps,
  fields: [
    { name: 'name', label: 'Meno', type: 'text', required: true, index: true },
    { name: 'wcfId', label: 'WCF ID', type: 'text', unique: true, index: true },
    { name: 'breed', label: 'Plemeno', type: 'relationship', relationTo: 'breeds', required: true },
    { name: 'emsCode', label: 'EMS farba', type: 'text', index: true },
    { name: 'colorDescription', label: 'Popis farby', type: 'text' },
    { name: 'sex', label: 'Pohlavie', type: 'select', required: true, options: [
      { label: 'Kocúr', value: 'male' }, { label: 'Mačka', value: 'female' },
      { label: 'Kastrovaný kocúr', value: 'male-neuter' }, { label: 'Kastrovaná mačka', value: 'female-spay' },
      { label: 'Neurčené', value: 'unknown' },
    ] },
    { name: 'birthDate', label: 'Dátum narodenia', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'sire', label: 'Otec', type: 'text' },
    { name: 'dam', label: 'Matka', type: 'text' },
    { name: 'owner', label: 'Majiteľ', type: 'relationship', relationTo: 'owners', required: true },
    { name: 'registrationBook', label: 'Registračná kniha', type: 'select', options: [
      { label: 'LO', value: 'lo' }, { label: 'RIEX', value: 'riex' }, { label: 'Iná', value: 'other' },
    ] },
    { name: 'originCountry', label: 'Krajina pôvodu', type: 'text' },
    ...sourceFields,
  ],
}

export const ImportBatches: CollectionConfig = {
  slug: 'import-batches',
  labels: { singular: 'Import', plural: 'Importy' },
  admin: { useAsTitle: 'sourceName', defaultColumns: ['sourceName', 'exhibition', 'status', 'successfulRows', 'createdAt'], group: 'Import a export' },
  access: privateContentAccess,
  timestamps,
  fields: [
    { name: 'key', label: 'Interný kľúč', type: 'text', required: true, unique: true, index: true },
    { name: 'exhibition', label: 'Výstava', type: 'relationship', relationTo: 'exhibitions', required: true },
    { name: 'sourceName', label: 'Názov zdroja', type: 'text', required: true },
    { name: 'sourceType', label: 'Formát', type: 'select', required: true, options: [
      { label: 'CSV', value: 'csv' }, { label: 'Excel', value: 'excel' }, { label: 'PDF', value: 'pdf' }, { label: 'API', value: 'api' },
    ] },
    { name: 'sourceFile', label: 'Zdrojový súbor', type: 'relationship', relationTo: 'media' },
    { name: 'status', label: 'Stav', type: 'select', required: true, defaultValue: 'pending', options: [
      { label: 'Čaká', value: 'pending' }, { label: 'Spracúva sa', value: 'processing' },
      { label: 'Dokončený', value: 'completed' }, { label: 'Dokončený s chybami', value: 'partial' }, { label: 'Zlyhal', value: 'failed' },
    ] },
    { name: 'totalRows', label: 'Riadkov spolu', type: 'number', defaultValue: 0 },
    { name: 'successfulRows', label: 'Úspešné riadky', type: 'number', defaultValue: 0 },
    { name: 'failedRows', label: 'Chybné riadky', type: 'number', defaultValue: 0 },
    { name: 'messages', label: 'Správy', type: 'array', fields: [
      { name: 'level', type: 'select', required: true, options: ['info', 'warning', 'error'] },
      { name: 'message', type: 'textarea', required: true },
    ] },
  ],
}

export const Entries: CollectionConfig = {
  slug: 'entries',
  labels: { singular: 'Prihláška', plural: 'Prihlášky' },
  admin: { useAsTitle: 'externalKey', defaultColumns: ['catalogNumber', 'cat', 'showClass', 'exhibition', 'status'], group: 'Výstavy' },
  access: privateContentAccess,
  timestamps,
  fields: [
    { name: 'externalKey', label: 'Interný kľúč', type: 'text', required: true, unique: true, index: true },
    { name: 'exhibition', label: 'Výstava', type: 'relationship', relationTo: 'exhibitions', required: true, index: true },
    { name: 'cat', label: 'Mačka', type: 'relationship', relationTo: 'cats', required: true },
    { name: 'catalogNumber', label: 'Katalógové číslo', type: 'number', required: true, index: true },
    { name: 'showClass', label: 'Výstavná trieda', type: 'text', required: true, index: true },
    { name: 'emsCode', label: 'EMS kód na výstave', type: 'text' },
    { name: 'ringTypes', label: 'Kruhy', type: 'array', fields: [{ name: 'value', label: 'Typ kruhu', type: 'text', required: true }] },
    { name: 'status', label: 'Stav', type: 'select', defaultValue: 'registered', required: true, options: [
      { label: 'Prihlásená', value: 'registered' }, { label: 'Prítomná', value: 'checked-in' },
      { label: 'Posudzuje sa', value: 'judging' }, { label: 'Dokončená', value: 'completed' }, { label: 'Neprítomná', value: 'absent' },
    ] },
    { name: 'importBatch', label: 'Import', type: 'relationship', relationTo: 'import-batches' },
  ],
}

export const Rings: CollectionConfig = {
  slug: 'rings',
  labels: { singular: 'Kruh', plural: 'Kruhy' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'exhibition', 'stage', 'judge', 'status'], group: 'Posudzovanie' },
  access: judgingAccess,
  timestamps,
  fields: [
    { name: 'name', label: 'Názov', type: 'text', required: true },
    { name: 'exhibition', label: 'Výstava', type: 'relationship', relationTo: 'exhibitions', required: true, index: true },
    { name: 'stage', label: 'Fáza', type: 'select', required: true, options: [
      { label: 'Posudzovanie pri stole', value: 'table' }, { label: 'Posudzovanie v kruhu', value: 'ring' }, { label: 'Best in Show', value: 'best-in-show' },
    ] },
    { name: 'category', label: 'Kategória', type: 'text' },
    { name: 'judge', label: 'Posudzovateľ', type: 'relationship', relationTo: 'judges' },
    { name: 'stewards', label: 'Stewardi', type: 'relationship', relationTo: 'users', hasMany: true },
    { name: 'status', label: 'Stav', type: 'select', defaultValue: 'planned', options: [
      { label: 'Plánovaný', value: 'planned' }, { label: 'Otvorený', value: 'open' }, { label: 'Pozastavený', value: 'paused' }, { label: 'Ukončený', value: 'closed' },
    ] },
  ],
}

export const Calls: CollectionConfig = {
  slug: 'calls',
  labels: { singular: 'Vyvolanie', plural: 'Vyvolania' },
  admin: { useAsTitle: 'id', defaultColumns: ['entry', 'ring', 'status', 'queuePosition', 'calledAt'], group: 'Posudzovanie' },
  access: judgingAccess,
  timestamps,
  fields: [
    { name: 'exhibition', label: 'Výstava', type: 'relationship', relationTo: 'exhibitions', required: true, index: true },
    { name: 'entry', label: 'Prihláška', type: 'relationship', relationTo: 'entries', required: true },
    { name: 'ring', label: 'Kruh', type: 'relationship', relationTo: 'rings', required: true },
    { name: 'queuePosition', label: 'Poradie', type: 'number', min: 1 },
    { name: 'status', label: 'Stav', type: 'select', required: true, defaultValue: 'waiting', index: true, options: [
      { label: 'Čaká', value: 'waiting' }, { label: 'Vyvolaná', value: 'called' }, { label: 'Potvrdená', value: 'acknowledged' },
      { label: 'Posudzuje sa', value: 'in-judging' }, { label: 'Dokončená', value: 'completed' }, { label: 'Neprítomná', value: 'absent' },
    ] },
    { name: 'calledAt', label: 'Čas vyvolania', type: 'date' },
    { name: 'acknowledgedAt', label: 'Čas potvrdenia', type: 'date' },
    { name: 'completedAt', label: 'Čas dokončenia', type: 'date' },
    { name: 'notes', label: 'Poznámky', type: 'textarea' },
  ],
}

export const Results: CollectionConfig = {
  slug: 'results',
  labels: { singular: 'Výsledok', plural: 'Výsledky' },
  admin: { useAsTitle: 'award', defaultColumns: ['entry', 'stage', 'award', 'placement', 'published'], group: 'Posudzovanie' },
  access: judgingAccess,
  timestamps,
  fields: [
    { name: 'exhibition', label: 'Výstava', type: 'relationship', relationTo: 'exhibitions', required: true, index: true },
    { name: 'entry', label: 'Prihláška', type: 'relationship', relationTo: 'entries', required: true },
    { name: 'ring', label: 'Kruh', type: 'relationship', relationTo: 'rings' },
    { name: 'judge', label: 'Posudzovateľ', type: 'relationship', relationTo: 'judges' },
    { name: 'stage', label: 'Fáza', type: 'select', required: true, options: ['table', 'ring', 'best-in-show'] },
    { name: 'award', label: 'Ocenenie', type: 'text' },
    { name: 'placement', label: 'Umiestnenie', type: 'number', min: 1 },
    { name: 'score', label: 'Body', type: 'number' },
    { name: 'notes', label: 'Posudok', type: 'textarea' },
    { name: 'published', label: 'Publikované', type: 'checkbox', defaultValue: false },
  ],
}
