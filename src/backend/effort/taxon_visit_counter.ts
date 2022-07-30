import type { DataOf } from '../../shared/data_of';
import { MAX_VISITS_DOCKED } from '../../shared/model';
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

type WithNewFields<T> = T & Omit<TaxonVisitCounter, keyof TaxonCounter>;

export class TaxonVisitCounter extends TaxonCounter {
  kingdomVisits: string | number[] | null;
  phylumVisits: string | number[] | null;
  classVisits: string | number[] | null;
  orderVisits: string | number[] | null;
  familyVisits: string | number[] | null;
  genusVisits: string | number[] | null;
  speciesVisits: string | number[] | null;
  subspeciesVisits: string | number[] | null;
  recentTaxa: string | string[];

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
    this.recentTaxa = data.recentTaxa;
  }

  static addInitialVisits<T>(obj: T, taxonCounter: TaxonCounterData): WithNewFields<T> {
    const anyObj: WithNewFields<T> = obj as any;
    const allNames: string[] = [];
    anyObj.kingdomVisits = _toInitialVisits(taxonCounter.kingdomNames, allNames);
    anyObj.phylumVisits = _toInitialVisits(taxonCounter.phylumNames, allNames);
    anyObj.classVisits = _toInitialVisits(taxonCounter.classNames, allNames);
    anyObj.orderVisits = _toInitialVisits(taxonCounter.orderNames, allNames);
    anyObj.familyVisits = _toInitialVisits(taxonCounter.familyNames, allNames);
    anyObj.genusVisits = _toInitialVisits(taxonCounter.genusNames, allNames);
    anyObj.speciesVisits = _toInitialVisits(taxonCounter.speciesNames, allNames);
    anyObj.subspeciesVisits = _toInitialVisits(taxonCounter.subspeciesNames, allNames);
    anyObj.recentTaxa = allNames.join('|');
    return anyObj;
  }

  static toVisitsList(visits: number[] | string | null): number[] | null {
    if (visits === null || Array.isArray(visits)) return visits;
    return visits.split(',').map((str) => parseInt(str));
  }

  static toVisitsSeries(visits: number[] | string | null): string | null {
    if (visits === null) return null;
    return typeof visits == 'string' ? visits : visits.join(',');
  }

  static toRecentTaxaSeries(taxa: string[] | string): string {
    return typeof taxa == 'string' ? taxa : taxa.join('#');
  }

  convertToVisitsList(visitsFieldName: VisitsFieldName): number[] | null {
    const visitsList = TaxonVisitCounter.toVisitsList(this[visitsFieldName]);
    if (visitsList === null) return null;
    this[visitsFieldName] = visitsList;
    return visitsList;
  }

  mergeCounter(otherCounter: TaxonCounter): void {
    // merges TaxonCounters, not TaxonVisitCounters

    if (this.recentTaxa === null) {
      this.recentTaxa = [''];
    } else {
      if (typeof this.recentTaxa == 'string') {
        this.recentTaxa = this.recentTaxa.split('#');
      }
      this.recentTaxa.push('');
      if (this.recentTaxa.length > MAX_VISITS_DOCKED) {
        this.recentTaxa.shift();
      }
    }

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

  private _trackNewTaxon(taxon: string): void {
    // caller guarantees we have an array of strings
    const recentTaxa = this.recentTaxa as string[];
    const lastIndex = recentTaxa.length - 1;
    if (recentTaxa[lastIndex] == '') {
      recentTaxa[lastIndex] = taxon;
    } else {
      recentTaxa[lastIndex] += '|' + taxon;
    }
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
        this[namesFieldName] = otherTaxa.slice();
        this[countsFieldName] = otherCounter[countsFieldName]!;
        this[visitsFieldName] = otherTaxa.map((_) => 1);
        this._trackNewTaxon(otherTaxa.join('|'));
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
              this._trackNewTaxon(otherTaxon);
              this[countsFieldName] += '0';
              visits!.push(1);
            } else {
              const taxonCounts = this[countsFieldName]!;
              if (taxonCounts[thisIndex] == '1') {
                this[countsFieldName] = this._setTaxonCounts(
                  taxonCounts,
                  thisIndex,
                  '0'
                );
              }
              ++visits![thisIndex];
            }
          } else {
            // When the other's count is 1, the other provides no more specificity,
            // so the this counter must indicate a 1 if a tally isn't already present.

            if (thisIndex < 0) {
              taxa.push(otherTaxon);
              this._trackNewTaxon(otherTaxon);
              this[countsFieldName] += '1';
              visits!.push(1);
            } else {
              ++visits![thisIndex];
            }
          }
        }
      }
    }
  }
}

function _toInitialVisits(
  names: string[] | string | null,
  allNames: string[]
): number[] | null {
  if (names === null) return null;
  if (typeof names == 'string') names = names.split('|');
  allNames.push(...names);
  return names.map((_) => 1);
}
