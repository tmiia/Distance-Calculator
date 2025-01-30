<script lang="ts">
    import { jsPDF } from 'jspdf';
    import autoTable from 'jspdf-autotable';
    import * as XLSX from 'xlsx';
    import { hospitals, type Hospital } from '$lib/data/ehpad';

    interface AgencyResult {
        hospitalName: string;
        agencies: string[];
        loading?: boolean;
        error?: string;
    }

    let results: AgencyResult[] = [];
    let checkingAll = false;

    async function findNearbyAgencies(hospital: Hospital) {
        const resultIndex = results.findIndex(r => r.hospitalName === hospital.name);
        const result: AgencyResult = {
            hospitalName: hospital.name,
            agencies: [],
            loading: true
        };

        if (resultIndex === -1) {
            results = [...results, result];
        } else {
            results[resultIndex] = result;
            results = [...results];
        }

        try {
            const response = await fetch('/api/proximity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hospitalAddress: hospital.address
                })
            });

            if (!response.ok) throw new Error('Failed to fetch nearby agencies');

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const updatedResult = {
                hospitalName: hospital.name,
                agencies: data.agencies,
                loading: false
            };

            const index = results.findIndex(r => r.hospitalName === hospital.name);
            if (index !== -1) {
                results[index] = updatedResult;
                results = [...results];
            }
        } catch (err) {
            const errorResult = {
                hospitalName: hospital.name,
                agencies: [],
                loading: false,
                error: 'Error finding nearby agencies'
            };

            const index = results.findIndex(r => r.hospitalName === hospital.name);
            if (index !== -1) {
                results[index] = errorResult;
                results = [...results];
            }
            console.error(err);
        }
    }

    async function checkAllHospitals() {
        checkingAll = true;
        results = [];

        for (const hospital of hospitals) {
            await findNearbyAgencies(hospital);
        }

        checkingAll = false;
    }

    function generatePDF() {
        const doc = new jsPDF();

        doc.text('Résultats des Agences Proches des Ehpads', 10, 10);

        const tableData = results.map(result => [
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
    const data = results.map(result => ({
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
      <li class="controls__main">
        <select onchange={(e) => findNearbyAgencies(hospitals[e.currentTarget.selectedIndex])}
                disabled={checkingAll}>
            <option value="" disabled selected>Selectionner un Ehpad</option>
            {#each hospitals as hospital}
                <option value={hospital.name}>{hospital.name}</option>
            {/each}
        </select>
      </li>
      <li>
        <button
            onclick={checkAllHospitals}
            disabled={checkingAll}
            class="check-all-btn">
            {checkingAll ? 'Vérification en cours...' : 'Vérifier tous les Ehpads'}
        </button>
      </li>
      <li>
        <button
            onclick={generatePDF}
            class="check-all-btn"
            disabled={results.length === 0}>
          Télécharger le PDF
        </button>
      </li>
      <li>
        <button
            onclick={generateExcel}
            class="check-all-btn"
            disabled={results.length === 0}>
          Télécharger le Excel
        </button>
      </li>
    </menu>

    <div class="content">
      {#if results.length > 0}
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
                      {#each results as result}
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
</style>
