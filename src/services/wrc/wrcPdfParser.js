require("../../../src/config/env");
const fs = require("fs");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

/* ---------------------------------- */
/* EXTRACT TEXT FROM PDF              */
/* ---------------------------------- */

async function extractTextFromPdf(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));

  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const strings = content.items.map((item) => item.str);

    fullText += strings.join(" ") + "\n";
  }

  return fullText;
}

/* ---------------------------------- */
/* EXTRACT DAY HEADERS                */
/* ---------------------------------- */

function extractDayHeaders(text) {
  const dayRegex =
    /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/g;

  const headers = [];

  let match;

  while ((match = dayRegex.exec(text)) !== null) {
    const dateStr = `${match[2]} ${match[3]} ${match[4]}`;
    const date = new Date(dateStr);

    headers.push({
      index: match.index,
      date: date.toISOString().split("T")[0],
    });
  }

  return headers;
}

/* ---------------------------------- */
/* EXTRACT STAGES WITH POSITION       */
/* ---------------------------------- */

function extractStagesWithIndex(text) {
  const stages = [];

  const cleanedText = text.replace(/\s+/g, " ");

  // // OLD REGEX (buggy – may capture wrong time)
  // const ssRegex = /SS\s*(\d+)\s+(.+?)\s+(\d+,\d{1,2})\s+.*?(\d{1,2}:\d{2})/g;

  // NEW REGEX (stable – anchors time correctly)
  const ssRegex =
    /SS\s*(\d+)\s+(.+?)\s+(\d+,\d{1,2})\s+(\d{1,2}:\d{2})(?=\s|$)/g;

  let match;

  while ((match = ssRegex.exec(cleanedText)) !== null) {
    stages.push({
      index: match.index,
      stage_code: `SS${parseInt(match[1])}`,
      stage_number: parseInt(match[1]),
      name: match[2]
        .replace(/\(.*?\)/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      distance_km: parseFloat(match[3].replace(",", ".")),
      time_local: match[4].padStart(5, "0"),
    });
  }

  // SD (optional)
  const sdRegex = /SD\s+(.+?)/g;

  while ((match = sdRegex.exec(cleanedText)) !== null) {
    const segment = match[0];

    const distanceMatch = segment.match(/(\d+,\d{1,2})/);
    const timeMatch = segment.match(/(\d{1,2}:\d{2})(?!.*\d{1,2}:\d{2})/);

    if (!distanceMatch || !timeMatch) continue;

    stages.push({
      index: match.index,
      stage_code: "SD",
      stage_number: 0,
      name: match[1]
        .replace(/\(.*?\)/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      distance_km: parseFloat(distanceMatch[1].replace(",", ".")),
      time_local: timeMatch[1].padStart(5, "0"),
    });
  }

  return stages.sort((a, b) => a.index - b.index);
}

/* ---------------------------------- */
/* MAP STAGES → DATES                 */
/* ---------------------------------- */

function assignDatesToStages(stages, headers) {
  return stages.map((stage) => {
    let assignedDate = null;

    for (let i = headers.length - 1; i >= 0; i--) {
      if (stage.index >= headers[i].index) {
        assignedDate = headers[i].date;
        break;
      }
    }

    return {
      ...stage,
      stage_date: assignedDate,
    };
  });
}

/* ---------------------------------- */
/* MAIN PARSER                        */
/* ---------------------------------- */

async function parseWrcPdf(filePath) {
  const text = await extractTextFromPdf(filePath);

  const cleanedText = text.replace(/\s+/g, " ");

  const headers = extractDayHeaders(cleanedText);

  const stagesWithIndex = extractStagesWithIndex(cleanedText);

  const finalStages = assignDatesToStages(stagesWithIndex, headers);

  return finalStages;
}

module.exports = {
  parseWrcPdf,
};
