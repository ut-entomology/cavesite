import type { DataOf } from './data_of';
import type { TaxonPathSpec } from './model';

export type TaxonCounterData = DataOf<TaxonCounter>;

export type NamesFieldName = keyof Pick<
  TaxonCounterData,
  | 'kingdomNames'
  | 'phylumNames'
  | 'classNames'
  | 'orderNames'
  | 'familyNames'
  | 'genusNames'
  | 'speciesNames'
  | 'subspeciesNames'
>;

export type CountsFieldName = keyof Pick<
  TaxonCounterData,
  | 'kingdomCounts'
  | 'phylumCounts'
  | 'classCounts'
  | 'orderCounts'
  | 'familyCounts'
  | 'genusCounts'
  | 'speciesCounts'
  | 'subspeciesCounts'
>;

export class TaxonCounter {
  kingdomNames: string[] | string;
  kingdomCounts: string;
  phylumNames: string[] | string | null;
  phylumCounts: string | null;
  classNames: string[] | string | null;
  classCounts: string | null;
  orderNames: string[] | string | null;
  orderCounts: string | null;
  familyNames: string[] | string | null;
  familyCounts: string | null;
  genusNames: string[] | string | null;
  genusCounts: string | null;
  speciesNames: string[] | string | null;
  speciesCounts: string | null;
  subspeciesNames: string[] | string | null;
  subspeciesCounts: string | null;

  constructor(data: TaxonCounterData) {
    this.kingdomNames = data.kingdomNames;
    this.kingdomCounts = data.kingdomCounts;
    this.phylumNames = data.phylumNames;
    this.phylumCounts = data.phylumCounts;
    this.classNames = data.classNames;
    this.classCounts = data.classCounts;
    this.orderNames = data.orderNames;
    this.orderCounts = data.orderCounts;
    this.familyNames = data.familyNames;
    this.familyCounts = data.familyCounts;
    this.genusNames = data.genusNames;
    this.genusCounts = data.genusCounts;
    this.speciesNames = data.speciesNames;
    this.speciesCounts = data.speciesCounts;
    this.subspeciesNames = data.subspeciesNames;
    this.subspeciesCounts = data.subspeciesCounts;
  }

  static createFromPathSpec(
    pathSpec: TaxonPathSpec,
    speciesName: string | null,
    subspeciesName: string | null
  ): TaxonCounter {
    return new TaxonCounter({
      kingdomNames: pathSpec.kingdomName,
      kingdomCounts: _toInitialCount(pathSpec.kingdomName, pathSpec.phylumName)!,
      phylumNames: pathSpec.phylumName,
      phylumCounts: _toInitialCount(pathSpec.phylumName, pathSpec.className),
      classNames: pathSpec.className,
      classCounts: _toInitialCount(pathSpec.className, pathSpec.orderName),
      orderNames: pathSpec.orderName,
      orderCounts: _toInitialCount(pathSpec.orderName, pathSpec.familyName),
      familyNames: pathSpec.familyName,
      familyCounts: _toInitialCount(pathSpec.familyName, pathSpec.genusName),
      genusNames: pathSpec.genusName,
      genusCounts: _toInitialCount(pathSpec.genusName, pathSpec.speciesName),
      speciesNames: speciesName,
      speciesCounts: _toInitialCount(pathSpec.speciesName, pathSpec.subspeciesName),
      subspeciesNames: subspeciesName,
      subspeciesCounts: _toInitialCount(pathSpec.subspeciesName, null)
    });
  }

  static toNameSeries(names: string[] | string | null): string | null {
    if (names === null) return null;
    return typeof names == 'string' ? names : names.join('|');
  }

  convertToNamesList(namesFieldName: NamesFieldName): string[] | null {
    const names = this[namesFieldName];
    if (names === null || Array.isArray(names)) return names;
    const namesList = names.split('|');
    this[namesFieldName] = namesList;
    return namesList;
  }

  getSpeciesCount(): number {
    let count = _countOnes(this.kingdomCounts);
    count += _countOnes(this.phylumCounts);
    count += _countOnes(this.classCounts);
    count += _countOnes(this.orderCounts);
    count += _countOnes(this.familyCounts);
    count += _countOnes(this.genusCounts);
    count += _countOnes(this.speciesCounts);
    count += _countOnes(this.subspeciesCounts);
    return count;
  }

  updateForPathSpec(
    pathSpec: TaxonPathSpec,
    speciesName: string | null,
    subspeciesName: string | null
  ): void {
    this._updateForTaxon(
      pathSpec.kingdomName,
      pathSpec.phylumName,
      'kingdomNames',
      'kingdomCounts'
    );
    this._updateForTaxon(
      pathSpec.phylumName,
      pathSpec.className,
      'phylumNames',
      'phylumCounts'
    );
    this._updateForTaxon(
      pathSpec.className,
      pathSpec.orderName,
      'classNames',
      'classCounts'
    );
    this._updateForTaxon(
      pathSpec.orderName,
      pathSpec.familyName,
      'orderNames',
      'orderCounts'
    );
    this._updateForTaxon(
      pathSpec.familyName,
      pathSpec.genusName,
      'familyNames',
      'familyCounts'
    );
    this._updateForTaxon(pathSpec.genusName, speciesName, 'genusNames', 'genusCounts');
    this._updateForTaxon(speciesName, subspeciesName, 'speciesNames', 'speciesCounts');
    this._updateForTaxon(subspeciesName, null, 'subspeciesNames', 'subspeciesCounts');
  }

  protected _setTaxonCounts(
    taxonCounts: string,
    offset: number,
    count: string
  ): string {
    return `${taxonCounts.substring(0, offset)}${count}${taxonCounts.substring(
      offset + 1
    )}`;
  }

  private _updateForTaxon(
    upperTaxon: string | null,
    lowerTaxon: string | null,
    namesFieldName: NamesFieldName,
    countsFieldName: CountsFieldName
  ): void {
    // If the taxon does not occur, there's nothing to update.

    if (upperTaxon !== null) {
      const taxonNames = this.convertToNamesList(namesFieldName);

      // If no taxa of this rank are yet recorded for the this, assign first;
      // otherwise update the existing record.

      if (taxonNames === null) {
        // @ts-ignore
        this[namesFieldName] = upperTaxon;
        // @ts-ignore
        this[countsFieldName] = lowerTaxon === null ? '1' : '0';
      } else {
        const taxonIndex = taxonNames.indexOf(upperTaxon);

        // If the taxon was not previously recorded, append it; otherwise,
        // drop the taxon count for this rank if it's not already 0 and
        // a taxon exists below the rank that will re-up the count.

        if (taxonIndex < 0) {
          // @ts-ignore
          taxonNames.push(upperTaxon);
          // @ts-ignore
          this[countsFieldName] += lowerTaxon === null ? '1' : '0';
        } else if (lowerTaxon !== null) {
          const taxonCounts = this[countsFieldName] as string;
          if (taxonCounts[taxonIndex] == '1') {
            // @ts-ignore
            this[countsFieldName] = this._setTaxonCounts(taxonCounts, taxonIndex, '0');
          }
        }
      }
    }
  }
}

function _countOnes(s: string | null): number {
  if (s === null) return 0;
  // @ts-ignore
  return s.replaceAll('0', '').length;
}

function _toInitialCount(
  upperTaxon: string | null,
  lowerTaxon: string | null
): string | null {
  if (!upperTaxon) return null;
  return upperTaxon && !lowerTaxon ? '1' : '0';
}
