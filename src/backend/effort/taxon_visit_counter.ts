import type { DataOf } from '../../shared/data_of';
import {
  type TaxonCounterData,
  type NamesFieldName,
  type CountsFieldName,
  TaxonCounter
} from '../../shared/taxon_counter';

export type TaxonVisitCounterData = DataOf<TaxonVisitCounter>;

type VisitsFieldName = keyof Pick<
  TaxonVisitCounterData,
  | 'kingdomVisits'
  | 'phylumVisits'
  | 'classVisits'
  | 'orderVisits'
  | 'familyVisits'
  | 'genusVisits'
  | 'speciesVisits'
  | 'subspeciesVisits'
>;

export class TaxonVisitCounter extends TaxonCounter {
  kingdomVisits: string | number[];
  phylumVisits: string | number[];
  classVisits: string | number[];
  orderVisits: string | number[];
  familyVisits: string | number[];
  genusVisits: string | number[];
  speciesVisits: string | number[];
  subspeciesVisits: string | number[];

  constructor(data: TaxonVisitCounterData) {
    super(data);
    this.kingdomVisits = data.kingdomVisits;
    this.phylumVisits = data.phylumVisits;
    this.classVisits = data.classVisits;
    this.orderVisits = data.orderVisits;
    this.familyVisits = data.familyVisits;
    this.genusVisits = data.genusVisits;
    this.speciesVisits = data.speciesVisits;
    this.subspeciesVisits = data.subspeciesVisits;
  }

  static addInitialVisits<T>(
    obj: T,
    taxonCounter: TaxonCounterData
  ): T & { [K in VisitsFieldName]: number[] } {
    const anyObj: T & { [K in VisitsFieldName]: number[] } = obj as any;
    anyObj.kingdomVisits = taxonCounter.kingdomNames ? [1] : [0];
    anyObj.phylumVisits = taxonCounter.phylumNames ? [1] : [0];
    anyObj.classVisits = taxonCounter.classNames ? [1] : [0];
    anyObj.orderVisits = taxonCounter.orderNames ? [1] : [0];
    anyObj.familyVisits = taxonCounter.familyNames ? [1] : [0];
    anyObj.genusVisits = taxonCounter.genusNames ? [1] : [0];
    anyObj.speciesVisits = taxonCounter.subspeciesCounts ? [1] : [0];
    anyObj.subspeciesVisits = taxonCounter.subspeciesNames ? [1] : [0];
    return anyObj;
  }

  static toVisitsSeries(visits: number[] | string): string {
    return typeof visits == 'string' ? visits : visits.join(',');
  }

  convertToVisitsList(visitsFieldName: VisitsFieldName): number[] {
    const visits = this[visitsFieldName];
    if (Array.isArray(visits)) return visits;
    const visitsList = visits.split(',').map((str) => parseInt(str));
    this[visitsFieldName] = visitsList;
    return visitsList;
  }

  mergeCounter(otherCounter: TaxonCounter): void {
    // merges TaxonCounters, not TaxonVisitCounters
    this._mergeTaxa(otherCounter, 'kingdomNames', 'kingdomCounts', 'kingdomVisits');
    this._mergeTaxa(otherCounter, 'phylumNames', 'phylumCounts', 'phylumVisits');
    this._mergeTaxa(otherCounter, 'classNames', 'classCounts', 'classVisits');
    this._mergeTaxa(otherCounter, 'orderNames', 'orderCounts', 'orderVisits');
    this._mergeTaxa(otherCounter, 'familyNames', 'familyCounts', 'familyVisits');
    this._mergeTaxa(otherCounter, 'genusNames', 'genusCounts', 'genusVisits');
    this._mergeTaxa(otherCounter, 'speciesNames', 'speciesCounts', 'speciesVisits');
    this._mergeTaxa(
      otherCounter,
      'subspeciesNames',
      'subspeciesCounts',
      'subspeciesVisits'
    );
  }

  private _mergeTaxa(
    otherCounter: TaxonCounter,
    namesFieldName: NamesFieldName,
    countsFieldName: CountsFieldName,
    visitsFieldName: VisitsFieldName
  ): void {
    const otherTaxa = otherCounter.convertToNamesList(namesFieldName);

    // Only merge counter values when they exist for the taxon.

    if (otherTaxa !== null) {
      const taxa = this.convertToNamesList(namesFieldName);

      // If this counter doesn't currently represent the other's taxon, copy over
      // the other's values for the taxon; otherwise, merge the other's values.

      if (taxa === null) {
        this[namesFieldName] = otherTaxa;
        this[countsFieldName] = otherCounter[countsFieldName]!;
        this[visitsFieldName] = [1]; // this should be redundant
      } else {
        const visits = this.convertToVisitsList(visitsFieldName);
        const otherCounts = otherCounter[countsFieldName]!;

        // Separately merge each of the other taxa.

        for (let otherIndex = 0; otherIndex < otherTaxa.length; ++otherIndex) {
          const otherTaxon = otherTaxa[otherIndex];
          const thisIndex = taxa.indexOf(otherTaxon);

          if (otherCounts[otherIndex] == '0') {
            // When the other's count is 0, a lower taxon of the other counter
            // provides more specificity, so this counter must indicate a 0
            // count for the taxon.

            if (thisIndex < 0) {
              taxa.push(otherTaxon);
              this[countsFieldName] += '0';
              visits.push(1);
            } else {
              const taxonCounts = this[countsFieldName]!;
              if (taxonCounts[thisIndex] == '1') {
                this[countsFieldName] = this._setTaxonCounts(
                  taxonCounts,
                  thisIndex,
                  '0'
                );
              }
              ++visits[thisIndex];
            }
          } else {
            // When the other's count is 1, the other provides no more specificity,
            // so the this counter must indicate a 1 if a tally isn't already present.

            if (thisIndex < 0) {
              taxa.push(otherTaxon);
              this[countsFieldName] += '1';
              visits.push(1);
            } else {
              ++visits[thisIndex];
            }
          }
        }
      }
    }
  }
}
