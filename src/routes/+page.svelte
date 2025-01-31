<script lang="ts">
  import { jsPDF } from 'jspdf';
  import autoTable from 'jspdf-autotable';
  import * as XLSX from 'xlsx';
  import { dataManager } from '$lib/stores/DataManager.svelte';
  import type { Hospital } from '$lib/types';

  async function findNearbyAgencies(hospital: Hospital) {
    const result = {
        hospitalName: hospital.name,
        agencies: [],
        loading: true
    };

    dataManager.addResult(result);

    try {
        const response = await fetch('/api/proximity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hospitalAddress: hospital.address,
                agencies: dataManager.agencies
            })
        });

        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();

        dataManager.addResult({
            hospitalName: hospital.name,
            agencies: data.agencies,
            loading: false
        });
    } catch (err) {
        dataManager.addResult({
            hospitalName: hospital.name,
            agencies: [],
            loading: false,
            error: 'Error finding nearby agencies'
        });
    }
}

  async function checkAllHospitals() {
      dataManager.checkingAll = true;
      dataManager.results = [];

      for (const hospital of dataManager.hospitals) {
          await findNearbyAgencies(hospital);
      }

      dataManager.checkingAll = false;
  }

  function handleHospitalFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const hospitalSheet = workbook.Sheets[workbook.SheetNames[0]];

            const rawData = XLSX.utils.sheet_to_json<any>(hospitalSheet);
            const mappedData = rawData.map(row => ({
                name: row['SITE'],
                address: row['ADRESSE']
            }));

            dataManager.hospitals = mappedData;
        };
        reader.readAsArrayBuffer(file);
    }
  }

  function handleAgencyFileUpload(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const agencySheet = workbook.Sheets[workbook.SheetNames[0]];

              const rawData = XLSX.utils.sheet_to_json<any>(agencySheet);
              const mappedData = rawData.map(row => ({
                  name: row['Nom'],
                  address: row['Adresse'],
              }));

              dataManager.agencies = mappedData;
          };
          reader.readAsArrayBuffer(file);
      }
  }

  function generatePDF() {
      const doc = new jsPDF();

      doc.text('Résultats des Agences Proches des Ehpads', 10, 10);

      const tableData = dataManager.results.map(result => [
          result.hospitalName,
          result.agencies.length > 0
              ? result.agencies.join(', ')
              : result.error ? 'Erreur' : 'Aucune agence trouvée'
      ]);

      autoTable(doc, {
          head: [['Ehpad', 'Agences à proximité (1h30)']],
          body: tableData,
          startY: 20,
      });

      doc.save('resultats.pdf');
  }

  function generateExcel() {
      const data = dataManager.results.map(result => ({
          "Ehpad": result.hospitalName,
          "Agences à proximité (1h30)": result.agencies.length > 0
              ? result.agencies.join(', ')
              : result.error ? 'Erreur ❌' : 'Aucune agence trouvée ⚠️'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Résultats");

      XLSX.writeFile(wb, "resultats.xlsx");
  }
</script>

<section class="container">
  <header class="header">
      <h1 class="container__title">Heliaq</h1>
      <strong class="container__subtitle">Outil permettant de connaitre les agences à proximité des Ehpad.</strong>
  </header>

  <menu class="controls">
    <li>
      <div class="file-inputs">
        <div class="file-input-group">
          <label for="hospital-file">Fichier des Ehpads:</label>
          <input
            id="hospital-file"
            type="file"
            accept=".xlsx"
            onchange={handleHospitalFileUpload}
            class="file-input"
          />
        </div>
        <div class="file-input-group">
          <label for="agency-file">Fichier des Agences:</label>
          <input
            id="agency-file"
            type="file"
            accept=".xlsx"
            onchange={handleAgencyFileUpload}
            class="file-input"
          />
        </div>
      </div>
    </li>
      <li class="controls__main">
          <select
              onchange={(e) => findNearbyAgencies(dataManager.hospitals[e.currentTarget.selectedIndex])}
              disabled={dataManager.checkingAll}>
              <option value="" disabled selected>Selectionner un Ehpad</option>
              {#each dataManager.hospitals as hospital}
                  <option value={hospital.name}>{hospital.name}</option>
              {/each}
          </select>
      </li>
      <li>
          <button
              onclick={checkAllHospitals}
              disabled={dataManager.checkingAll}
              class="check-all-btn">
              {dataManager.checkingAll ? 'Vérification en cours...' : 'Vérifier tous les Ehpads'}
          </button>
      </li>
      <li>
          <button
              onclick={generatePDF}
              class="check-all-btn"
              disabled={dataManager.results.length === 0}>
              Télécharger le PDF
          </button>
      </li>
      <li>
          <button
              onclick={generateExcel}
              class="check-all-btn"
              disabled={dataManager.results.length === 0}>
              Télécharger le Excel
          </button>
      </li>
  </menu>

  <div class="content">
      {#if dataManager.results.length > 0}
          <div class="results-table">
              <table>
                  <thead>
                      <tr>
                          <th>Ehpad</th>
                          <th>Agences à proximité (1h30)</th>
                          <th>Status</th>
                      </tr>
                  </thead>
                  <tbody>
                      {#each dataManager.results as result}
                          <tr>
                              <td>{result.hospitalName}</td>
                              <td>
                                  {#if result.loading}
                                      <span class="loading">Chargement...</span>
                                  {:else if result.error}
                                      <span class="error">{result.error}</span>
                                  {:else if result.agencies.length === 0}
                                      <span class="no-results">Aucune agence trouvée</span>
                                  {:else}
                                      <ul>
                                          {#each result.agencies as agency}
                                              <li>{agency}</li>
                                          {/each}
                                      </ul>
                                  {/if}
                              </td>
                              <td>
                                  {#if result.loading}
                                      <span class="status loading">⏳</span>
                                  {:else if result.error}
                                      <span class="status error">❌</span>
                                  {:else if result.agencies.length === 0}
                                      <span class="status warning">⚠️</span>
                                  {:else}
                                      <span class="status success">✅</span>
                                  {/if}
                              </td>
                          </tr>
                      {/each}
                  </tbody>
              </table>
          </div>
      {:else}
          <strong class="no_content">Sélectionnez un Ehpad ou cliquez sur "Vérifier tous les Ehpads" pour commencer.</strong>
      {/if}
  </div>
</section>


<style>
  .container {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      margin: auto;
      width: 100%;
      min-height: 100vh;
      color: rgb(140, 136, 149);
  }

  .container__title {
      font-size: 3rem;
      font-weight: 700;
      text-transform: uppercase;
      color: rgb(52, 25, 127);
  }

  .container__subtitle {
      font-weight: 400;
  }

  .controls {
      display: flex;
      gap: 1rem;
      margin: 2rem 0;
      width: 100%;
      flex-wrap: wrap;
  }

  .controls__main {
      flex: 2;
  }

  .check-all-btn {
      padding: 0.5rem 1rem;
      background-color: rgb(52, 25, 127);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
  }

  .check-all-btn:disabled {
      background-color: #ccc;
      cursor: not-allowed;
  }

  select {
      min-width: 200px;
      cursor: pointer;
  }

  .content {
      display: flex;
      flex: 1;
  }

  .no_content {
      margin: auto;
      color: rgb(174, 168, 189);
      font-weight: 300;
      font-size: 0.85rem;
  }

  .results-table {
      margin-top: 2rem;
      overflow-x: auto;
      width: 100%;
  }

  table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
  }

  th, td {
      padding: 1rem;
      border: 1px solid #ddd;
      text-align: left;
  }

  th {
      background-color: #f5f5f5;
  }

  ul {
      list-style-type: none;
      padding: 0;
      margin: 0;
  }

  li {
      padding: 0.25rem 0;
  }

  .file-input {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
  }

  .error {
      color: #dc3545;
  }

  .loading {
      color: rgb(52, 25, 127);
  }

  .no-results {
      color: #ffc107;
  }

  .status {
      font-size: 1.2rem;
  }

  .file-inputs {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .file-input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-input-group label {
    font-weight: 500;
  }
</style>
