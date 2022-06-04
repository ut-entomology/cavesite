export interface JstatModel {
  coef: number[];
  R2: number;
  t: { p: number[] };
  f: { pvalue: number };
}

export interface RegressionModel {
  name: string;
  jstat: JstatModel;
  rmse: number;
  color: string;
  html: string;
}
