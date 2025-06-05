# 📂 Projeto: Simulador de Ambiente para Bypass de Cloaker

Este projeto simula o ambiente de um usuário legítimo (navegador móvel via app do Facebook) acessando um link, com o objetivo de capturar o HTML da página de destino real, potencialmente escondida por sistemas de cloaking.

> ⚠️ **Uso Ético:** Este sistema foi desenvolvido para fins **educacionais, de auditoria e pesquisa de segurança**. A utilização para contornar sistemas de cloaking sem autorização explícita, clonar páginas, espionar concorrentes de forma antiética ou fraudar sistemas de anúncios é **ilegal e antiética**. Use com responsabilidade e em conformidade com as leis locais e políticas de privacidade.

---

## ✅ Funcionalidades Implementadas

- Simula um navegador móvel (iPhone) acessando via app do Facebook.
- Utiliza `puppeteer-extra` com `puppeteer-extra-plugin-stealth` para dificultar a detecção.
- Configura User-Agent e Referer específicos (via `config.js`).
- Suporta o uso de proxy residencial/4G (configurável via `config.js` ou `.env` - atualmente `config.js` is primary).
- **Captura de HTML:** Salva o HTML final da página em um arquivo único com timestamp em `logs/page_<hostname>_<timestamp>.html`.
- **Captura de Screenshot:** Salva uma screenshot da página final em `logs/screenshots/screenshot_<hostname>_<timestamp>.png`.
- **Registro de Logs em JSON:** Registra logs detalhados de cada execução em `logs/page_logs.json` (timestamp, URL, status, proxy, caminhos para HTML/screenshot, erros).
- **Registro de Logs em Banco de Dados:** Armazena um resumo de cada captura em um banco de dados SQLite em `logs/capture_history.sqlite`.

---

## 🔧 Instalação e Configuração

1.  **Pré-requisitos:**
    *   Node.js (versão 16 ou superior recomendada)
    *   npm (geralmente incluído com o Node.js)

2.  **Clonar/Baixar o Projeto:**
    *   Descompacte o arquivo ZIP do projeto ou clone o repositório.

3.  **Instalar Dependências:**
    ```bash
    cd cloaker-bypass-simulator
    npm install
    ```

4.  **Configurar Proxy (Opcional, mas recomendado):**
    *   Edite o arquivo `config.js` e modifique a entrada `proxy`:
      ```js
      module.exports = {
        proxy: 'http://usuario:senha@proxy.example.com:8080', // SEU_PROXY_URL_AQUI
        // ... outras configs
      };
      ```
    *   Se você não configurar um proxy válido, o script acessará a URL diretamente, o que pode ser facilmente detectado. O proxy padrão no `config.js` é um placeholder e não funcionará.

5.  **Ajustar Configurações (Opcional):**
    *   Você pode modificar o User-Agent, Referer padrão e timeout no arquivo `config.js`.

---

## 🚀 Uso

Execute o script a partir do diretório raiz do projeto, fornecendo a URL de destino como argumento:

```bash
node index.js <URL_ALVO>
```

**Exemplo:**
```bash
node index.js "https://l.facebook.com/l.php?..."
```

O script irá:
- Iniciar o Puppeteer (com proxy, se configurado).
- Navegar até a URL fornecida.
- Capturar o HTML e uma screenshot da página final.
- Salvar o HTML em `logs/page_<hostname>_<timestamp>.html`.
- Salvar a screenshot em `logs/screenshots/screenshot_<hostname>_<timestamp>.png`.
- Adicionar uma entrada de log em `logs/page_logs.json`.
- Adicionar uma entrada de log no banco de dados `logs/capture_history.sqlite`.

---

## 📁 Estrutura do Projeto Atualizada

```
cloaker-bypass-simulator/
├── index.js                     # Script principal
├── config.js                    # Configurações (User-Agent, Referer, Timeout, Proxy)
├── utils/
│   ├── headers.js               # Função para gerar cabeçalhos HTTP (atualmente não usada diretamente por index.js)
│   └── database.js              # Utilitários para o banco de dados SQLite
├── logs/
│   ├── page_<hostname>_<timestamp>.html  # HTMLs capturados
│   ├── screenshots/
│   │   └── screenshot_<hostname>_<timestamp>.png # Screenshots capturadas
│   ├── page_logs.json           # Histórico de logs em JSON
│   └── capture_history.sqlite   # Banco de dados SQLite com histórico de capturas
├── proxies/
│   └── active_proxies.txt       # (Não utilizado atualmente, pode ser usado para listas)
├── node_modules/                # Dependências instaladas
├── package.json                 # Definições do projeto e dependências
├── package-lock.json            # Lockfile de dependências
├── README.md                    # Este arquivo
└── .env                         # Variáveis de ambiente (atualmente não usado diretamente por index.js para proxy)
```

---

## 📊 Acessando os Dados Capturados

*   **HTML:** Arquivos individuais em `logs/`.
*   **Screenshots:** Arquivos PNG em `logs/screenshots/`.
*   **Logs JSON:** O arquivo `logs/page_logs.json` contém um array de objetos JSON, um para cada tentativa.
*   **Banco de Dados SQLite:**
    *   Arquivo: `logs/capture_history.sqlite`
    *   Tabela: `captured_pages`
    *   Colunas: `id`, `timestamp`, `url`, `status`, `proxy_used`, `error_message`, `html_content_path`, `screenshot_path`.
    *   Você pode usar qualquer ferramenta de visualização SQLite (DB Browser for SQLite, DBeaver, etc.) para abrir e consultar este arquivo.

---

## 📌 Possíveis Próximos Passos (Não implementados)

- Detecção de redirecionamentos em cadeia.
- Dashboard para visualização.
- Integração com webhooks.
- Melhorar o uso do `.env` para configuração de proxy.
- Rotação de proxies de `proxies/active_proxies.txt`.

---

## 🛡️ Reforço legal
Este projeto é para **pesquisa e segurança**. Nunca utilize para:
- Clonar páginas sem permissão
- Espionar concorrência de forma antiética
- Fraudar sistemas de ads

---
