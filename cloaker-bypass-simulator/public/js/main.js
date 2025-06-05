document.addEventListener('DOMContentLoaded', function() {
    // Advanced Options Toggle
    const toggleButton = document.getElementById('toggle-advanced-options');
    const advancedOptionsDiv = document.getElementById('advanced-options');

    if (toggleButton && advancedOptionsDiv) {
        toggleButton.addEventListener('click', function() {
            const isHidden = advancedOptionsDiv.style.display === 'none';
            advancedOptionsDiv.style.display = isHidden ? 'block' : 'none';
            toggleButton.textContent = isHidden ? 'Opções Avançadas ▲' : 'Opções Avançadas ▼';
        });
    }

    // Default values for placeholders (used in original form submission logic)
    const defaultUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/379.0.0.30.112]';
    const defaultReferer = 'https://www.facebook.com/';

    const userAgentInput = document.getElementById('userAgent');
    const refererInput = document.getElementById('referer');

    if (userAgentInput) {
        userAgentInput.placeholder = `Padrão: ${defaultUserAgent.substring(0,50)}...`;
    }
    if (refererInput) {
        refererInput.placeholder = `Padrão: ${defaultReferer}`;
    }

    // Tab Functionality for Simulation Result Section
    const tabLinks = document.querySelectorAll('#simulation-result-section .tab-link');
    const tabContents = document.querySelectorAll('#simulation-result-section .tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const tabId = this.getAttribute('data-tab');

            tabLinks.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));

            this.classList.add('active');
            const activeContent = document.getElementById(tabId);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });

    // Simulation History Functionality
    const historyTableBody = document.getElementById('history-table-body');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageInfoSpan = document.getElementById('page-info');

    let currentPage = 1;
    const limit = 10; // Items per page
    let totalPages = 1;

    async function fetchAndDisplayHistory(page = 1) {
        if (!historyTableBody) return;
        historyTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Carregando histórico...</td></tr>`;

        try {
            const response = await fetch(`/api/simulations?page=${page}&limit=${limit}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();

            historyTableBody.innerHTML = '';

            if (result.data && result.data.length > 0) {
                result.data.forEach(sim => {
                    const row = historyTableBody.insertRow();
                    row.insertCell().textContent = sim.id;

                    const urlCell = row.insertCell();
                    const urlLink = document.createElement('a');
                    urlLink.href = sim.url;
                    urlLink.textContent = sim.url.length > 50 ? sim.url.substring(0, 50) + '...' : sim.url;
                    urlLink.title = sim.url;
                    urlLink.target = '_blank';
                    urlCell.appendChild(urlLink);

                    const statusCell = row.insertCell();
                    const statusBadge = document.createElement('span');
                    statusBadge.classList.add('status-badge');
                    if (sim.status === 'success') {
                        statusBadge.classList.add('status-success');
                        statusBadge.textContent = 'Sucesso';
                    } else if (sim.status === 'failure') {
                        statusBadge.classList.add('status-failure');
                        statusBadge.textContent = 'Falha';
                    } else {
                        statusBadge.classList.add('status-pending');
                        statusBadge.textContent = sim.status || 'Pendente';
                    }
                    statusCell.appendChild(statusBadge);

                    const dateCell = row.insertCell();
                    dateCell.textContent = new Date(sim.timestamp).toLocaleString('pt-BR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                    });

                    const actionsCell = row.insertCell();
                    const viewIcon = document.createElement('a');
                    viewIcon.href = '#';
                    viewIcon.classList.add('action-icon');
                    viewIcon.innerHTML = '👁️';
                    viewIcon.title = 'Visualizar Detalhes';
                    viewIcon.setAttribute('data-simulation-id', sim.id);
                    viewIcon.addEventListener('click', function(e) {
                        e.preventDefault();
                        const simulationId = this.getAttribute('data-simulation-id');
                        loadSimulationDetailsIntoView(simulationId);
                    });
                    actionsCell.appendChild(viewIcon);
                });
            } else {
                historyTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum histórico encontrado.</td></tr>`;
            }

            currentPage = result.page;
            totalPages = result.totalPages;
            if (pageInfoSpan) pageInfoSpan.textContent = `Página ${currentPage} de ${totalPages || 1}`;
            if (prevPageButton) prevPageButton.disabled = currentPage <= 1;
            if (nextPageButton) nextPageButton.disabled = currentPage >= totalPages;

        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            if (historyTableBody) historyTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Erro ao carregar histórico.</td></tr>`;
        }
    }

    if (prevPageButton) {
        prevPageButton.addEventListener('click', () => {
            if (currentPage > 1) {
                fetchAndDisplayHistory(currentPage - 1);
            }
        });
    }

    if (nextPageButton) {
        nextPageButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                fetchAndDisplayHistory(currentPage + 1);
            }
        });
    }

    function loadSimulationDetailsIntoView(simulationId) {
        console.log(`Placeholder: loadSimulationDetailsIntoView ID: ${simulationId}`);
        document.getElementById('simulation-result-section').scrollIntoView({ behavior: 'smooth' });
        const infoTabLink = document.querySelector('.tab-link[data-tab="informacoes-tab"]');
        if (infoTabLink) {
            infoTabLink.click();
        }
    }

    if (document.getElementById('history-table-body')) {
       fetchAndDisplayHistory();
    }

    // New Simulation Form Submission (replaces the one from Step 7 to include history refresh)
    const simulationForm = document.getElementById('new-simulation-form');
    const feedbackDiv = document.getElementById('simulation-feedback');

    if (simulationForm && feedbackDiv) {
        simulationForm.onsubmit = async function(event) {
            event.preventDefault();
            feedbackDiv.style.display = 'none';
            feedbackDiv.textContent = '';
            feedbackDiv.className = 'feedback-message';

            const targetUrl = document.getElementById('targetUrl').value;
            const proxy = document.getElementById('proxy').value;
            let userAgent = document.getElementById('userAgent').value;
            let referer = document.getElementById('referer').value;

            const data = { targetUrl, proxy, userAgent, referer };

            try {
                const response = await fetch('/api/simulate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify(data),
                });
                const result = await response.json();
                if (response.status === 202) {
                    feedbackDiv.textContent = result.message || 'Simulação iniciada com sucesso!';
                    feedbackDiv.classList.add('success');
                    setTimeout(() => { fetchAndDisplayHistory(1); }, 2000);
                } else {
                    feedbackDiv.textContent = result.message || 'Erro ao iniciar simulação.';
                    feedbackDiv.classList.add('error');
                }
            } catch (error) {
                console.error('Fetch error:', error);
                feedbackDiv.textContent = 'Erro de comunicação ao tentar iniciar a simulação.';
                feedbackDiv.classList.add('error');
            }
            feedbackDiv.style.display = 'block';
        };
    }
}); // End of DOMContentLoaded
