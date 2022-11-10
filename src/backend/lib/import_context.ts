import { GbifCorrectionsData } from './gbif_corrections';
import { AquaticKarstData, TerrestrialKarstData } from './karst_localities';
import { StygobiteData, TroglobiteData } from './karst_obligates';
import { FederalSpeciesStatusData, TexasSpeciesStatusData } from './species_status';

export class ImportContext {
  gbifCorrectionsData: GbifCorrectionsData;
  aquaticKarstData: AquaticKarstData;
  terrestrialKarstData: TerrestrialKarstData;
  stygobiteData: StygobiteData;
  troglobiteData: TroglobiteData;
  federalSpeciesStatusData: FederalSpeciesStatusData;
  texasSpeciesStatusData: TexasSpeciesStatusData;

  constructor() {
    this.gbifCorrectionsData = new GbifCorrectionsData();
    this.aquaticKarstData = new AquaticKarstData();
    this.terrestrialKarstData = new TerrestrialKarstData();
    this.stygobiteData = new StygobiteData();
    this.troglobiteData = new TroglobiteData();
    this.federalSpeciesStatusData = new FederalSpeciesStatusData();
    this.texasSpeciesStatusData = new TexasSpeciesStatusData();
  }
}
