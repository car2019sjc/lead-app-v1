# Lead Finder

Uma aplicação para busca e análise de leads profissionais.

## Tecnologias Utilizadas

- React
- TypeScript
- Vite
- Tailwind CSS
- Apollo API
- Mails API
- OpenAI API

## Configuração do Ambiente

1. Clone o repositório:
```bash
git clone https://github.com/car2019sjc/finder-lead.git
cd finder-lead
```

2. Instale as dependências:
```bash
npm install
```

3. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```
VITE_APOLLO_API_KEY=sua_chave_apollo_aqui
VITE_MAILS_API_KEY=sua_chave_mails_aqui
VITE_OPENAI_API_KEY=sua_chave_openai_aqui
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Funcionalidades

- Busca de leads profissionais
- Validação de emails
- Análise de perfil profissional
- Exportação de dados
- Salvamento de leads

## Estrutura do Projeto

- `/src/components`: Componentes React
- `/src/services`: Serviços de API
- `/src/types`: Definições de tipos TypeScript
- `/src/utils`: Funções utilitárias
- `/src/constants`: Constantes e configurações

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. 