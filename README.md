# Gestão de Obras SaaS

Site do sistema (front-end). O banco de dados e as funções de servidor ficam no Supabase.

- Configuração: `config.js` (URL e chave **pública** anon do Supabase — nunca a service_role).
- Publicação: GitHub Pages (testes/demonstração). Para uso comercial, publique esta mesma pasta no Netlify.

## Publicar uma atualização
1. Rode `python3 ferramentas/versionar.py` (marca todos os arquivos com uma nova versão, para os navegadores baixarem a atualização completa).
2. Envie os arquivos para o GitHub (ou arraste a pasta para o Netlify).
