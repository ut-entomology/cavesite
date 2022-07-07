import type { DataOf } from './data_of';
import { type TaxonPathSpec } from './model';

export type TaxonCounterData = DataOf<TaxonCounter>;

export class TaxonCounter {
  kingdomNames: string;
  kingdomCounts: string;
  phylumNames: string | null;
  phylumCounts: string | null;
  classNames: string | null;
  classCounts: string | null;
  orderNames: string | null;
  orderCounts: string | null;
  familyNames: string | null;
  familyCounts: string | null;
  genusNames: string | null;
  genusCounts: string | null;
  speciesNames: string | null;
  speciesCounts: string | null;
  subspeciesNames: string | null;
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

  private _updateForTaxon(
    upperTaxon: string | null,
    lowerTaxon: string | null,
    namesField: keyof TaxonCounter,
    countsField: keyof TaxonCounter
  ): void {
    // If the taxon does not occur, there's nothing to update.

    if (upperTaxon !== null) {
      let taxonNameSeries = this[namesField] as string | null;

      // If no taxa of this rank are yet recorded for the this, assign first;
      // otherwise update the existing record.

      if (taxonNameSeries === null) {
        // @ts-ignore
        this[namesField] = upperTaxon;
        // @ts-ignore
        this[countsField] = lowerTaxon === null ? '1' : '0';
      } else {
        const taxonNames = taxonNameSeries.split('|');
        const taxonIndex = taxonNames.indexOf(upperTaxon);

        // If the taxon was not previously recorded, append it; otherwise,
        // drop the taxon count for this rank if it's not already 0 and
        // a taxon exists below the rank that will re-up the count.

        if (taxonIndex < 0) {
          // @ts-ignore
          this[namesField] += '|' + upperTaxon;
          // @ts-ignore
          this[countsField] += lowerTaxon === null ? '1' : '0';
        } else if (lowerTaxon !== null) {
          const taxonCounts = this[countsField] as string;
          if (taxonCounts[taxonIndex] == '1') {
            // @ts-ignore
            this[countsField] = setTaxonCounts(taxonCounts, taxonIndex, '0');
          }
        }
      }
    }
  }
}

export function setTaxonCounts(
  taxonCounts: string,
  offset: number,
  count: string
): string {
  return `${taxonCounts.substring(0, offset)}${count}${taxonCounts.substring(
    offset + 1
  )}`;
}

function _toInitialCount(
  upperTaxon: string | null,
  lowerTaxon: string | null
): string | null {
  if (!upperTaxon) return null;
  return upperTaxon && !lowerTaxon ? '1' : '0';
}
