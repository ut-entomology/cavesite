import { hslStringToRGBA } from './graphics';

export class ClusterColorSet {
  foreground: string;
  mediumBackground: string;
  lightBackground: string;

  constructor(foregroundHSL: string) {
    this.foreground = foregroundHSL;
    this.mediumBackground = hslStringToRGBA(foregroundHSL, 0.8);
    this.lightBackground = hslStringToRGBA(foregroundHSL, 0.2);
  }
}
