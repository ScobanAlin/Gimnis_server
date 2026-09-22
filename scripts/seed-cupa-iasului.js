// scripts/seed-cupa-iasului.js
// Loads the REAL official start list for "Cupa Iasului" 2026 (26-27 Sept 2026)
// transcribed from the organizer's "Categoria A Final_22.09.2026.pdf" desfasurator.
//
// This WIPES all 7 tables (judges included) and loads only competitors +
// competitor_members that appear in the document. No scores/validations/vote/show
// are inserted because the competition has not happened yet.
//
// The document has no email/exact age/explicit sex per athlete, so:
//  - email is generated as firstname.lastname<n>@example.com
//  - age is randomized within the bracket stated in the event name
//    (Kids Development 7-8, National Development 9-11, Youth 12-14, Juniors 15-17)
//  - sex is set per athlete based on the event listing (Individual Feminin/Masculin
//    sections) or inferred from given name for Mixed Pair/Trio/Group/Aerobic Dance
//    entries, cross-checked against the Individual Men/Women lists where the same
//    athlete appears in both.
//
// Usage: node scripts/seed-cupa-iasului.js --reset

require("dotenv/config");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
    });

const RESET = process.argv.includes("--reset");

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function slug(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function ageRangeFor(category) {
  if (category.includes("Kids Development")) return [7, 8];
  if (category.includes("National Development")) return [9, 11];
  if (category.includes("Youth")) return [12, 14];
  if (category.includes("Juniors")) return [15, 17];
  return [10, 17];
}

// Official club registry (page 1 of the desfasurator) -> normalize every
// abbreviation used across the event tables to this canonical name.
const CLUB_MAP = {
  "CSM ARAD": "CLUB SPORTIV MUNICIPAL ARAD",
  "ACS GYMTEAM ARAD": "A.C.S GYMTEAM ARAD",
  "CS UNIVERSITATEA ARAD": "C.S. UNIVERSITATEA ARAD",
  "A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI": "A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI",
  "ACS LUISA DEDU GYMNASTICS": "A.C.S LUISA DEDU GYMNASTICS BUCUREȘTI",
  "A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI": "A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI",
  "ACS VIVA SPORT BUCUREȘTI": "A.C.S VIVA SPORT BUCUREȘTI",
  "ACS VIVA SPORT BUCURESTI": "A.C.S VIVA SPORT BUCUREȘTI",
  "CS FARUL CONSTANTA": "CLUBUL SPORTIV \"FARUL\" CONSTANŢA",
  "CS FARUL CONSTANȚA": "CLUBUL SPORTIV \"FARUL\" CONSTANŢA",
  "CSM CONSTANTA": "CLUB SPORTIV MUNICIPAL CONSTANȚA",
  "CSM CONSTANȚA": "CLUB SPORTIV MUNICIPAL CONSTANȚA",
  "CSS1 CONSTANȚA": "CLUBUL SPORTIV ŞCOLAR 1 CONSTANŢA",
  "CSS1 CONSTANTA": "CLUBUL SPORTIV ŞCOLAR 1 CONSTANŢA",
  "A.C.S.A. IT'S WHAT I LOVE CONSTANȚA": "CLUBUL SPORTIV IT S WHAT I LOVE CONSTANȚA",
  "CSG GIMNIS IAȘI": "CLUBUL SPORTIV DE GIMNASTICĂ \"GIMNIS\" IAŞI",
  "A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS": "A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS PITESTI",
  "ASTRA GYM SNAGOV": "ASTRA GYM SNAGOV",
  "REPUBLICA MOLDOVA": "REPUBLICA MOLDOVA",
};

function normalizeClub(raw) {
  return raw
    .split("/")
    .map((part) => CLUB_MAP[part.trim()] || part.trim())
    .join(" / ");
}

// members shorthand: [firstName, lastName, sex]
const F = "F";
const M = "M";

const EVENTS = [
  {
    category: "Individual Women - Youth",
    entries: [
      ["CS FARUL CONSTANTA", [["Natalis", "Chiosea", F]]],
      ["ASTRA GYM SNAGOV", [["Sara", "Neagu", F]]],
      ["ASTRA GYM SNAGOV", [["Antonia", "Kukuneshoska", F]]],
      ["A.C.S.A. IT'S WHAT I LOVE CONSTANȚA", [["Sara Andreea", "Avram", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Sara", "Pirlea", F]]],
      ["REPUBLICA MOLDOVA", [["Victoria", "Munteanu", F]]],
      ["CS FARUL CONSTANȚA", [["Ioana Sophia", "Dumitru", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI/ASTRA GYM SNAGOV", [["Anastasia", "Ivascu", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Natalia", "Nica", F]]],
      ["CSM ARAD", [["Rania", "Popescu", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Irina", "Manache", F]]],
      ["REPUBLICA MOLDOVA", [["Sofia", "Moraras", F]]],
      ["ACS GYMTEAM ARAD", [["Patricia", "Ica", F]]],
      ["CSG GIMNIS IAȘI", [["Daria", "Topciu", F]]],
      ["REPUBLICA MOLDOVA", [["Kira", "Ghirjeva", F]]],
      ["REPUBLICA MOLDOVA", [["Xenia", "Ursu", F]]],
      ["CS UNIVERSITATEA ARAD", [["Doris Sefora", "Bala", F]]],
      ["CS FARUL CONSTANTA", [["Natalia", "Remus", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI/ASTRA GYM SNAGOV", [["Iris", "Crețan", F]]],
      ["A.C.S.A. IT'S WHAT I LOVE CONSTANȚA", [["Amalia", "Iancu", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Ema", "Holban", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Clara", "Prichindel", F]]],
      ["ASTRA GYM SNAGOV", [["Kateryna", "Kuznietsova", F]]],
      ["REPUBLICA MOLDOVA", [["Varvara", "Formusatii", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Amalia", "Nicolae", F]]],
      ["CS UNIVERSITATEA ARAD", [["Izabela", "Bodnărescu", F]]],
      ["CSM CONSTANTA", [["Nadia Maria", "Zelesneac", F]]],
      ["REPUBLICA MOLDOVA", [["Cristina", "Varvariuc", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Liliane", "Mihai", F]]],
    ],
  },
  {
    category: "Trio - Kids Development",
    entries: [
      ["CSG GIMNIS IAȘI", [["Sophia", "Befu", F], ["Anastasia", "Ghebănoaie", F], ["Smaranda", "Șoană", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Iris", "Roibu", F], ["Flavia", "Prichindel", F], ["Carina", "Mosoianu", F]]],
    ],
  },
  {
    category: "Mixed Pair - National Development",
    entries: [
      ["CS FARUL CONSTANTA", [["Alexandru", "Craciun", M], ["Ilinca Valentina", "Apostol", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Mathias", "Iftinchi", M], ["Patricia", "Sirbu", F]]],
      ["CS FARUL CONSTANTA", [["Emilia", "Pascu", F], ["Luca", "Roibu", M]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Alexandru", "Stancu", M], ["Ioana", "Stancu", F]]],
      ["CSG GIMNIS IAȘI", [["Maya", "Paparău", F], ["Sașa", "Onofrei", M]]],
      ["ACS VIVA SPORT BUCURESTI", [["Filip", "Dumitrescu", M], ["Ana", "Vasile", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Sion", "Deca", M], ["Iris", "Drumea", F]]],
    ],
  },
  {
    category: "Mixed Pair - Kids Development",
    entries: [
      ["CSG GIMNIS IAȘI", [["Irma", "Onofrei", F], ["Teodor", "Necula", M]]],
    ],
  },
  {
    category: "Individual Men - Youth",
    entries: [
      ["REPUBLICA MOLDOVA", [["Artiom", "Covaliov", M]]],
      ["CSS1 CONSTANȚA", [["Robert Ștefan", "Ristea", M]]],
      ["CSG GIMNIS IAȘI", [["Tudor", "Cătur", M]]],
      ["CSM CONSTANȚA", [["Luca Ionuț", "Greu", M]]],
      ["CS FARUL CONSTANȚA", [["David Pavel", "Porcuș", M]]],
    ],
  },
  {
    category: "Individual Women - Juniors",
    entries: [
      ["REPUBLICA MOLDOVA", [["Taisia", "Dembitcaia", F]]],
      ["ASTRA GYM SNAGOV", [["Amalia", "Vespan", F]]],
      ["CSG GIMNIS IAȘI", [["Rebeca", "Dorneanu", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Andra", "Cuciureanu", F]]],
      ["CS UNIVERSITATEA ARAD", [["Bianca", "Cîmpan", F]]],
      ["CSS1 CONSTANTA", [["Ana Maria", "Filimon", F]]],
      ["CSG GIMNIS IAȘI", [["Andra", "Cobzaru", F]]],
      ["CSM ARAD", [["Riana", "Suteu", F]]],
      ["REPUBLICA MOLDOVA", [["Evelina", "Ivasiuc", F]]],
      ["CSG GIMNIS IAȘI", [["Daria", "Budeanu-Zup", F]]],
      ["REPUBLICA MOLDOVA", [["Nicoleta", "Pirtu", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Antonia", "Simionescu", F]]],
      ["REPUBLICA MOLDOVA", [["Olga", "Tcacisin", F]]],
    ],
  },
  {
    category: "Trio - National Development",
    entries: [
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Stefania", "Tudorache", F], ["Anais", "Roman", F], ["Antonia", "Jerlaianu", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Ema", "Diaconu", F], ["Ema", "Mina", F], ["Ileana", "Apostolescu", F]]],
      ["REPUBLICA MOLDOVA", [["Eva", "Gorosov", F], ["Taisia", "Vicol", F], ["Eva", "Furtuna", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Sara", "Stan", F], ["Katalina", "Corbu", F], ["Ana", "Vasile", F]]],
      ["CSM ARAD", [["Natalia", "Draia", F], ["Giulia", "Mulicz", F], ["Ana", "Sabau", F]]],
      ["ASTRA GYM SNAGOV", [["Natalia", "Băjenaru", F], ["Eva", "Bălan", F], ["Ilinca", "Uțoi", F]]],
      ["REPUBLICA MOLDOVA", [["Maria", "Zubic", F], ["Miroslava", "Palamarciuc", F], ["Maria", "Mancas", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Irina", "Lazar", F], ["Antonia", "Enciu", F], ["Sofia", "Mavrodin", F]]],
      ["CS FARUL CONSTANȚA", [["Mirian", "Gavrila", F], ["Erin Anastasia", "Popa", F], ["Ilinca Valentina", "Apostol", F]]],
      ["ASTRA GYM SNAGOV", [["Medeea", "Axente", F], ["Adelina", "Șchiopu", F], ["Adelle", "Sorică", F]]],
      ["ACS LUISA DEDU GYMNASTICS", [["Alexia Maria", "Cotoman", F], ["Maria Melisa", "Dedu", F], ["Camelia Gabriela", "Ferencz", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Adelina", "Jantea", F], ["Anastasia", "Jantea", F], ["Amalia", "Bucataru", F]]],
      ["REPUBLICA MOLDOVA", [["Daria", "Sclifo", F], ["Evelina", "Pirtu", F], ["Anastasia", "Gubareva", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Maya", "Nica", F], ["Ana", "Pirlea", F], ["Medeea", "Castellano", F]]],
      ["ACS LUISA DEDU GYMNASTICS", [["Olivia Ioana", "Constantin", F], ["Mihaela Georgiana", "Floroiu", F], ["Ioana", "Niculae", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI/ASTRA GYM SNAGOV", [["Andreea", "Mina", F], ["Emilia", "Olteanu", F], ["Alexandra", "Duiculescu", F]]],
      ["CSM ARAD", [["Eva", "Draghicescu", F], ["Antonia", "Kapca", F], ["Alexandra", "Kapca", F]]],
      ["ACS GYMTEAM ARAD", [["Alice", "Luca", F], ["Antonia", "Albu", F], ["Nadia", "Bondar", F]]],
      ["CSG GIMNIS IAȘI", [["Smaranda", "Balaur", F], ["Marina", "Leahu", F], ["Anastasia", "Bugan", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI/ASTRA GYM SNAGOV", [["Ana", "Stan", F], ["Maria", "Pavel", F], ["Iris", "Crețan", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Mathias", "Iftinchi", M], ["Patricia", "Sirbu", F], ["Antonia", "Nae", F]]],
      ["ACS GYMTEAM ARAD", [["Emma", "Chismore", F], ["Iasmina", "Cicirean", F], ["Andreea", "Lazarescu", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Izabela", "Badila", F], ["Adelina", "Chistol", F], ["Eva", "Gomeaja", F]]],
      ["ASTRA GYM SNAGOV", [["Antonia", "Jugănaru", F], ["Ilinca", "Suvac", F], ["Amalia", "Iosif", F]]],
    ],
  },
  {
    category: "Mixed Pair - Juniors",
    entries: [
      ["CSS1 CONSTANTA", [["Alexandru-Stefan", "Talaba", M], ["Ana Maria", "Filimon", F]]],
    ],
  },
  {
    category: "Individual Women - National Development",
    entries: [
      ["REPUBLICA MOLDOVA", [["Anastasia", "Procova", F]]],
      ["REPUBLICA MOLDOVA", [["Anastasia", "Bejenari", F]]],
      ["REPUBLICA MOLDOVA", [["Maria", "Riner", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Maya", "Nica", F]]],
      ["ASTRA GYM SNAGOV", [["Sofia", "Zamfiroiu", F]]],
      ["CSG GIMNIS IAȘI", [["Bianca", "Căbălău", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Ilinca", "Teodorescu", F]]],
      ["ACS LUISA DEDU GYMNASTICS", [["Maria Melisa", "Dedu", F]]],
      ["REPUBLICA MOLDOVA", [["Maria", "Mancas", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Ana", "Stan", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Adelina", "Chistol", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Ioana", "Stancu", F]]],
      ["CSM ARAD", [["Eva", "Draghicescu", F]]],
      ["REPUBLICA MOLDOVA", [["Maria", "Zubic", F]]],
      ["CSM ARAD", [["Antonia", "Kapca", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Ana", "Pirlea", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Izabela", "Badila", F]]],
      ["REPUBLICA MOLDOVA", [["Eva", "Furtuna", F]]],
      ["ACS VIVA SPORT BUCURESTI", [["Sara", "Stan", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Anais", "Roman", F]]],
      ["CS FARUL CONSTANȚA", [["Eva", "Leuca", F]]],
      ["CSG GIMNIS IAȘI", [["Medeea", "Bărbieru", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Antonia", "Nae", F]]],
      ["ACS LUISA DEDU GYMNASTICS", [["Alexia Maria", "Cotoman", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Medeea", "Castellano", F]]],
      ["CSG GIMNIS IAȘI", [["Rebecca", "Buzabrici-Filipescu", F]]],
      ["ACS GYMTEAM ARAD", [["Antonia", "Albu", F]]],
      ["CSM ARAD", [["Ana", "Sabau", F]]],
      ["CSG GIMNIS IAȘI", [["Marina", "Leahu", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Mara", "Cace", F]]],
      ["ACS GYMTEAM ARAD", [["Emma", "Chismore", F]]],
      ["REPUBLICA MOLDOVA", [["Eva", "Gorosov", F]]],
      ["CS UNIVERSITATEA ARAD", [["Aby", "Păiș-Silaghi", F]]],
      ["CSG GIMNIS IAȘI", [["Smaranda", "Balaur", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Stefania", "Tudorache", F]]],
      ["ASTRA GYM SNAGOV", [["Medeea", "Axente", F]]],
      ["CSG GIMNIS IAȘI", [["Nicole", "Fânaru", F]]],
      ["ACS VIVA SPORT BUCURESTI", [["Eva", "Gomeaja", F]]],
      ["CSM ARAD", [["Alexandra", "Kapca", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Liana", "Craciunel", F]]],
      ["REPUBLICA MOLDOVA", [["Miroslava", "Verhovetchi", F]]],
      ["ACS GYMTEAM ARAD", [["Nadia", "Bondar", F]]],
      ["CSS1 CONSTANTA", [["Aylin", "Memet Ali", F]]],
      ["ASTRA GYM SNAGOV", [["Adelina", "Șchiopu", F]]],
      ["CS FARUL CONSTANȚA", [["Ana", "Petrov", F]]],
      ["REPUBLICA MOLDOVA", [["Victoria", "Lipovan", F]]],
      ["CSG GIMNIS IAȘI", [["Carina", "Fosa", F]]],
      ["REPUBLICA MOLDOVA", [["Anastasia", "Gubareva", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Patricia", "Sirbu", F]]],
      ["CS UNIVERSITATEA ARAD", [["Alice", "Calotă", F]]],
      ["CSG GIMNIS IAȘI", [["Maya", "Paparău", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Antonia", "Jerlaianu", F]]],
      ["ACS LUISA DEDU GYMNASTICS", [["Olivia Ioana", "Constantin", F]]],
      ["REPUBLICA MOLDOVA", [["Miroslava", "Palamarciuc", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Ingrid", "Moraru", F]]],
    ],
  },
  {
    category: "Individual Men - Kids Development",
    entries: [
      ["ACS LUISA DEDU GYMNASTICS", [["Octavian Iustin", "Ribu", M]]],
      ["CSG GIMNIS IAȘI", [["Sașa", "Onofrei", M]]],
      ["CSS1 CONSTANȚA", [["Nicolas", "Gheorghiu", M]]],
    ],
  },
  {
    category: "Mixed Pair - Youth",
    entries: [
      ["CSM CONSTANȚA", [["Nadia", "Zelesneac", F], ["Robert Ștefan", "Ristea", M]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Sara", "Pirlea", F], ["Eric", "Burciu", M]]],
      ["CSG GIMNIS IAȘI", [["Tudor", "Cătur", M], ["Daria", "Topciu", F]]],
      ["CS FARUL CONSTANȚA", [["David Pavel", "Porcuș", M], ["Ioana Sophia", "Dumitru", F]]],
    ],
  },
  {
    category: "Individual Women - Kids Development",
    entries: [
      ["CS FARUL CONSTANTA", [["Ariana", "Kacso", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Iris", "Roibu", F]]],
      ["CSG GIMNIS IAȘI", [["Sophia", "Befu", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Iris", "Drumea", F]]],
      ["CSG GIMNIS IAȘI", [["Irma", "Onofrei", F]]],
      ["ASTRA GYM SNAGOV", [["Natalia", "Băjenaru", F]]],
      ["REPUBLICA MOLDOVA", [["Eva", "Suvari", F]]],
      ["CSG GIMNIS IAȘI", [["Anastasia", "Ghebănoaie", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Ana", "Popescu", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Antonia", "Enciu", F]]],
      ["CSM ARAD", [["Sara", "Vinaga", F]]],
      ["CSG GIMNIS IAȘI", [["Iris", "Borș", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Irina", "Ivan", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Iris", "Minculete", F]]],
      ["CSG GIMNIS IAȘI", [["Smaranda", "Șoană", F]]],
    ],
  },
  {
    category: "Group - Youth",
    entries: [
      ["ASTRA GYM SNAGOV", [["Antonia", "Kukuneshoska", F], ["Kateryna", "Kuznietsova", F], ["Maria", "Plugariu", F], ["Sara", "Neagu", F], ["Miruna", "Georgescu", F]]],
      ["CSM ARAD", [["Evelin", "Gheorghe", F], ["Izabela", "Nemeti", F], ["Abigail", "Pusa", F], ["Giulia", "Kapca", F], ["Rania", "Popescu", F]]],
      ["ACS VIVA SPORT BUCURESTI", [["Ema", "Holban", F], ["Liliane", "Mihai", F], ["Daria", "Ailenei", F], ["Ema", "Diaconu", F], ["Maria", "Constantin", F]]],
      ["CSM CONSTANTA", [["Alexandra", "Anitei", F], ["Natalis", "Chiosea", F], ["Nadia", "Zelesneac", F], ["Luca", "Greu", M], ["Alexandra", "Talaba", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Amalia", "Nicolae", F], ["Mara", "Cace", F], ["Irina", "Manache", F], ["Ioana", "Stancu", F], ["Natalia", "Papa", F]]],
      ["CS FARUL CONSTANTA", [["Daria", "Stanciulescu", F], ["Raisa", "Morogan", F], ["Sofia", "Condur", F], ["Natalia", "Remus", F], ["Eva", "Leuca", F]]],
      ["CSG GIMNIS IAȘI", [["Karina", "Balaur", F], ["Maria", "Roșu", F], ["Adina", "Fecioru", F], ["Tudor", "Cătur", M], ["Maria", "Ghenghea", F]]],
      ["REPUBLICA MOLDOVA", [["Artiom", "Covaliov", M], ["Cristina", "Varvariuc", F], ["Victoria", "Munteanu", F], ["Ecaterina", "Tuluc", F], ["Kira", "Ghirjeva", F]]],
      ["CSM ARAD/ACS GYMTEAM ARAD", [["Selena", "Kapca", F], ["Alexandra", "Zimerman", F], ["Riana", "Suteu", F], ["Iulia", "Popa", F], ["Patricia", "Ica", F]]],
    ],
  },
  {
    category: "Individual Men - National Development",
    entries: [
      ["CS FARUL CONSTANȚA", [["Luca", "Roibu", M]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Mathias", "Iftinchi", M]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Sion", "Deca", M]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Alexandru", "Tudorache", M]]],
      ["CS FARUL CONSTANTA", [["Alexandru", "Craciun", M]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Alexandru", "Stancu", M]]],
      ["ACS VIVA SPORT BUCURESTI", [["Filip", "Dumitrescu", M]]],
    ],
  },
  {
    category: "Trio - Youth",
    entries: [
      ["CSM ARAD", [["Selena", "Kapca", F], ["Giulia", "Kapca", F], ["Alexandra", "Zimerman", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Ema", "Holban", F], ["Liliane", "Mihai", F], ["Daria", "Ailenei", F]]],
      ["CSM ARAD", [["Evelin", "Gheorghe", F], ["Izabela", "Nemeti", F], ["Abigail", "Pusa", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Sara", "Pirlea", F], ["Eric", "Burciu", M], ["Clara", "Prichindel", F]]],
      ["CSM ARAD/ACS GYMTEAM ARAD", [["Riana", "Suteu", F], ["Rania", "Popescu", F], ["Amalia", "Mogaldea", F]]],
      ["REPUBLICA MOLDOVA", [["Xenia", "Ursu", F], ["Varvara", "Formusatii", F], ["Sofia", "Moraras", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Mara", "Cace", F], ["Natalia", "Nica", F], ["Irina", "Manache", F]]],
      ["CSM CONSTANTA", [["Robert", "Ristea", M], ["Luca", "Greu", M], ["Alexandru", "Talaba", M]]],
      ["REPUBLICA MOLDOVA", [["Cristina", "Varvariuc", F], ["Victoria", "Munteanu", F], ["Ecaterina", "Tuluc", F]]],
      ["ASTRA GYM SNAGOV", [["Miruna", "Gorgescu", F], ["Maria", "Plugariu", F], ["Antonia", "Kukuneshoska", F]]],
      ["CS FARUL CONSTANȚA", [["Daria", "Stanciulescu", F], ["Raisa", "Morogan", F], ["Sofia", "Condur", F]]],
    ],
  },
  {
    category: "Trio - Juniors",
    entries: [
      ["REPUBLICA MOLDOVA", [["Olga", "Tcacisin", F], ["Nicoleta", "Pîrțu", F], ["Evelina", "Ivasiuc", F]]],
    ],
  },
  {
    category: "Group - Kids Development",
    entries: [
      ["CSG GIMNIS IAȘI", [["Sophia", "Befu", F], ["Anastasia", "Ghebănoaie", F], ["Smaranda", "Șoană", F], ["Irma", "Onofrei", F], ["Iris", "Borș", F]]],
    ],
  },
  {
    category: "Group - National Development",
    entries: [
      ["REPUBLICA MOLDOVA", [["Maria", "Riner", F], ["Eva", "Suvari", F], ["Miroslava", "Verhovetchi", F], ["Anastasia", "Procova", F], ["Anastasia", "Bejenari", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI", [["Miruna", "Tigoianu", F], ["Irina", "Lazar", F], ["Eva", "Tabarca", F], ["Sofia", "Mavrodin", F], ["Andreea", "Mina", F]]],
      ["ACS VIVA SPORT BUCUREȘTI", [["Sara", "Stan", F], ["Ana", "Vasile", F], ["Ema", "Diaconu", F], ["Ileana", "Apostolescu", F], ["Katalina", "Corbu", F]]],
      ["ASTRA GYM SNAGOV", [["Antonia", "Jugănaru", F], ["Eva", "Bălan", F], ["Ilinca", "Uțoi", F], ["Bianca", "Miroslav", F], ["Ilinca", "Suvac", F]]],
      ["CS FARUL CONSTANȚA", [["Erin Anastasia", "Popa", F], ["Ilinca Valentina", "Apostol", F], ["Luca", "Roibu", M], ["Emilia", "Pascu", F], ["Alexandru", "Craciun", M]]],
      ["REPUBLICA MOLDOVA", [["Maria", "Zubic", F], ["Miroslava", "Palamarciuc", F], ["Victoria", "Lipovan", F], ["Maria", "Mancas", F], ["Taisia", "Vicol", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Stefania", "Iliuta", F], ["Ingrid", "Moraru", F], ["Irina", "Ivan", F], ["Catalina", "Petcu", F], ["Ilinca", "Tedorescu", F]]],
      ["ACS GYMTEAM ARAD", [["Alice", "Luca", F], ["Antonia", "Albu", F], ["Emma", "Chismore", F], ["Iasmina", "Cicirean", F], ["Andreea", "Lazarescu", F]]],
      ["A.C.S ACADEMIA DE GIMNASTICĂ LAURA CRISTACHE BUCUREȘTI/ASTRA GYM SNAGOV", [["Maria", "Pavel", F], ["Ana", "Stan", F], ["Antonia", "Nae", F], ["Iris", "Crețan", F], ["Anastasia", "Ivascu", F]]],
      ["REPUBLICA MOLDOVA", [["Eva", "Gorosov", F], ["Daria", "Sclifos", F], ["Eva", "Furtuna", F], ["Evelina", "Pirtu", F], ["Anastasia", "Gubareva", F]]],
      ["CSM ARAD", [["Eva", "Draghicescu", F], ["Antonia", "Kapca", F], ["Alexandra", "Kapca", F], ["Natalia", "Draia", F], ["Ana", "Sabau", F]]],
      ["ASTRA GYM SNAGOV", [["Eliza", "Popescu", F], ["Iris", "Toma", F], ["Natalia", "Băjenaru", F], ["Sofia", "Dorobanțu", F], ["Eva", "Muller", F]]],
      ["ACS LUISA DEDU GYMNASTICS", [["Maria Melisa", "Dedu", F], ["Alexia Maria", "Cotoman", F], ["Olivia Ioana", "Constantin", F], ["Camelia Gabriela", "Ferencz", F], ["Mihaela Georgiana", "Floroiu", F]]],
      ["CSG GIMNIS IAȘI", [["Bianca", "Căbălău", F], ["Carina", "Fosa", F], ["Rebecca", "Buzabrici-Filipescu", F], ["Maya", "Paparău", F], ["Nicole", "Fânaru", F]]],
      ["A.C.S DACIANA ENACHE SCHOOL OF GYMNASTICS", [["Alexandru", "Tudorache", M], ["Maya", "Nica", F], ["Ana", "Pirlea", F], ["Medeea", "Castellano", F], ["Liana", "Craciunel", F]]],
      ["ASTRA GYM SNAGOV", [["Medeea", "Axente", F], ["Sofia", "Zamfiroiu", F], ["Adelle", "Sorică", F], ["Adelina", "Șchiopu", F], ["Maria", "Caimacan", F]]],
      ["ACS VIVA SPORT BUCURESTI", [["Izabela", "Badila", F], ["Eva", "Gomeaja", F], ["Adelina", "Chistol", F], ["Anastasia", "Jantea", F], ["Amalia", "Bucataru", F]]],
      ["CSG GIMNIS IAȘI", [["Smaranda", "Balaur", F], ["Medeea", "Bărbieru", F], ["Marina", "Leahu", F], ["Anastasia", "Bugan", F], ["Sara", "Pușcașu", F]]],
    ],
  },
  {
    category: "Aerobic Dance - Youth",
    entries: [
      ["ASTRA GYM SNAGOV", [["Kateryna", "Kuznietsova", F], ["Maria", "Plugariu", F], ["Sofia", "Zamfiroiu", F], ["Miruna", "Georgescu", F], ["Sofia", "Jurca", F], ["Sara", "Neagu", F], ["Clara", "Pădure", F], ["Eva", "Seropian", F]]],
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Amalia", "Nicolae", F], ["Natalia", "Nica", F], ["Larisa", "Omeag", F], ["Denisa", "Balan", F], ["Daria", "Alexandru", F], ["Natalia", "Papa", F], ["Ioana", "Popper", F], ["Antonia", "Dragan", F]]],
    ],
  },
  {
    category: "Aerobic Dance - Juniors",
    entries: [
      ["A.C.S AEROSTAR MĂDĂLINA BARBU BUCUREȘTI", [["Alexandra", "Stoica", F], ["Andra", "Cuciureanu", F], ["Antonia", "Simionescu", F], ["Bianca", "Ilie", F], ["Andra", "Nutu", F], ["Bianca", "Nutu", F], ["Karina", "Ciomag", F], ["Antonia", "Musat", F]]],
      ["CSG GIMNIS IAȘI", [["Maria", "Bantă", F], ["Adriana", "Rusu", F], ["Medeea", "Burlacu", F], ["Luiza", "Sbera", F], ["Daria", "Budeanu-Zup", F], ["Andra", "Cobzaru", F], ["Rebeca", "Dorneanu", F], ["Maria", "Pal", F]]],
    ],
  },
];

async function main() {
  const client = await pool.connect();
  try {
    if (RESET) {
      console.log("Resetting tables...");
      await client.query(
        `TRUNCATE judges, competitors, competitor_members, current_vote,
                  scores, validated_competitors, show_competitor
         RESTART IDENTITY CASCADE;`
      );
    }

    await client.query("BEGIN");

    // Judges panel: placeholder "seats" so real judges can log in
    // (PUT /judges/:id/login) and claim id -> name. Order matters: ids are
    // assigned sequentially, so this fixes 1=principal, 2-5=execution,
    // 6-9=artistry, 10-11=difficulty.
    const JUDGES = [
      ["Arbitru", "Principal", "principal"],
      ["Arbitru Execuție", "1", "execution"],
      ["Arbitru Execuție", "2", "execution"],
      ["Arbitru Execuție", "3", "execution"],
      ["Arbitru Execuție", "4", "execution"],
      ["Arbitru Artistic", "1", "artistry"],
      ["Arbitru Artistic", "2", "artistry"],
      ["Arbitru Artistic", "3", "artistry"],
      ["Arbitru Artistic", "4", "artistry"],
      ["Arbitru Dificultate", "1", "difficulty"],
      ["Arbitru Dificultate", "2", "difficulty"],
    ];
    for (const [first_name, last_name, role] of JUDGES) {
      await client.query(
        `INSERT INTO judges (first_name, last_name, role) VALUES ($1, $2, $3)`,
        [first_name, last_name, role]
      );
    }
    console.log(`Seeded ${JUDGES.length} judge seats (1=principal, 2-5=execution, 6-9=artistry, 10-11=difficulty).`);

    let competitorCount = 0;
    let memberCount = 0;
    let emailCounter = 1;

    for (const event of EVENTS) {
      const [ageMin, ageMax] = ageRangeFor(event.category);

      for (const [rawClub, members] of event.entries) {
        const club = normalizeClub(rawClub);

        const compRes = await client.query(
          `INSERT INTO competitors (category, club) VALUES ($1, $2) RETURNING id`,
          [event.category, club]
        );
        const competitorId = compRes.rows[0].id;
        competitorCount++;

        for (const [first_name, last_name, sex] of members) {
          const age = randInt(ageMin, ageMax);
          const email = `${slug(first_name)}.${slug(last_name)}${emailCounter++}@example.com`;
          await client.query(
            `INSERT INTO competitor_members
             (competitor_id, first_name, last_name, email, age, sex)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [competitorId, first_name, last_name, email, age, sex]
          );
          memberCount++;
        }
      }
    }

    await client.query("COMMIT");
    console.log(`Seeded ${competitorCount} competitors (${memberCount} athletes) across ${EVENTS.length} categories.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed, rolled back:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
