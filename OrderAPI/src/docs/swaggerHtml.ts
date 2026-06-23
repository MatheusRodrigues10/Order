export const swaggerHtml = `<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WA Restaurant — API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; transition: background .3s; }

    .theme-toggle {
      position: fixed; top: 10px; right: 16px; z-index: 9999;
      border: none; border-radius: 20px; padding: 7px 16px;
      cursor: pointer; font-size: 13px; font-weight: 600;
      transition: background .3s, color .3s;
    }

    .swagger-ui .topbar .download-url-wrapper { display: none !important; }

    /* ── LIGHT ───────────────────────────────────────────── */
    [data-theme="light"] body { background: #fafafa; }
    [data-theme="light"] .theme-toggle { background: #333; color: #fff; }
    [data-theme="light"] .theme-toggle:hover { background: #555; }

    /* ── DARK ────────────────────────────────────────────── */
    [data-theme="dark"] body { background: #1a1a1a; }
    [data-theme="dark"] .theme-toggle { background: #e0e0e0; color: #1a1a1a; }
    [data-theme="dark"] .theme-toggle:hover { background: #ccc; }

    [data-theme="dark"] .swagger-ui { background: #1a1a1a; }
    [data-theme="dark"] .swagger-ui .topbar { background: #242424; }
    [data-theme="dark"] .swagger-ui .scheme-container {
      background: #242424; box-shadow: none; border-bottom: 1px solid #333;
    }

    [data-theme="dark"] .swagger-ui,
    [data-theme="dark"] .swagger-ui .info .title,
    [data-theme="dark"] .swagger-ui .info .description,
    [data-theme="dark"] .swagger-ui .info p,
    [data-theme="dark"] .swagger-ui .info li,
    [data-theme="dark"] .swagger-ui .opblock-tag,
    [data-theme="dark"] .swagger-ui .opblock-tag small,
    [data-theme="dark"] .swagger-ui .opblock .opblock-summary-description,
    [data-theme="dark"] .swagger-ui .opblock-description-wrapper p,
    [data-theme="dark"] .swagger-ui .opblock-section-header h4,
    [data-theme="dark"] .swagger-ui .opblock-section-header label,
    [data-theme="dark"] .swagger-ui .response-col_status,
    [data-theme="dark"] .swagger-ui .response-col_description,
    [data-theme="dark"] .swagger-ui .response-col_links,
    [data-theme="dark"] .swagger-ui .responses-inner h4,
    [data-theme="dark"] .swagger-ui .responses-inner h5,
    [data-theme="dark"] .swagger-ui .parameter__name,
    [data-theme="dark"] .swagger-ui .parameter__type,
    [data-theme="dark"] .swagger-ui .parameter__in,
    [data-theme="dark"] .swagger-ui table thead tr td,
    [data-theme="dark"] .swagger-ui table thead tr th,
    [data-theme="dark"] .swagger-ui .tab li,
    [data-theme="dark"] .swagger-ui .btn,
    [data-theme="dark"] .swagger-ui label,
    [data-theme="dark"] .swagger-ui select,
    [data-theme="dark"] .swagger-ui .model-title,
    [data-theme="dark"] .swagger-ui .model,
    [data-theme="dark"] .swagger-ui .model span,
    [data-theme="dark"] .swagger-ui section.models h4,
    [data-theme="dark"] .swagger-ui .prop-type,
    [data-theme="dark"] .swagger-ui .prop-format,
    [data-theme="dark"] .swagger-ui .loading-container .loading::after { color: #d4d4d4 !important; }

    [data-theme="dark"] .swagger-ui a { color: #6cb6ff !important; }

    [data-theme="dark"] .swagger-ui .opblock { border-color: #444; background: transparent; }
    [data-theme="dark"] .swagger-ui .opblock .opblock-summary { border-color: #444; background: transparent; }
    [data-theme="dark"] .swagger-ui .opblock-body { background: #1a1a1a; }
    [data-theme="dark"] .swagger-ui .opblock-section-header { background: #242424; border-color: #333; }

    [data-theme="dark"] .swagger-ui .opblock-body pre.microlight,
    [data-theme="dark"] .swagger-ui .highlight-code,
    [data-theme="dark"] .swagger-ui .example.microlight {
      background: #2a2a2a !important; color: #d4d4d4 !important; border-radius: 4px;
    }

    [data-theme="dark"] .swagger-ui input[type=text],
    [data-theme="dark"] .swagger-ui input[type=password],
    [data-theme="dark"] .swagger-ui input[type=search],
    [data-theme="dark"] .swagger-ui input[type=email],
    [data-theme="dark"] .swagger-ui textarea,
    [data-theme="dark"] .swagger-ui select {
      background: #2a2a2a; color: #d4d4d4; border: 1px solid #555;
    }

    [data-theme="dark"] .swagger-ui table tbody tr td { border-color: #333; }
    [data-theme="dark"] .swagger-ui section.models { border-color: #444; }
    [data-theme="dark"] .swagger-ui section.models .model-container { background: #242424; }

    [data-theme="dark"] .swagger-ui .auth-wrapper .authorize { border-color: #6cb6ff; color: #6cb6ff; }
    [data-theme="dark"] .swagger-ui .authorization__btn { fill: #6cb6ff; }
    [data-theme="dark"] .swagger-ui .dialog-ux .modal-ux { background: #242424; border-color: #444; }
    [data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-header h3,
    [data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-content p,
    [data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-content h4,
    [data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-content label { color: #d4d4d4; }
    [data-theme="dark"] .swagger-ui .dialog-ux .backdrop-ux { background: rgba(0,0,0,.7); }

    [data-theme="dark"] .swagger-ui .btn.execute { background: #4990e2; }
    [data-theme="dark"] .swagger-ui .btn.cancel { border-color: #e06060; color: #e06060; }
    [data-theme="dark"] .swagger-ui .tab li.active { color: #6cb6ff !important; }
    [data-theme="dark"] .swagger-ui .servers > label select { background: #2a2a2a; color: #d4d4d4; border-color: #555; }
  </style>
</head>
<body>
  <button class="theme-toggle" id="themeBtn">☼ Claro</button>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js"></script>
  <script>
    (function() {
      var btn = document.getElementById('themeBtn');
      var saved = localStorage.getItem('swagger-theme') || 'dark';
      apply(saved);

      btn.addEventListener('click', function() {
        var current = document.documentElement.getAttribute('data-theme');
        apply(current === 'dark' ? 'light' : 'dark');
      });

      function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('swagger-theme', theme);
        btn.textContent = theme === 'dark' ? '☀ Claro' : '☾ Escuro';
      }

      window.onload = function() {
        SwaggerUIBundle({
          url: '/docs/swagger.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          plugins: [SwaggerUIBundle.plugins.DownloadUrl],
          layout: 'StandaloneLayout'
        });
      };
    })();
  </script>
</body>
</html>`;
