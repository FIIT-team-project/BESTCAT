import { describe, expect, it } from 'vitest'

import { parseCatalogCSV } from '../src/seed/parseCatalogCSV'

describe('parseCatalogCSV', () => {
  it('parses a BESTCAT catalogue row and keeps the active EMS code', () => {
    const csv = `Catalogue,
LONGHAIR,
BLH a,
1,Aristo Cats Luna
Show Class,
CACE,
BLH - British Longhair,
a - Blue,
Female,
Birthday (Day-Month-Year): 28-05-2021,
Father: Zack,
Mother: Nikita,
Owner: Renáta Kalapács,
"Ring Type: WCF Ring: Adult, Jubilee Ring: Adult",
WCF ID: 406222,
2,Second Cat
Show Class,
CAC,
BLH - British Longhair,
a - Blue,
Male (Neuter),
Birthday (Day-Month-Year): 01-01-2020,
Father: One,
Mother: Two,
Owner: Second Owner,
Ring Type: -,
WCF ID: 406223,`

    const result = parseCatalogCSV(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      catalogNumber: 1,
      group: 'LONGHAIR',
      emsCode: 'BLH a',
      breedCode: 'BLH',
      colorCode: 'a',
      sex: 'female',
      birthDate: '2021-05-28T00:00:00.000Z',
      ringTypes: ['WCF Ring: Adult', 'Jubilee Ring: Adult'],
      wcfId: '406222',
    })
    expect(result[1]).toMatchObject({ emsCode: 'BLH a', sex: 'male-neuter', ringTypes: [] })
  })
})
