import { describe, expect, it } from 'vitest'

import { buildBreedStatisticKey } from '../src/collections/statisticKey'

describe('buildBreedStatisticKey', () => {
  it('creates a stable key from the statistical dimensions', () => {
    expect(buildBreedStatisticKey({ year: 2024, club: 3, breed: { id: 12 }, region: 'Trnavský kraj' }))
      .toBe('2024:3:12:trnavský-kraj')
  })

  it('does not create a partial key', () => {
    expect(buildBreedStatisticKey({ year: 2024, club: 3, region: 'Trnavský kraj' })).toBeUndefined()
  })
})
