import type { Agency, AgencyResult, Hospital } from '$lib/types';

export class DataManager {
  public hospitals: Hospital[] = $state([]);
  public agencies: Agency[] = $state([]);
  public results: AgencyResult[] = $state([]);
  public checkingAll: boolean = $state(false);

  public addResult = (result: AgencyResult) => {
    const index = this.results.findIndex(r => r.hospitalName === result.hospitalName);
    if (index === -1) {
      this.results.push(result);
    } else {
      this.results[index] = result;
    }
  };
}

export const dataManager = new DataManager();
