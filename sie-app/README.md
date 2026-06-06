# SIE Study App

Aplicatie web pentru invatare la materia **Sisteme de Intrare/Iesire si Echipamente Periferice (SIE)**, construita pentru colegii de la facultate.

Include:
- intrebari deschise (partial, examen, complet)
- simulare de grile cu corectare automata
- filtrare pe capitole pentru grile si intrebari deschise
- salvare automata a statisticilor de simulare in fisier text

## Demo functionalitati

- **Tab Intrebari Deschise**
  - navigare intre intrebari
  - filtrare pe capitol
  - afisare sursa + continut formatat Markdown

- **Tab Simulare Grile**
  - 10 intrebari random pe sesiune
  - verificare raspuns per intrebare
  - rezultat final cu scor total
  - detalii pe capitole in review
  - filtrare pe capitole

- **Statistici automate**
  - conectezi un fisier `.txt` din UI
  - la `Finalizeaza`, aplicatia adauga automat o intrare noua

## Stack tehnic

- React 19
- TypeScript
- Vite
- React Markdown (`react-markdown` + `remark-gfm`)

## Cerinte

- Node.js (recomandat: versiune LTS recenta)
- npm

## Instalare si rulare locala

```bash
npm install
npm run dev
```

Aplicatia porneste, in mod normal, pe un URL local de tip `http://localhost:5173`.

## Build productie

```bash
npm run build
npm run preview
```

## Structura proiect (pe scurt)

```text
sie-app/
  public/
    grile.json
    grile2.json
    intrebari-deschise-partial.json
    intrebari-deschise-examen.json
  src/
    components/
      GrileCard.tsx
      QuestionCard.tsx
    data/
      questions.ts
    App.tsx
```

## Format date

### Grile
Fiecare intrebare de grila are campuri precum:

```json
{
  "id": 1,
  "question": "...",
  "answers": ["..."],
  "correctAnswers": ["..."],
  "chapter": "Magistrale si interconectare"
}
```

### Intrebari deschise
Fiecare intrebare deschisa are campuri precum:

```json
{
  "id": 1,
  "title": "...",
  "source": "...",
  "content": "...",
  "chapter": "Intreruperi"
}
```

`chapter` este optional in JSON-urile de intrebari deschise; daca lipseste, aplicatia incearca sa il deduca automat.

## Salvare statistici in fisier text

In aplicatie:
1. apasa `Conecteaza statistici`
2. alege fisierul `statistici-grile.txt` (sau alt `.txt`)
3. finalizeaza o simulare de grile
4. intrarea este adaugata automat in fisier

Observatie:
- scrierea directa in fisier foloseste File System Access API, disponibil in unele browsere Chromium (ex. Chrome/Edge)
- in alte browsere, aceasta functionalitate poate lipsi sau poate avea restrictii

## Publicare pentru colegi

Pentru a publica rapid aplicatia:
- Vercel
- Netlify
- GitHub Pages (cu configurare Vite pentru `base`)

Daca vrei deploy static simplu, foloseste continutul din `dist/` dupa `npm run build`.

## Contributii

PR-urile sunt binevenite pentru:
- corectii de continut
- completari de capitole
- imbunatatiri UI/UX
- optimizare a logicii de simulare

## Disclaimer

Aplicatia este facuta pentru invatare. Verificati intotdeauna informatia cu materialele oficiale de curs/seminar.

