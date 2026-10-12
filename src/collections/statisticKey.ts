export type RelationshipValue = number | string | { id?: number | string } | null | undefined

const relationshipID = (value: RelationshipValue) => {
  if (value && typeof value === 'object') return value.id
  return value
}

export function buildBreedStatisticKey(input: {
  year?: number | null
  club?: RelationshipValue
  breed?: RelationshipValue
  region?: string | null
}) {
  const club = relationshipID(input.club)
  const breed = relationshipID(input.breed)
  const region = input.region?.trim().toLocaleLowerCase('sk-SK').replace(/\s+/g, '-')

  if (!input.year || !club || !breed || !region) return undefined
  return `${input.year}:${club}:${breed}:${region}`
}
